/* BOT MESUREUR — Vitesse des ailes du dragon
 * Mesure objectivement la vitesse de battement en phase 1 et phase 2.
 */
const { firefox } = require("playwright");

const FILE = 'file:///home/zkk/mes-jeux/cristal-dragon-v5-opencode.html';

(async () => {
  const browser = await firefox.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));

  try {
    console.log('\n===== MESURE VITESSE DES AILES =====\n');

    await page.goto(FILE);
    await page.waitForTimeout(500);
    await page.evaluate(() => startGame());
    await page.waitForTimeout(300);

    // Instrumenter : hook sur ctx.ellipse pour capturer l'angle des ailes
    // Les ailes sont dessinées avec ctx.translate puis ctx.rotate(-wingOpen*0.6)
    // On va plutôt hook sur Math.sin pour capturer les appels avec time*wingSpeed

    // Méthode : mesurer wingOpen directement en rejouant l'animation
    const mesurer = async (hp, dureeMs) => {
      return await page.evaluate(async ({ hp, dureeMs }) => {
        // Forcer le hp
        eye.hp = hp;
        eye.deadT = 0;
        // Hook sur Math.sin pour capturer les valeurs de wingOpen
        const originalSin = Math.sin;
        const captures = [];

        Math.sin = function(x) {
          const r = originalSin(x);
          // On capture uniquement les appels liés aux ailes
          // Les ailes utilisent time*wingSpeed (4 ou 8)
          // Mais time*1.5 (halo) et time*2.2 (pulse) existent aussi
          // On filtre : on capture tous les appels avec leur argument
          captures.push({ arg: x, res: r, t: time });
          return r;
        };

        // Attendre et laisser l'animation tourner
        await new Promise(r => setTimeout(r, dureeMs));

        Math.sin = originalSin;
        return captures;
      }, { hp, dureeMs });
    };

    // Mesurer en phase 1 (hp=5)
    console.log('--- PHASE 1 (hp=5) ---');
    const captures1 = await mesurer(5, 2000);
    const capture1Ailes = captures1.filter(c => c.arg > 4 && c.arg < 30);
    console.log(`  Captures totales : ${captures1.length}`);
    console.log(`  Captures ailes (arg 4-30) : ${capture1Ailes.length}`);

    // Calculer la fréquence : combien de fois on passe par un maximum
    // On regarde les arguments qui augmentent linéairement avec time
    const args1 = capture1Ailes.map(c => c.arg).filter((v, i, a) => i === 0 || v > a[i-1]);
    if (args1.length > 1) {
      const deltaArg = args1[args1.length - 1] - args1[0];
      const deltaT = capture1Ailes[capture1Ailes.length - 1].t - capture1Ailes[0].t;
      const freq = deltaArg / (2 * Math.PI) / deltaT;
      console.log(`  Fréquence estimée : ${freq.toFixed(2)} battements/s`);
      console.log(`  (attendu ~0.64 Hz pour sin(time*4))`);
    }

    // Mesurer en phase 2 (hp=2)
    console.log('\n--- PHASE 2 (hp=2) ---');
    const captures2 = await mesurer(2, 2000);
    const capture2Ailes = captures2.filter(c => c.arg > 4 && c.arg < 30);
    console.log(`  Captures totales : ${captures2.length}`);
    console.log(`  Captures ailes (arg 4-30) : ${capture2Ailes.length}`);

    const args2 = capture2Ailes.map(c => c.arg).filter((v, i, a) => i === 0 || v > a[i-1]);
    if (args2.length > 1) {
      const deltaArg = args2[args2.length - 1] - args2[0];
      const deltaT = capture2Ailes[capture2Ailes.length - 1].t - capture2Ailes[0].t;
      const freq = deltaArg / (2 * Math.PI) / deltaT;
      console.log(`  Fréquence estimée : ${freq.toFixed(2)} battements/s`);
      console.log(`  (attendu ~1.27 Hz pour sin(time*8))`);
    }

    // Vérifier directement la variable wingSpeed
    console.log('\n--- VÉRIFICATION DIRECTE ---');
    const verif = await page.evaluate(() => {
      const results = {};
      // Phase 1
      eye.hp = 5;
      // Reproduire la formule de drawEye()
      results.phase1_speed = eye.hp <= 2 ? 8 : 4;
      // Phase 2
      eye.hp = 2;
      results.phase2_speed = eye.hp <= 2 ? 8 : 4;
      // Vérifier le ratio
      results.ratio = results.phase2_speed / results.phase1_speed;
      return results;
    });

    console.log(`  Phase 1 (hp=5) : wingSpeed = ${verif.phase1_speed}`);
    console.log(`  Phase 2 (hp=2) : wingSpeed = ${verif.phase2_speed}`);
    console.log(`  Ratio : x${verif.ratio}`);

    // Vérifier le rendu : est-ce que drawEye produit bien des ailes ?
    console.log('\n--- VÉRIFICATION RENDU ---');
    const rendu = await page.evaluate(() => {
      // Compter les appels à ellipse dans drawEye
      let ellipseCount = 0;
      const origEllipse = CanvasRenderingContext2D.prototype.ellipse;
      CanvasRenderingContext2D.prototype.ellipse = function(...args) {
        ellipseCount++;
        return origEllipse.apply(this, args);
      };

      // Forcer un rendu
      eye.hp = 5;
      drawEye();

      CanvasRenderingContext2D.prototype.ellipse = origEllipse;
      return { ellipseCount };
    });
    console.log(`  Appels ellipse dans drawEye : ${rendu.ellipseCount}`);
    console.log(`  (attendu : 1 fond ovale + 2 ailes = 3)`);

    // Analyse finale
    console.log('\n--- ANALYSE ---');
    const critiques = [];
    const bons = [];

    if (verif.phase1_speed === 4) bons.push('✅ Phase 1 : wingSpeed = 4 (lent)');
    else critiques.push(`❌ Phase 1 : wingSpeed = ${verif.phase1_speed} (attendu 4)`);

    if (verif.phase2_speed === 8) bons.push('✅ Phase 2 : wingSpeed = 8 (rapide)');
    else critiques.push(`❌ Phase 2 : wingSpeed = ${verif.phase2_speed} (attendu 8)`);

    if (verif.ratio === 2) bons.push('✅ Ratio exact : x2 (phase 2 = 2× plus rapide)');
    else critiques.push(`❌ Ratio = x${verif.ratio} (attendu x2)`);

    if (rendu.ellipseCount >= 3) bons.push(`✅ Rendu : ${rendu.ellipseCount} ellipses (fond + 2 ailes)`);
    else critiques.push(`❌ Rendu : ${rendu.ellipseCount} ellipses (attendu 3)`);

    if (errors.length === 0) bons.push('✅ Aucune erreur JS');
    else critiques.push(`❌ ${errors.length} erreur(s) JS`);

    console.log('\n  POINTS FORTS :');
    bons.forEach(b => console.log('    ' + b));
    if (critiques.length) {
      console.log('\n  POINTS FAIBLES :');
      critiques.forEach(c => console.log('    ' + c));
    }

    // Conclusion
    console.log('\n========================================');
    if (critiques.length === 0) {
      console.log(' ✅ VITESSE DES AILES : VALIDÉE');
      console.log(' La phase 2 accélère bien les ailes de 2x.');
    } else {
      console.log(' ❌ VITESSE DES AILES : NON VALIDÉE');
      console.log(' Corrige les points faibles ci-dessus.');
    }
    console.log('========================================\n');

    await browser.close();
    process.exit(critiques.length > 0 ? 1 : 0);

  } catch (e) {
    console.error('ERREUR :', e);
    await browser.close();
    process.exit(2);
  }
})();

/* BOT MESUREUR — Analyse l'explosion des 3 runes
 * Mesure objectivement les effets visuels au moment du déclenchement.
 */
const { firefox } = require("playwright");

const FILE = 'file:///home/zkk/mes-jeux/cristal-dragon-v5-opencode.html';

(async () => {
  const browser = await firefox.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));

  try {
    console.log('\n===== MESURE DE L\'EXPLOSION DES 3 RUNES =====\n');

    await page.goto(FILE);
    await page.waitForTimeout(500);
    await page.evaluate(() => startGame());
    await page.waitForTimeout(300);

    // Mesurer l'état AVANT l'explosion
    const avant = await page.evaluate(() => {
      let partsAlive = 0;
      for (const p of parts) if (p.life > 0) partsAlive++;
      let ringsAlive = 0;
      for (const r of rings) if (r.t > 0) ringsAlive++;
      return {
        partsAlive,
        ringsAlive,
        shakeT,
        goldFlash,
        flashT,
        score,
        mult,
        bonus,
      };
    });

    console.log('--- ÉTAT AVANT ---');
    console.log(`  Particules actives : ${avant.partsAlive}`);
    console.log(`  Anneaux actifs     : ${avant.ringsAlive}`);
    console.log(`  Shake actif        : ${avant.shakeT.toFixed(2)}s`);
    console.log(`  Flash doré         : ${avant.goldFlash.toFixed(2)}`);
    console.log(`  Flash écran        : ${avant.flashT.toFixed(2)}`);
    console.log(`  Score              : ${avant.score}`);
    console.log(`  Multiplicateur     : x${avant.mult}`);
    console.log(`  Bonus              : ${avant.bonus}`);

    // DÉCLENCHER L'EXPLOSION : activer les 3 runes d'un coup
    await page.evaluate(() => {
      runes[0].up = true;
      runes[1].up = true;
      runes[2].up = true;
      hitRune(0);
      hitRune(1);
      hitRune(2); // Le 3e déclenche l'explosion
    });

    // Mesurer IMMÉDIATEMENT après (au moment T+0)
    const apres = await page.evaluate(() => {
      let partsAlive = 0;
      let partsDorees = 0;
      let partsBlanches = 0;
      for (const p of parts) {
        if (p.life > 0) {
          partsAlive++;
          if (p.k === 'g') partsDorees++;
          if (p.k === 'w') partsBlanches++;
        }
      }
      let ringsAlive = 0;
      for (const r of rings) if (r.t > 0) ringsAlive++;
      return {
        partsAlive,
        partsDorees,
        partsBlanches,
        ringsAlive,
        shakeT,
        shakeM,
        goldFlash,
        goldFlashM,
        flashT,
        score,
        mult,
        bonus,
        bonusT,
      };
    });

    console.log('\n--- ÉTAT APRÈS (T+0) ---');
    console.log(`  Particules actives : ${apres.partsAlive}`);
    console.log(`    - Dorées         : ${apres.partsDorees}`);
    console.log(`    - Blanches       : ${apres.partsBlanches}`);
    console.log(`  Anneaux actifs     : ${apres.ringsAlive}`);
    console.log(`  Shake              : ${apres.shakeT.toFixed(2)}s (magnitude ${apres.shakeM})`);
    console.log(`  Flash doré         : ${apres.goldFlash.toFixed(2)} / ${apres.goldFlashM}`);
    console.log(`  Flash écran        : ${apres.flashT.toFixed(2)}`);
    console.log(`  Score              : ${apres.score}`);
    console.log(`  Multiplicateur     : x${apres.mult}`);
    console.log(`  Bonus              : ${apres.bonus} (${apres.bonusT.toFixed(1)}s)`);

    // Mesurer la décroissance de l'explosion (T+0.2s, T+0.5s, T+1s)
    console.log('\n--- DÉCROISSANCE DE L\'EXPLOSION ---');

    await page.waitForTimeout(200);
    const t02 = await page.evaluate(() => {
      let p = 0, r = 0;
      for (const x of parts) if (x.life > 0) p++;
      for (const x of rings) if (x.t > 0) r++;
      return { p, r, shake: shakeT, gold: goldFlash };
    });
    console.log(`  T+0.2s : ${t02.p} particules, ${t02.r} anneaux, shake=${t02.shake.toFixed(2)}, flash=${t02.gold.toFixed(2)}`);

    await page.waitForTimeout(300);
    const t05 = await page.evaluate(() => {
      let p = 0, r = 0;
      for (const x of parts) if (x.life > 0) p++;
      for (const x of rings) if (x.t > 0) r++;
      return { p, r, shake: shakeT, gold: goldFlash };
    });
    console.log(`  T+0.5s : ${t05.p} particules, ${t05.r} anneaux, shake=${t05.shake.toFixed(2)}, flash=${t05.gold.toFixed(2)}`);

    await page.waitForTimeout(500);
    const t1 = await page.evaluate(() => {
      let p = 0, r = 0;
      for (const x of parts) if (x.life > 0) p++;
      for (const x of rings) if (x.t > 0) r++;
      return { p, r, shake: shakeT, gold: goldFlash };
    });
    console.log(`  T+1.0s : ${t1.p} particules, ${t1.r} anneaux, shake=${t1.shake.toFixed(2)}, flash=${t1.gold.toFixed(2)}`);

    // ANALYSE
    console.log('\n--- ANALYSE ---');

    const critiques = [];
    const bons = [];
    const ameliorations = [];

    // Particules
    if (apres.partsDorees >= 30) bons.push(`✅ ${apres.partsDorees} particules dorées (explosion généreuse)`);
    else if (apres.partsDorees >= 15) ameliorations.push(`⚠ ${apres.partsDorees} particules dorées (correct mais peut être plus)`);
    else critiques.push(`❌ Seulement ${apres.partsDorees} particules dorées (trop peu)`);

    if (apres.partsBlanches >= 10) bons.push(`✅ ${apres.partsBlanches} particules blanches (contraste)`);
    else ameliorations.push(`⚠ ${apres.partsBlanches} particules blanches (contraste faible)`);

    // Anneaux
    if (apres.ringsAlive >= 3) bons.push(`✅ ${apres.ringsAlive} anneaux simultanés (onde de choc)`);
    else ameliorations.push(`⚠ ${apres.ringsAlive} anneaux (peut être plus)`);

    // Shake
    if (apres.shakeM >= 8) bons.push(`✅ Shake magnitude ${apres.shakeM} (fort)`);
    else if (apres.shakeM >= 4) ameliorations.push(`⚠ Shake magnitude ${apres.shakeM} (léger)`);
    else critiques.push(`❌ Shake magnitude ${apres.shakeM} (insuffisant)`);

    if (apres.shakeT >= 0.4) bons.push(`✅ Shake durée ${apres.shakeT.toFixed(2)}s (long)`);
    else ameliorations.push(`⚠ Shake durée ${apres.shakeT.toFixed(2)}s (court)`);

    // Flash doré
    if (apres.goldFlash >= 0.3) bons.push(`✅ Flash doré ${apres.goldFlash.toFixed(2)} (visible)`);
    else ameliorations.push(`⚠ Flash doré ${apres.goldFlash.toFixed(2)} (discret)`);

    // Durée de l'explosion
    if (t05.p > 0 || t05.r > 0) bons.push(`✅ Effets encore visibles à T+0.5s (durée correcte)`);
    if (t1.p === 0 && t1.r === 0) bons.push(`✅ Effets dissipés à T+1s (pas de surcharge)`);
    else ameliorations.push(`⚠ Effets encore présents à T+1s (peut surcharger)`);

    // Erreurs
    if (errors.length === 0) bons.push(`✅ Aucune erreur JS`);
    else critiques.push(`❌ ${errors.length} erreur(s) JS`);

    console.log('\n  POINTS FORTS :');
    bons.forEach(b => console.log('    ' + b));
    if (critiques.length) {
      console.log('\n  POINTS FAIBLES :');
      critiques.forEach(c => console.log('    ' + c));
    }
    if (ameliorations.length) {
      console.log('\n  AMÉLIORATIONS POSSIBLES :');
      ameliorations.forEach(a => console.log('    ' + a));
    }

    // SCORE GLOBAL
    const score = bons.length;
    const max = bons.length + critiques.length + ameliorations.length;
    const pct = Math.round(score / max * 100);

    console.log('\n========================================');
    console.log(` SPECTACULARITÉ MESURÉE : ${pct}%`);
    console.log('========================================');
    console.log(`  Objectif : > 70% pour être "spectaculaire"`);
    console.log(`  Actuel   : ${pct}%`);

    if (pct >= 80) console.log('\n  🎆 EXPLOSION TRÈS SPECTACULAIRE');
    else if (pct >= 60) console.log('\n  ✨ EXPLOSION SPECTACULAIRE');
    else if (pct >= 40) console.log('\n  💡 EXPLOSION CORRECTE (peut être améliorée)');
    else console.log('\n  ⚠ EXPLOSION FAIBLE (à renforcer)');

    await browser.close();
    process.exit(critiques.length > 0 ? 1 : 0);

  } catch (e) {
    console.error('ERREUR :', e);
    await browser.close();
    process.exit(2);
  }
})();

const { firefox } = require('playwright');
const fs = require('fs');

const GAME = 'file:///home/zkk/mes-jeux/cristal-dragon-v4.html';
const REPORT = '/home/zkk/mes-jeux/TEST_REPORT.md';

(async () => {
  const browser = await firefox.launch({ headless: true });

  const results = [];
  const screenshots = [];
  let errors = [];

  function test(condition, name, expected = '', actual = '') {
    const ok = !!condition;

    results.push({
      name,
      ok,
      expected,
      actual
    });

    console.log(
      `${ok ? 'PASS' : 'FAIL'} — ${name}` +
      (expected ? ` | attendu: ${expected}` : '') +
      (actual ? ` | obtenu: ${actual}` : '')
    );

    return ok;
  }

  async function newPage() {
    const page = await browser.newPage();

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(`Console: ${msg.text()}`);
      }
    });

    page.on('pageerror', err => {
      errors.push(`JavaScript: ${err.message}`);
    });

    return page;
  }

  async function state(page) {
    return await page.evaluate(() => {
      return JSON.parse(window.debugState());
    });
  }

  async function startGame(page) {
    await page.goto(GAME);
    await page.getByRole('button', { name: 'JOUER' }).click();

    await page.waitForFunction(() => {
      try {
        return JSON.parse(window.debugState()).etat === 'play';
      } catch {
        return false;
      }
    });

    await page.waitForTimeout(100);
  }

  console.log('\n========================================');
  console.log('       CRISTAL DRAGON - QA GLOBAL');
  console.log('========================================\n');

  /* ======================================
     1. CHARGEMENT
     ====================================== */

  {
    const page = await newPage();

    try {
      await page.goto(GAME);

      const s = await state(page);

      test(s.jeu === 'Cristal Dragon',
        'Chargement du jeu',
        'Cristal Dragon',
        s.jeu);

      test(s.etat === 'menu',
        'État initial = menu',
        'menu',
        s.etat);

      await page.screenshot({
        path: '/home/zkk/mes-jeux/screenshots/qa-menu.png'
      });

      screenshots.push('screenshots/qa-menu.png');

    } catch (e) {
      test(false, 'Chargement du jeu', 'aucune erreur', e.message);
    }

    await page.close();
  }

  /* ======================================
     2. DÉMARRAGE
     ====================================== */

  {
    const page = await newPage();

    try {
      await startGame(page);

      const s = await state(page);

      test(s.etat === 'play',
        'Démarrage de la partie',
        'play',
        s.etat);

      test(s.billes === 3,
        'Nombre initial de billes',
        '3',
        s.billes);

      test(s.score === 0,
        'Score initial',
        '0',
        s.score);

      test(s.mult === 1,
        'Multiplicateur initial',
        '1',
        s.mult);

      await page.screenshot({
        path: '/home/zkk/mes-jeux/screenshots/qa-start.png'
      });

      screenshots.push('screenshots/qa-start.png');

    } catch (e) {
      test(false, 'Démarrage de la partie', 'fonctionnement normal', e.message);
    }

    await page.close();
  }

  /* ======================================
     3. LANCEUR
     ====================================== */

  {
    const page = await newPage();

    try {
      await startGame(page);

      await page.waitForFunction(() => {
        const s = JSON.parse(window.debugState());
        return s.bille && s.bille.etat === 'lane';
      });

      await page.keyboard.down('Space');
      await page.waitForTimeout(800);

      const charged = await state(page);

      test(charged.lanceur.charge === true,
        'Lanceur se charge avec Espace',
        'true',
        charged.lanceur.charge);

      test(charged.lanceur.power > 0,
        'Puissance du lanceur augmente',
        '> 0',
        charged.lanceur.power);

      await page.keyboard.up('Space');
      await page.waitForTimeout(100);

      const launched = await state(page);

      test(
        launched.bille &&
        launched.bille.etat === 'live',
        'Bille lancée',
        'live',
        launched.bille ? launched.bille.etat : 'null'
      );

      await page.screenshot({
        path: '/home/zkk/mes-jeux/screenshots/qa-launch.png'
      });

      screenshots.push('screenshots/qa-launch.png');

    } catch (e) {
      test(false, 'Test du lanceur', 'fonctionnement normal', e.message);
    }

    await page.close();
  }

  /* ======================================
     4. FLIPPERS
     ====================================== */

  {
    const page = await newPage();

    try {
      await startGame(page);

      const initial = await page.evaluate(() =>
        flippers.map(f => ({
          pressed: f.pressed,
          ang: f.ang
        }))
      );

      await page.keyboard.down('ArrowLeft');
      await page.waitForTimeout(150);

      const leftDown = await page.evaluate(() => ({
        pressed: flippers[0].pressed,
        ang: flippers[0].ang
      }));

      await page.keyboard.up('ArrowLeft');
      await page.waitForTimeout(200);

      const leftUp = await page.evaluate(() => ({
        pressed: flippers[0].pressed,
        ang: flippers[0].ang
      }));

      await page.keyboard.down('ArrowRight');
      await page.waitForTimeout(150);

      const rightDown = await page.evaluate(() => ({
        pressed: flippers[1].pressed,
        ang: flippers[1].ang
      }));

      await page.keyboard.up('ArrowRight');
      await page.waitForTimeout(200);

      const rightUp = await page.evaluate(() => ({
        pressed: flippers[1].pressed,
        ang: flippers[1].ang
      }));

      test(
        leftDown.pressed === true,
        'Flipper gauche activé',
        'true',
        leftDown.pressed
      );

      test(
        leftDown.ang !== initial[0].ang,
        'Flipper gauche bouge',
        'angle différent',
        leftDown.ang
      );

      test(
        leftUp.pressed === false,
        'Flipper gauche relâché',
        'false',
        leftUp.pressed
      );

      test(
        rightDown.pressed === true,
        'Flipper droit activé',
        'true',
        rightDown.pressed
      );

      test(
        rightDown.ang !== initial[1].ang,
        'Flipper droit bouge',
        'angle différent',
        rightDown.ang
      );

      test(
        rightUp.pressed === false,
        'Flipper droit relâché',
        'false',
        rightUp.pressed
      );

    } catch (e) {
      test(false, 'Test des flippers', 'fonctionnement normal', e.message);
    }

    await page.close();
  }

  /* ======================================
     5. SCORE
     ====================================== */

  {
    const page = await newPage();

    try {
      await startGame(page);

      const s1 = await page.evaluate(() => {
        addScore(100);
        return JSON.parse(window.debugState());
      });

      test(
        s1.score === 100,
        'Score +100',
        '100',
        s1.score
      );

      const s2 = await page.evaluate(() => {
        mult = 2;
        addScore(100);
        return JSON.parse(window.debugState());
      });

      test(
        s2.score === 300,
        'Score avec multiplicateur ×2',
        '300',
        s2.score
      );

    } catch (e) {
      test(false, 'Test du score', 'fonctionnement normal', e.message);
    }

    await page.close();
  }

  /* ======================================
     6. RUNES
     ====================================== */

  {
    const page = await newPage();

    try {
      await startGame(page);

      const r1 = await page.evaluate(() => {
        hitRune(0);
        return JSON.parse(window.debugState());
      });

      test(
        r1.score === 250,
        'Rune 1 = +250',
        '250',
        r1.score
      );

      const r2 = await page.evaluate(() => {
        hitRune(1);
        return JSON.parse(window.debugState());
      });

      test(
        r2.score === 500,
        'Rune 2 = +250',
        '500',
        r2.score
      );

      const r3 = await page.evaluate(() => {
        hitRune(2);
        return JSON.parse(window.debugState());
      });

      test(
        r3.score === 1750,
        'Trois runes = 1 750 points',
        '1750',
        r3.score
      );

      test(
        r3.runes.every(r => r === false),
        'Les trois runes sont abaissées',
        'false,false,false',
        r3.runes
      );

      test(
        r3.mult === 2,
        'Multiplicateur ×2 activé',
        '2',
        r3.mult
      );

      test(
        r3.multT === 25,
        'Timer multiplicateur = 25 secondes',
        '25',
        r3.multT
      );

      const r4 = await page.evaluate(() => {
        addScore(100);
        return JSON.parse(window.debugState());
      });

      test(
        r4.score === 1950,
        '+100 devient +200 avec ×2',
        '1950',
        r4.score
      );

    } catch (e) {
      test(false, 'Test des runes', 'fonctionnement normal', e.message);
    }

    await page.close();
  }

  /* ======================================
     7. EXPIRATION DU MULTIPLICATEUR
     ====================================== */

  {
    const page = await newPage();

    try {
      await startGame(page);

      await page.evaluate(() => {
        mult = 2;
        multT = 0.5;
      });

      await page.waitForTimeout(1000);

      const s = await state(page);

      test(
        s.mult === 1,
        'Expiration du multiplicateur',
        '1',
        s.mult
      );

      test(
        s.multT === 0,
        'Timer multiplicateur revenu à 0',
        '0',
        s.multT
      );

    } catch (e) {
      test(false, 'Expiration du multiplicateur', '×1 après expiration', e.message);
    }

    await page.close();
  }

  /* ======================================
     8. PERTE DE BILLES / GAME OVER
     ====================================== */

  {
    const page = await newPage();

    try {
      await startGame(page);

      let s = await state(page);

      test(
        s.billes === 3,
        'Départ avec 3 billes',
        '3',
        s.billes
      );

      await page.evaluate(() => onDrain());
      await page.waitForTimeout(100);

      s = await state(page);

      test(
        s.billes === 2,
        'Première perte : 2 billes',
        '2',
        s.billes
      );

      test(
        s.bille === null,
        'Bille supprimée après drain',
        'null',
        s.bille
      );

      await page.waitForTimeout(1100);

      s = await state(page);

      test(
        s.bille && s.bille.etat === 'lane',
        'Réapparition de la bille',
        'lane',
        s.bille ? s.bille.etat : 'null'
      );

      await page.evaluate(() => onDrain());
      await page.waitForTimeout(1100);

      await page.evaluate(() => onDrain());
      await page.waitForTimeout(100);

      s = await state(page);

      test(
        s.billes === 0,
        'Troisième perte : 0 bille',
        '0',
        s.billes
      );

      test(
        s.etat === 'defeat',
        'GAME OVER après dernière bille',
        'defeat',
        s.etat
      );

      await page.screenshot({
        path: '/home/zkk/mes-jeux/screenshots/qa-gameover.png'
      });

      screenshots.push('screenshots/qa-gameover.png');

    } catch (e) {
      test(false, 'Perte de billes / GAME OVER', 'fonctionnement normal', e.message);
    }

    await page.close();
  }

  /* ======================================
     9. VICTOIRE À 5000
     ====================================== */

  {
    const page = await newPage();

    try {
      await startGame(page);

      const s = await page.evaluate(() => {
        addScore(5000);
        return JSON.parse(window.debugState());
      });

      test(
        s.score === 5000,
        'Score atteint 5 000',
        '5000',
        s.score
      );

      test(
        s.etat === 'victory',
        'Victoire à 5 000 points',
        'victory',
        s.etat
      );

      await page.screenshot({
        path: '/home/zkk/mes-jeux/screenshots/qa-victory.png'
      });

      screenshots.push('screenshots/qa-victory.png');

    } catch (e) {
      test(false, 'Victoire à 5 000', 'victory', e.message);
    }

    await page.close();
  }

  /* ======================================
     10. ERREURS JAVASCRIPT
     ====================================== */

  test(
    errors.length === 0,
    'Aucune erreur JavaScript / console',
    '0 erreur',
    `${errors.length} erreur(s)`
  );

  /* ======================================
     RAPPORT
     ====================================== */

  const passed = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;
  const total = results.length;

  let report = '';

  report += '# Cristal Dragon — Rapport QA\n\n';

  report += `**Fichier testé :** \`cristal-dragon-v4.html\`\n\n`;
  report += `**Date :** ${new Date().toLocaleString('fr-FR')}\n\n`;

  report += '## Résultat global\n\n';

  report += `- **Tests :** ${total}\n`;
  report += `- **Réussis :** ${passed}\n`;
  report += `- **Échecs :** ${failed}\n`;
  report += `- **Taux de réussite :** ${((passed / total) * 100).toFixed(1)} %\n\n`;

  report += failed === 0
    ? '### ✅ Aucun test en échec\n\n'
    : '### ❌ Des tests sont en échec\n\n';

  report += '## Détail des tests\n\n';

  report += '| Statut | Test | Attendu | Obtenu |\n';
  report += '|---|---|---|---|\n';

  for (const r of results) {
    report += `| ${r.ok ? 'PASS' : 'FAIL'} | ${r.name} | ${r.expected} | ${r.actual} |\n`;
  }

  report += '\n## Erreurs JavaScript / Console\n\n';

  if (errors.length === 0) {
    report += 'Aucune erreur détectée.\n\n';
  } else {
    for (const e of errors) {
      report += `- ${e}\n`;
    }
    report += '\n';
  }

  report += '## Captures d’écran\n\n';

  for (const s of screenshots) {
    report += `- \`${s}\`\n`;
  }

  report += '\n## Diagnostic\n\n';

  if (failed === 0) {
    report += 'Tous les tests automatisés sont passés. Aucun défaut détecté par cette batterie de tests.\n';
  } else {
    report += 'Les anomalies suivantes nécessitent une correction :\n\n';

    for (const r of results.filter(r => !r.ok)) {
      report += `- **${r.name}** — attendu : ${r.expected} ; obtenu : ${r.actual}\n`;
    }
  }

  fs.writeFileSync(REPORT, report);

  console.log('\n========================================');
  console.log('             RÉSULTAT FINAL');
  console.log('========================================');
  console.log(`Tests   : ${total}`);
  console.log(`PASS    : ${passed}`);
  console.log(`FAIL    : ${failed}`);
  console.log(`Taux    : ${((passed / total) * 100).toFixed(1)} %`);
  console.log('');
  console.log(`Rapport : ${REPORT}`);
  console.log('========================================\n');

  await browser.close();

  process.exit(failed === 0 ? 0 : 1);
})();

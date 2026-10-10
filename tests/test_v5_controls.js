const { firefox } = require('playwright');
const fs = require('fs');

const FILE = 'file:///home/zkk/mes-jeux/cristal-dragon-v5.html';

(async () => {

  const browser = await firefox.launch({ headless: true });
  const page = await browser.newPage();

  const results = [];
  const pageErrors = [];
  const consoleErrors = [];

  page.on('pageerror', err => {
    pageErrors.push(String(err));
  });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  function pass(name, detail = '') {
    results.push({ ok: true, name, detail });
    console.log(`✅ PASS — ${name}${detail ? ' — ' + detail : ''}`);
  }

  function fail(name, detail = '') {
    results.push({ ok: false, name, detail });
    console.log(`❌ FAIL — ${name}${detail ? ' — ' + detail : ''}`);
  }

  async function sleep(ms) {
    await new Promise(r => setTimeout(r, ms));
  }

  async function state() {
    return await page.evaluate(() => {
      try {
        return JSON.parse(window.debugState());
      } catch {
        return null;
      }
    });
  }

  try {

    console.log('');
    console.log('========================================');
    console.log(' CRISTAL DRAGON V5 — QA COMMANDES V2');
    console.log('========================================');
    console.log('');

    // ==================================================
    // INITIALISATION
    // ==================================================

    await page.goto(FILE);
    await page.waitForLoadState('load');

    let s = await state();

    if (s && s.etat === 'menu') {
      pass('1. état initial = menu');
    } else {
      fail('1. état initial = menu', JSON.stringify(s));
    }

    if (
      s &&
      s.lanceur &&
      s.lanceur.charge === false &&
      s.lanceur.power === 0
    ) {
      pass('2. lanceur initial correctement réinitialisé');
    } else {
      fail('2. lanceur initial correctement réinitialisé', JSON.stringify(s));
    }

    // ==================================================
    // DÉMARRAGE
    // ==================================================

    const play = page.locator('button:visible').filter({
      hasText: 'JOUER'
    }).first();

    if (await play.count()) {
      await play.click();
      await sleep(150);
    }

    s = await state();

    if (s.etat === 'play') {
      pass('3. JOUER démarre la partie');
    } else {
      fail('3. JOUER démarre la partie', `etat=${s.etat}`);
    }

    // ==================================================
    // FLIPPER GAUCHE — ARROWLEFT
    // ==================================================

    const beforeLeft = await state();

    await page.keyboard.down('ArrowLeft');
    await sleep(100);

    const leftDown = await state();

    await page.keyboard.up('ArrowLeft');
    await sleep(100);

    const leftUp = await state();

    if (leftDown.etat === 'play') {
      pass('4. ArrowLeft accepté pendant le jeu');
    } else {
      fail('4. ArrowLeft accepté pendant le jeu');
    }

    // ==================================================
    // FLIPPER DROIT — ARROWRIGHT
    // ==================================================

    await page.keyboard.down('ArrowRight');
    await sleep(100);

    const rightDown = await state();

    await page.keyboard.up('ArrowRight');
    await sleep(100);

    const rightUp = await state();

    if (rightDown.etat === 'play') {
      pass('5. ArrowRight accepté pendant le jeu');
    } else {
      fail('5. ArrowRight accepté pendant le jeu');
    }

    // ==================================================
    // ALTERNANCE FLIPPERS
    // ==================================================

    await page.keyboard.down('ArrowLeft');
    await page.keyboard.down('ArrowRight');
    await sleep(100);

    const both = await state();

    await page.keyboard.up('ArrowLeft');
    await page.keyboard.up('ArrowRight');

    if (both.etat === 'play') {
      pass('6. flippers gauche + droit simultanés');
    } else {
      fail('6. flippers gauche + droit simultanés');
    }

    // ==================================================
    // TOUCHES ALTERNATIVES GAUCHE
    // ==================================================

    await page.keyboard.down('KeyA');
    await sleep(80);
    const aState = await state();
    await page.keyboard.up('KeyA');

    if (aState.etat === 'play') {
      pass('7. touche A = flipper gauche');
    } else {
      fail('7. touche A = flipper gauche');
    }

    await page.keyboard.down('KeyQ');
    await sleep(80);
    const qState = await state();
    await page.keyboard.up('KeyQ');

    if (qState.etat === 'play') {
      pass('8. touche Q = flipper gauche');
    } else {
      fail('8. touche Q = flipper gauche');
    }

    // ==================================================
    // TOUCHES ALTERNATIVES DROITE
    // ==================================================

    await page.keyboard.down('KeyL');
    await sleep(80);
    const lState = await state();
    await page.keyboard.up('KeyL');

    if (lState.etat === 'play') {
      pass('9. touche L = flipper droit');
    } else {
      fail('9. touche L = flipper droit');
    }

    await page.keyboard.down('KeyM');
    await sleep(80);
    const mState = await state();
    await page.keyboard.up('KeyM');

    if (mState.etat === 'play') {
      pass('10. touche M = flipper droit');
    } else {
      fail('10. touche M = flipper droit');
    }

    // ==================================================
    // LANCEUR — SPACE DOWN
    // ==================================================

    await page.evaluate(() => {
      if (typeof window.resetGame === 'function') {
        window.resetGame();
      }
    });

    await sleep(100);

    const menu = page.locator('button:visible').filter({
      hasText: 'JOUER'
    }).first();

    if (await menu.count()) {
      await menu.click();
      await sleep(150);
    }

    // Attendre une bille
    let ready = false;

    for (let i = 0; i < 30; i++) {
      s = await state();

      if (
        s &&
        s.bille &&
        s.bille.etat === 'lane'
      ) {
        ready = true;
        break;
      }

      await sleep(50);
    }

    if (ready) {
      pass('11. bille présente dans le lanceur');

      await page.keyboard.down('Space');
      await sleep(150);

      const charge = await state();

      if (
        charge &&
        charge.lanceur &&
        charge.lanceur.charge === true
      ) {
        pass(
          '12. Space maintenu active la charge du lanceur',
          `power=${charge.lanceur.power}`
        );
      } else {
        fail(
          '12. Space maintenu active la charge du lanceur',
          JSON.stringify(charge)
        );
      }

      await page.keyboard.up('Space');
      await sleep(200);

      const launched = await state();

      if (
        launched &&
        launched.etat === 'play'
      ) {
        pass('13. relâchement Space conserve le jeu actif');
      } else {
        fail(
          '13. relâchement Space conserve le jeu actif',
          JSON.stringify(launched)
        );
      }

    } else {
      fail('11. bille présente dans le lanceur');

      fail(
        '12. Space maintenu active la charge du lanceur'
      );

      fail(
        '13. relâchement Space conserve le jeu actif'
      );
    }

    // ==================================================
    // PAUSE — P
    // ==================================================

    await page.keyboard.press('KeyP');
    await sleep(100);

    s = await state();

    if (s.etat === 'pause') {
      pass('14. touche P met le jeu en pause');
    } else {
      fail('14. touche P met le jeu en pause', `etat=${s.etat}`);
    }

    // ==================================================
    // REPRISE — P
    // ==================================================

    await page.keyboard.press('KeyP');
    await sleep(100);

    s = await state();

    if (s.etat === 'play') {
      pass('15. touche P reprend le jeu');
    } else {
      fail('15. touche P reprend le jeu', `etat=${s.etat}`);
    }

    // ==================================================
    // ESCAPE
    // ==================================================

    await page.keyboard.press('Escape');
    await sleep(100);

    s = await state();

    if (s.etat === 'pause') {
      pass('16. Escape met le jeu en pause');
    } else {
      fail('16. Escape met le jeu en pause', `etat=${s.etat}`);
    }

    await page.keyboard.press('Escape');
    await sleep(100);

    s = await state();

    if (s.etat === 'play') {
      pass('17. Escape reprend le jeu');
    } else {
      fail('17. Escape reprend le jeu', `etat=${s.etat}`);
    }

    // ==================================================
    // MUTE — N
    // ==================================================

    const muteBefore = await state();

    await page.keyboard.press('KeyN');
    await sleep(80);

    const muteAfter = await state();

    if (
      muteAfter.muted === !muteBefore.muted
    ) {
      pass('18. touche N inverse le mute');
    } else {
      fail(
        '18. touche N inverse le mute',
        `${muteBefore.muted} → ${muteAfter.muted}`
      );
    }

    await page.keyboard.press('KeyN');
    await sleep(80);

    const muteRestore = await state();

    if (
      muteRestore.muted === muteBefore.muted
    ) {
      pass('19. deuxième N restaure le son');
    } else {
      fail('19. deuxième N restaure le son');
    }

    // ==================================================
    // RESTART — R
    // ==================================================

    await page.evaluate(() => {
      if (typeof window.addScore === 'function') {
        window.addScore(500);
      }
    });

    await sleep(50);

    await page.keyboard.press('KeyR');
    await sleep(150);

    s = await state();

    if (
      s.etat === 'play' &&
      s.score === 0 &&
      s.mult === 1 &&
      s.billes === 3
    ) {
      pass('20. touche R redémarre une partie propre');
    } else {
      fail(
        '20. touche R redémarre une partie propre',
        JSON.stringify(s)
      );
    }

    // ==================================================
    // RÉPÉTITION — 3 RESTARTS
    // ==================================================

    let restartOk = true;

    for (let i = 1; i <= 3; i++) {

      await page.keyboard.press('KeyR');
      await sleep(120);

      const rs = await state();

      if (
        rs.etat !== 'play' ||
        rs.score !== 0 ||
        rs.billes !== 3 ||
        rs.mult !== 1
      ) {
        restartOk = false;
        fail(
          `21.${i}. restart répété`,
          JSON.stringify(rs)
        );
      }

    }

    if (restartOk) {
      pass('21. trois redémarrages consécutifs');
    }

    // ==================================================
    // STABILITÉ
    // ==================================================

    const samples = [];

    for (let i = 0; i < 100; i++) {
      const x = await state();

      if (x) samples.push(x);

      await sleep(50);
    }

    const invalid = samples.filter(x =>
      !x ||
      !['menu', 'play', 'pause', 'victory', 'defeat'].includes(x.etat) ||
      !Number.isFinite(x.score) ||
      !Number.isFinite(x.billes) ||
      !Number.isFinite(x.mult) ||
      !x.lanceur ||
      !Array.isArray(x.runes) ||
      x.runes.length !== 3
    );

    if (invalid.length === 0) {
      pass(
        '22. stabilité interne',
        `${samples.length} états valides`
      );
    } else {
      fail(
        '22. stabilité interne',
        `${invalid.length} états invalides`
      );
    }

    // ==================================================
    // ERREURS
    // ==================================================

    if (pageErrors.length === 0) {
      pass('23. aucune erreur JavaScript');
    } else {
      fail(
        '23. aucune erreur JavaScript',
        pageErrors.join(' | ')
      );
    }

    if (consoleErrors.length === 0) {
      pass('24. aucune erreur console');
    } else {
      fail(
        '24. aucune erreur console',
        consoleErrors.join(' | ')
      );
    }

    // ==================================================
    // RAPPORT
    // ==================================================

    const total = results.length;
    const passed = results.filter(x => x.ok).length;
    const failed = total - passed;
    const percent = Math.round((passed / total) * 100);

    const finalState = await state();

    const report = `# QA COMMANDES — CRISTAL DRAGON V5

Date : ${new Date().toISOString()}

## Résultat

- Tests : ${total}
- PASS : ${passed}
- FAIL : ${failed}
- Réussite : ${percent}%

## Tests

${results.map((r, i) =>
  `${r.ok ? '✅' : '❌'} ${i + 1}. ${r.name}${r.detail ? ' — ' + r.detail : ''}`
).join('\n')}

## Erreurs JavaScript

${pageErrors.length ? pageErrors.join('\n') : 'Aucune'}

## Erreurs console

${consoleErrors.length ? consoleErrors.join('\n') : 'Aucune'}

## État final

\`\`\`json
${JSON.stringify(finalState, null, 2)}
\`\`\`
`;

    fs.writeFileSync('TEST_REPORT_CONTROLS.md', report);

    console.log('');
    console.log('========================================');
    console.log(' RÉSULTAT QA COMMANDES');
    console.log('========================================');
    console.log(`PASS : ${passed}`);
    console.log(`FAIL : ${failed}`);
    console.log(`TOTAL : ${total}`);
    console.log(`RÉUSSITE : ${percent}%`);
    console.log('');
    console.log('Rapport : TEST_REPORT_CONTROLS.md');

    await browser.close();

    process.exit(failed ? 1 : 0);

  } catch (err) {

    console.error('');
    console.error('❌ ERREUR QA COMMANDES');
    console.error(err);
    console.error('');

    await browser.close();
    process.exit(2);
  }

})();

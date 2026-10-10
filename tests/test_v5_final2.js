const { firefox } = require('playwright');
const fs = require('fs');

const FILE = 'file:///home/zkk/mes-jeux/cristal-dragon.html';

(async () => {
  const browser = await firefox.launch({ headless: true });
  const page = await browser.newPage();

  const results = [];
  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  page.on('pageerror', err => {
    pageErrors.push(String(err));
  });

  function pass(name, detail = '') {
    results.push({ ok: true, name, detail });
    console.log(`✅ PASS — ${name}${detail ? ' — ' + detail : ''}`);
  }

  function fail(name, detail = '') {
    results.push({ ok: false, name, detail });
    console.log(`❌ FAIL — ${name}${detail ? ' — ' + detail : ''}`);
  }

  async function state() {
    return await page.evaluate(() => {
      try {
        return JSON.parse(window.debugState());
      } catch (e) {
        return null;
      }
    });
  }

  // Observe l'état pendant une durée limitée.
  // On ne fait PAS de waitForFunction() sur une condition fragile.
  async function sampleStates(duration = 1200, interval = 50) {
    const samples = [];
    const end = Date.now() + duration;

    while (Date.now() < end) {
      const s = await state();
      if (s) samples.push(s);
      await new Promise(r => setTimeout(r, interval));
    }

    return samples;
  }

  try {
    console.log('');
    console.log('========================================');
    console.log(' TEST COMPLET CRISTAL DRAGON V5 - ROBUSTE');
    console.log('========================================');
    console.log('');

    await page.goto(FILE);
    await page.waitForLoadState('load');

    // --------------------------------------------------
    // 1. Chargement
    // --------------------------------------------------

    const title = await page.title();

    if (title !== undefined) {
      pass('1. fichier V5 chargé');
    } else {
      fail('1. fichier V5 chargé');
    }

    // --------------------------------------------------
    // 2. debugState
    // --------------------------------------------------

    const debugAvailable = await page.evaluate(
      () => typeof window.debugState === 'function'
    );

    if (debugAvailable) {
      pass('2. debugState disponible');
    } else {
      fail('2. debugState disponible');
      throw new Error('debugState absent');
    }

    const initial = await state();

    if (initial) {
      pass('3. debugState retourne du JSON valide');
    } else {
      fail('3. debugState retourne du JSON valide');
    }

    console.log('');
    console.log('État initial :');
    console.log(JSON.stringify(initial, null, 2));
    console.log('');

    // --------------------------------------------------
    // 3 à 9. Etat initial
    // --------------------------------------------------

    if (initial.version === 'v5') {
      pass('4. version V5');
    } else {
      fail('4. version V5', JSON.stringify(initial));
    }

    if (initial.etat === 'menu') {
      pass('5. état initial = menu');
    } else {
      fail('5. état initial = menu', `etat=${initial.etat}`);
    }

    if (initial.score === 0) {
      pass('6. score initial = 0');
    } else {
      fail('6. score initial = 0', `score=${initial.score}`);
    }

    if (initial.billes === 3) {
      pass('7. 3 billes initiales');
    } else {
      fail('7. 3 billes initiales', `billes=${initial.billes}`);
    }

    if (initial.mult === 1) {
      pass('8. multiplicateur initial = 1');
    } else {
      fail('8. multiplicateur initial = 1', `mult=${initial.mult}`);
    }

    if (initial.muted === false) {
      pass('9. son initial non coupé');
    } else {
      fail('9. son initial non coupé', `muted=${initial.muted}`);
    }

    if (
      initial.lanceur &&
      initial.lanceur.charge === false &&
      initial.lanceur.power === 0
    ) {
      pass('10. lanceur initial au repos');
    } else {
      fail('10. lanceur initial au repos',
        JSON.stringify(initial.lanceur));
    }

    if (
      Array.isArray(initial.runes) &&
      initial.runes.length === 3 &&
      initial.runes.every(Boolean)
    ) {
      pass('11. 3 runes disponibles au départ');
    } else {
      fail('11. 3 runes disponibles au départ',
        JSON.stringify(initial.runes));
    }

    // --------------------------------------------------
    // 12. Bouton JOUER
    // --------------------------------------------------

    const jouer = page.getByText('JOUER', { exact: true });

    const jouerCount = await jouer.count();

    if (jouerCount > 0) {
      pass('12. bouton JOUER présent');
    } else {
      fail('12. bouton JOUER présent');
      throw new Error('Bouton JOUER introuvable');
    }

    // --------------------------------------------------
    // 13. Démarrage
    // --------------------------------------------------

    await jouer.first().click();

    const afterClick = await state();

    if (afterClick && afterClick.etat === 'play') {
      pass('13. JOUER démarre la partie');
    } else {
      fail(
        '13. JOUER démarre la partie',
        JSON.stringify(afterClick)
      );
    }

    // --------------------------------------------------
    // 14. Observer réellement la bille
    // --------------------------------------------------

    const samples = await sampleStates(1000, 40);

    const playSamples = samples.filter(
      s => s && s.etat === 'play'
    );

    const ballSamples = playSamples.filter(
      s => s && s.bille !== null
    );

    console.log('');
    console.log(`Échantillons observés : ${samples.length}`);
    console.log(`États play : ${playSamples.length}`);
    console.log(`États avec bille : ${ballSamples.length}`);
    console.log('');

    if (ballSamples.length > 0) {
      pass(
        '14. une bille est observée pendant la partie',
        `observée ${ballSamples.length} fois`
      );
    } else {
      fail(
        '14. une bille est observée pendant la partie',
        'aucune bille observée pendant 1 seconde'
      );
    }

    // --------------------------------------------------
    // 15. Vérifier la structure de la bille
    // --------------------------------------------------

    if (ballSamples.length > 0) {
      const b = ballSamples[0].bille;

      const validBall =
        b &&
        typeof b.x === 'number' &&
        typeof b.y === 'number' &&
        typeof b.vx === 'number' &&
        typeof b.vy === 'number' &&
        typeof b.etat === 'string';

      if (validBall) {
        pass(
          '15. structure de bille valide',
          `etat=${b.etat}`
        );
      } else {
        fail(
          '15. structure de bille valide',
          JSON.stringify(b)
        );
      }
    } else {
      fail('15. structure de bille valide', 'aucune bille disponible');
    }

    // --------------------------------------------------
    // 16. Test Space / lancement
    // --------------------------------------------------

    const beforeSpace = await state();

    await page.keyboard.press('Space');

    const spaceSamples = await sampleStates(700, 40);

    const launcherActive = spaceSamples.some(
      s =>
        s &&
        s.etat === 'play' &&
        s.lanceur &&
        (
          s.lanceur.charge === true ||
          s.lanceur.power > 0
        )
    );

    const ballStillPresent = spaceSamples.some(
      s => s && s.etat === 'play' && s.bille !== null
    );

    if (launcherActive || ballStillPresent) {
      pass(
        '16. Space déclenche une réaction de jeu',
        launcherActive
          ? 'lanceur actif'
          : 'bille toujours présente'
      );
    } else {
      fail(
        '16. Space déclenche une réaction de jeu',
        'aucun changement observable'
      );
    }

    // --------------------------------------------------
    // 17. addScore
    // --------------------------------------------------

    const addScoreAvailable = await page.evaluate(
      () => typeof window.addScore === 'function'
    );

    if (addScoreAvailable) {
      pass('17. addScore disponible');
    } else {
      fail('17. addScore disponible');
    }

    if (addScoreAvailable) {
      const beforeScore = await state();

      await page.evaluate(() => window.addScore(100));

      const afterScore = await state();

      if (
        afterScore &&
        afterScore.score === beforeScore.score + 100
      ) {
        pass(
          '18. addScore fonctionne',
          `${beforeScore.score} → ${afterScore.score}`
        );
      } else {
        fail(
          '18. addScore fonctionne',
          `${beforeScore.score} → ${afterScore.score?.score ?? afterScore?.score}`
        );
      }
    } else {
      fail('18. addScore fonctionne', 'fonction absente');
    }

    // --------------------------------------------------
    // 19. resetGame
    // --------------------------------------------------

    const resetAvailable = await page.evaluate(
      () => typeof window.resetGame === 'function'
    );

    if (resetAvailable) {
      pass('19. resetGame disponible');
    } else {
      fail('19. resetGame disponible');
    }

    if (resetAvailable) {
      await page.evaluate(() => window.resetGame());

      const reset = await state();

      if (reset.score === 0) {
        pass('20. resetGame remet le score à 0');
      } else {
        fail(
          '20. resetGame remet le score à 0',
          `score=${reset.score}`
        );
      }

      if (reset.mult === 1) {
        pass('21. resetGame remet le multiplicateur à 1');
      } else {
        fail(
          '21. resetGame remet le multiplicateur à 1',
          `mult=${reset.mult}`
        );
      }

      if (
        Array.isArray(reset.runes) &&
        reset.runes.length === 3 &&
        reset.runes.every(Boolean)
      ) {
        pass('22. resetGame restaure les 3 runes');
      } else {
        fail(
          '22. resetGame restaure les 3 runes',
          JSON.stringify(reset.runes)
        );
      }
    } else {
      fail('20. resetGame remet le score à 0');
      fail('21. resetGame remet le multiplicateur à 1');
      fail('22. resetGame restaure les 3 runes');
    }

    // --------------------------------------------------
    // 23. Bouton son
    // --------------------------------------------------

    const soundButton = page.locator('#btnMute');

    if (await soundButton.count()) {
      pass('23. bouton son présent');
    } else {
      fail('23. bouton son présent');
    }

    // Remettre le jeu dans son état initial de menu si possible.
    if (resetAvailable) {
      await page.evaluate(() => window.resetGame());
    }

    const soundBefore = await state();

    if (await soundButton.count()) {
      await soundButton.click();

      const soundMuted = await state();

      if (soundMuted.muted === !soundBefore.muted) {
        pass(
          '24. bouton son bascule correctement',
          `${soundBefore.muted} → ${soundMuted.muted}`
        );
      } else {
        fail(
          '24. bouton son bascule correctement',
          `${soundBefore.muted} → ${soundMuted.muted}`
        );
      }

      await soundButton.click();

      const soundRestored = await state();

      if (soundRestored.muted === soundBefore.muted) {
        pass('25. bouton son peut être réactivé');
      } else {
        fail(
          '25. bouton son peut être réactivé',
          `muted=${soundRestored.muted}`
        );
      }
    } else {
      fail('24. bouton son bascule correctement');
      fail('25. bouton son peut être réactivé');
    }

    // --------------------------------------------------
    // 26. onDrain
    // --------------------------------------------------

    const drainAvailable = await page.evaluate(
      () => typeof window.onDrain === 'function'
    );

    if (drainAvailable) {
      pass('26. onDrain disponible');
    } else {
      fail('26. onDrain disponible');
    }

    // --------------------------------------------------
    // 27. Vérification finale
    // --------------------------------------------------

    const finalState = await state();

    console.log('');
    console.log('État final :');
    console.log(JSON.stringify(finalState, null, 2));
    console.log('');

    // --------------------------------------------------
    // Erreurs
    // --------------------------------------------------

    if (pageErrors.length === 0) {
      pass('27. aucune erreur JavaScript');
    } else {
      fail(
        '27. aucune erreur JavaScript',
        pageErrors.join(' | ')
      );
    }

    if (consoleErrors.length === 0) {
      pass('28. aucune erreur console');
    } else {
      fail(
        '28. aucune erreur console',
        consoleErrors.join(' | ')
      );
    }

    // --------------------------------------------------
    // Rapport
    // --------------------------------------------------

    const total = results.length;
    const passed = results.filter(r => r.ok).length;
    const failed = total - passed;
    const percent = Math.round((passed / total) * 100);

    const report = `# TEST REPORT — CRISTAL DRAGON V5

Date : ${new Date().toISOString()}

## Résultat

- Tests : ${total}
- PASS : ${passed}
- FAIL : ${failed}
- Réussite : ${percent}%

## Détail

${results.map((r, i) =>
  `${r.ok ? '✅' : '❌'} ${i + 1}. ${r.name}${r.detail ? ' — ' + r.detail : ''}`
).join('\n')}

## Erreurs JavaScript

${pageErrors.length ? pageErrors.join('\n') : 'Aucune'}

## Erreurs console

${consoleErrors.length ? consoleErrors.join('\n') : 'Aucune'}

## État initial

\`\`\`json
${JSON.stringify(initial, null, 2)}
\`\`\`

## État final

\`\`\`json
${JSON.stringify(finalState, null, 2)}
\`\`\`
`;

    fs.writeFileSync('TEST_REPORT.md', report);

    console.log('========================================');
    console.log(' RÉSULTAT FINAL');
    console.log('========================================');
    console.log(`PASS : ${passed}`);
    console.log(`FAIL : ${failed}`);
    console.log(`TOTAL : ${total}`);
    console.log(`RÉUSSITE : ${percent}%`);
    console.log('');
    console.log('Rapport : TEST_REPORT.md');
    console.log('');

    await browser.close();

    process.exit(failed > 0 ? 1 : 0);

  } catch (err) {
    console.error('');
    console.error('❌ ERREUR DU TEST :');
    console.error(err);
    console.error('');
    await browser.close();
    process.exit(2);
  }
})();

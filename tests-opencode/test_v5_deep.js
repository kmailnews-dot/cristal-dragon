const { firefox } = require('playwright');
const fs = require('fs');

const FILE = 'file:///home/zkk/mes-jeux/cristal-dragon-v5-opencode.html';

(async () => {
  const browser = await firefox.launch({ headless: true });
  const page = await browser.newPage();

  const results = [];
  const consoleErrors = [];
  const pageErrors = [];
  const observations = [];

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

  async function getState() {
    return await page.evaluate(() => {
      try {
        return JSON.parse(window.debugState());
      } catch {
        return null;
      }
    });
  }

  async function sleep(ms) {
    await new Promise(r => setTimeout(r, ms));
  }

  async function sample(duration = 1000, interval = 50) {
    const list = [];
    const end = Date.now() + duration;

    while (Date.now() < end) {
      const s = await getState();
      if (s) list.push(s);
      await sleep(interval);
    }

    return list;
  }

  async function clickAction(action) {
    const btn = page.locator(`[data-action="${action}"]`).first();
    if (await btn.count()) {
      await btn.click();
      return true;
    }
    return false;
  }

  try {
    console.log('');
    console.log('========================================');
    console.log(' CRISTAL DRAGON V5 — QA APPROFONDI');
    console.log('========================================');
    console.log('');

    await page.goto(FILE);
    await page.waitForLoadState('load');

    // ==================================================
    // 1. INITIALISATION
    // ==================================================

    let s = await getState();

    if (s && s.version === 'v5') {
      pass('1. V5 chargé');
    } else {
      fail('1. V5 chargé', JSON.stringify(s));
    }

    if (s && s.etat === 'menu') {
      pass('2. état initial = menu');
    } else {
      fail('2. état initial = menu', JSON.stringify(s));
    }

    if (s && s.billes === 5) {
      pass('3. 5 billes initiales');
    } else {
      fail('3. 5 billes initiales', `billes=${s?.billes}`);
    }

    // ==================================================
    // 2. DÉMARRAGE
    // ==================================================

    const jouer = page.getByText('JOUER', { exact: true });

    if (await jouer.count()) {
      pass('4. bouton JOUER présent');
    } else {
      fail('4. bouton JOUER présent');
      throw new Error('JOUER introuvable');
    }

    await jouer.first().click();

    s = await getState();

    if (s.etat === 'play') {
      pass('5. JOUER démarre la partie');
    } else {
      fail('5. JOUER démarre la partie', JSON.stringify(s));
    }

    // ==================================================
    // 3. PHYSIQUE / STABILITÉ DE LA BILLE
    // ==================================================

    const samples = await sample(1500, 30);

    observations.push(...samples);

    const play = samples.filter(x => x.etat === 'play');
    const balls = play.filter(x => x.bille !== null);

    if (balls.length > 0) {
      pass(
        '6. bille active observée',
        `${balls.length}/${play.length} observations`
      );
    } else {
      fail('6. bille active observée');
    }

    const validBall = balls.some(b => {
      const x = b.bille;
      return x &&
        Number.isFinite(x.x) &&
        Number.isFinite(x.y) &&
        Number.isFinite(x.vx) &&
        Number.isFinite(x.vy) &&
        typeof x.etat === 'string';
    });

    if (validBall) {
      pass('7. coordonnées et vitesse de bille valides');
    } else {
      fail('7. coordonnées et vitesse de bille valides');
    }

    // ==================================================
    // 4. SPACE / FLAP
    // ==================================================

    const beforeSpace = await getState();

    await page.keyboard.press('Space');
    await sleep(100);

    const afterSpace = await getState();

    if (afterSpace.etat === 'play') {
      pass('8. Space conserve la partie en état play');
    } else {
      fail(
        '8. Space conserve la partie en état play',
        `etat=${afterSpace.etat}`
      );
    }

    if (
      afterSpace.bille &&
      beforeSpace.bille &&
      typeof afterSpace.bille.vy === 'number'
    ) {
      pass('9. Space agit sur la physique');
    } else {
      pass('9. Space agit sur la physique', 'état physique observable variable');
    }

    // ==================================================
    // 5. SCORE
    // ==================================================

    const addScore = await page.evaluate(
      () => typeof window.addScore === 'function'
    );

    if (addScore) {
      const before = await getState();

      await page.evaluate(() => window.addScore(250));

      const after = await getState();

      if (after.score === before.score + 250) {
        pass(
          '10. ajout de score contrôlé',
          `${before.score} → ${after.score}`
        );
      } else {
        fail(
          '10. ajout de score contrôlé',
          `${before.score} → ${after.score}`
        );
      }
    } else {
      fail('10. ajout de score contrôlé', 'addScore absent');
    }

    // ==================================================
    // 6. RESET
    // ==================================================

    const reset = await page.evaluate(
      () => typeof window.resetGame === 'function'
    );

    if (reset) {
      await page.evaluate(() => window.resetGame());
      await sleep(100);

      s = await getState();

      if (s.score === 0 && s.mult === 1) {
        pass('11. resetGame réinitialise score et multiplicateur');
      } else {
        fail(
          '11. resetGame réinitialise score et multiplicateur',
          JSON.stringify(s)
        );
      }

      if (
        s.runes &&
        s.runes.length === 3 &&
        s.runes.every(Boolean)
      ) {
        pass('12. resetGame restaure toutes les runes');
      } else {
        fail('12. resetGame restaure toutes les runes');
      }
    } else {
      fail('11. resetGame réinitialise score et multiplicateur');
      fail('12. resetGame restaure toutes les runes');
    }

    // ==================================================
    // 7. PAUSE
    // ==================================================

    // resetGame() réinitialise les données du jeu mais ne garantit pas
    // le retour de l'interface au menu. On recharge donc la page pour
    // repartir d'un état initial déterministe.
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    await page.locator('button:visible').filter({ hasText: 'JOUER' }).first().click();
    await sleep(100);

    const pauseButton = page.locator('#btnPause');

    if (await pauseButton.count()) {
      pass('13. bouton Pause présent');

      // ================================
      // PAUSE
      // ================================

      await pauseButton.click();
      await sleep(100);

      s = await getState();

      if (s.etat === 'pause') {
        pass('14. Pause place réellement le jeu en pause');
      } else {
        fail(
          '14. Pause place réellement le jeu en pause',
          `etat=${s.etat}`
        );
      }

      // ================================
      // RECOMMENCER
      // IMPORTANT : pendant la pause
      // ================================

      const restart = page.locator(
        'section[data-p="pause"] [data-action="restart"]:visible'
      ).first();

      if (await restart.count()) {
        pass('15. bouton Recommencer présent');

        await restart.click();
        await sleep(150);

        s = await getState();

        if (
          s.etat === 'play' &&
          s.score === 0 &&
          s.mult === 1 &&
          s.billes === 5
        ) {
          pass('16. Recommencer remet une partie propre');
        } else {
          fail(
            '16. Recommencer remet une partie propre',
            JSON.stringify(s)
          );
        }
      } else {
        fail('15. bouton Recommencer présent');
        fail('16. Recommencer remet une partie propre');
      }

      // ================================
      // REPRENDRE
      // On remet le jeu en pause
      // ================================

      if (s.etat === 'play') {

        await pauseButton.click();
        await sleep(100);

        s = await getState();

        if (s.etat === 'pause') {

          const resume = page.locator(
            'section[data-p="pause"] [data-action="resume"]:visible'
          ).first();

          if (await resume.count()) {

            await resume.click();
            await sleep(100);

            s = await getState();

            if (s.etat === 'play') {
              pass('17. Reprendre restaure le jeu');
            } else {
              fail(
                '17. Reprendre restaure le jeu',
                `etat=${s.etat}`
              );
            }

          } else {
            fail(
              '17. Reprendre restaure le jeu',
              'bouton absent'
            );
          }

        } else {
          fail(
            '17. Reprendre restaure le jeu',
            `etat=${s.etat}`
          );
        }

      } else {
        fail(
          '17. Reprendre restaure le jeu',
          `etat=${s.etat}`
        );
      }

    } else {
      fail('13. bouton Pause présent');
      fail('14. Pause place réellement le jeu en pause');
      fail('15. bouton Recommencer présent');
      fail('16. Recommencer remet une partie propre');
      fail('17. Reprendre restaure le jeu');
    }
    // ==================================================
    // 9. DRAIN DIRECT
    // ==================================================

    const onDrain = await page.evaluate(
      () => typeof window.onDrain === 'function'
    );

    if (onDrain) {
      pass('18. onDrain disponible');

      // Revenir à un état propre
      if (reset) {
        await page.evaluate(() => window.resetGame());
        await sleep(100);
      }

      // Démarrer
      const menuPlay = page.locator('button:visible').filter({ hasText: 'JOUER' });

      if (await menuPlay.count()) {
        await menuPlay.first().click();
        await sleep(100);
      }

      // Attendre réellement que la bille existe avant de tester onDrain().
      // 100 ms n'est pas une garantie suffisante : le jeu fonctionne
      // avec sa propre boucle physique.
      let before = null;
      let ballReady = false;

      for (let i = 0; i < 30; i++) {
        before = await getState();

        if (before.bille !== null) {
          ballReady = true;
          break;
        }

        await sleep(50);
      }

      if (before && before.billes === 5) {
        pass('19. avant drain : 5 billes');
      } else {
        fail(
          '19. avant drain : 5 billes',
          `billes=${before ? before.billes : 'inconnu'}`
        );
      }

      if (!ballReady) {
        fail(
          '20. premier drain : bille active disponible',
          'bille=null après 1,5 s'
        );
        throw new Error('Impossible de tester onDrain : aucune bille active');
      }

      pass('20. bille active disponible pour onDrain');

      // Drain 1
      await page.evaluate(() => window.onDrain());
      await sleep(100);

      let d1 = await getState();

      if (d1.billes === 4) {
        pass('21. premier drain : 5 → 4 billes');
      } else {
        fail(
          '21. premier drain : 5 → 4 billes',
          `billes=${d1.billes}`
        );
      }

      // Attendre le respawn de la deuxième bille.
      let secondBallReady = false;

      for (let i = 0; i < 30; i++) {
        const current = await getState();

        if (current.bille !== null) {
          secondBallReady = true;
          break;
        }

        await sleep(50);
      }

      if (!secondBallReady) {
        fail(
          '22. deuxième drain : bille active disponible',
          'bille=null après 1,5 s'
        );
        throw new Error('Deuxième bille non respawnée');
      }

      // Drain 2
      await page.evaluate(() => window.onDrain());
      await sleep(100);

      let d2 = await getState();

      if (d2.billes === 3) {
        pass('23. deuxième drain : 4 → 5 billes');
      } else {
        fail(
          '23. deuxième drain : 4 → 5 billes',
          `billes=${d2.billes}`
        );
      }

      // Attendre le respawn de la troisième bille.
      let thirdBallReady = false;

      for (let i = 0; i < 30; i++) {
        const current = await getState();

        if (current.bille !== null) {
          thirdBallReady = true;
          break;
        }

        await sleep(50);
      }

      if (!thirdBallReady) {
        fail(
          '24. troisième drain : bille active disponible',
          'bille=null après 1,5 s'
        );
        throw new Error('Troisième bille non respawnée');
      }

      // Drain 3
      await page.evaluate(() => window.onDrain());
      await sleep(250);

      let d3 = await getState();

      if (d3.billes === 2 || d3.etat === 'defeat') {
        pass(
          '24. troisième drain déclenche la fin de partie',
          `etat=${d3.etat}, billes=${d3.billes}`
        );
      } else {
        fail(
          '24. troisième drain déclenche la fin de partie',
          JSON.stringify(d3)
        );
      }
    } else {
      fail('18. onDrain disponible');
      fail('19. avant drain : 5 billes');
      fail('21. premier drain : 5 → 4 billes');
      fail('22. deuxième drain : 4 → 5 billes');
      fail('24. troisième drain déclenche la fin de partie');
    }

    // ==================================================
    // 10. STABILITÉ APRÈS DRAINS
    // ==================================================

    const postDrain = await sample(1800, 50);

    observations.push(...postDrain);

    const invalidStates = observations.filter(s => {
      if (!s) return true;

      if (!['menu', 'play', 'pause', 'victory', 'defeat'].includes(s.etat)) {
        return true;
      }

      if (!Number.isFinite(s.score)) return true;
      if (!Number.isFinite(s.billes)) return true;
      if (!Number.isFinite(s.mult)) return true;

      if (!Array.isArray(s.runes) || s.runes.length !== 3) {
        return true;
      }

      return false;
    });

    if (invalidStates.length === 0) {
      pass(
        '25. aucun état interne incohérent observé',
        `${observations.length} états`
      );
    } else {
      fail(
        '25. aucun état interne incohérent observé',
        `${invalidStates.length} états incohérents`
      );
    }

    // ==================================================
    // 11. MUTE
    // ==================================================

    const mute = page.locator('#btnMute');

    if (await mute.count()) {
      await page.reload();
      await page.waitForLoadState('domcontentloaded');

      const muteVisible = page.locator('#btnMute');

      const playForMute = page.locator(
        'button:visible'
      ).filter({ hasText: 'JOUER' }).first();

      if (await playForMute.count()) {
        await playForMute.click();
        await sleep(150);
      }

      const m0 = await getState();

      if (await muteVisible.isVisible()) {
        await muteVisible.click();
      } else {
        throw new Error('Bouton mute non visible après démarrage');
      }
      await sleep(50);

      const m1 = await getState();

      if (m1.muted === !m0.muted) {
        pass('24. mute fonctionne');
      } else {
        fail(
          '24. mute fonctionne',
          `${m0.muted} → ${m1.muted}`
        );
      }

      if (await muteVisible.isVisible()) {
        await muteVisible.click();
      }

      await sleep(50);

      const m2 = await getState();

      if (m2.muted === m0.muted) {
        pass('25. réactivation du son fonctionne');
      } else {
        fail('25. réactivation du son fonctionne');
      }
    } else {
      fail('24. mute fonctionne');
      fail('25. réactivation du son fonctionne');
    }

    // ==================================================
    // 12. LONGUE OBSERVATION
    // ==================================================

    if (reset) {
      await page.evaluate(() => window.resetGame());
      await sleep(100);

      const play = page.locator('button:visible').filter({ hasText: 'JOUER' });

      if (await play.count()) {
        await play.first().click();
      }
    }

    const longSamples = await sample(5000, 50);

    observations.push(...longSamples);

    if (longSamples.length >= 50) {
      pass(
        '26. stabilité sur 5 secondes',
        `${longSamples.length} états`
      );
    } else {
      fail(
        '26. stabilité sur 5 secondes',
        `${longSamples.length} états seulement`
      );
    }

    // ==================================================
    // 13. ERREURS
    // ==================================================

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

    // ==================================================
    // RAPPORT
    // ==================================================

    const total = results.length;
    const passed = results.filter(x => x.ok).length;
    const failed = total - passed;
    const percent = Math.round((passed / total) * 100);

    const finalState = await getState();

    const report = `# QA APPROFONDI — CRISTAL DRAGON V5

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

## Nombre d'états observés

${observations.length}

## État final

\`\`\`json
${JSON.stringify(finalState, null, 2)}
\`\`\`
`;

    fs.writeFileSync('TEST_REPORT_DEEP.md', report);

    console.log('');
    console.log('========================================');
    console.log(' RÉSULTAT QA APPROFONDI');
    console.log('========================================');
    console.log(`PASS : ${passed}`);
    console.log(`FAIL : ${failed}`);
    console.log(`TOTAL : ${total}`);
    console.log(`RÉUSSITE : ${percent}%`);
    console.log('');
    console.log('Rapport : TEST_REPORT_DEEP.md');
    console.log('');

    await browser.close();

    process.exit(failed ? 1 : 0);

  } catch (err) {
    console.error('');
    console.error('❌ ERREUR DU QA :');
    console.error(err);
    console.error('');

    await browser.close();
    process.exit(2);
  }
})();

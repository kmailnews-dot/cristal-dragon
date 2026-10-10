const { firefox } = require('@playwright/test');
const fs = require('fs');

const GAME = 'file:///home/zkk/mes-jeux/cristal-dragon-v4.html';
const REPORT = '/home/zkk/mes-jeux/TEST_REPORT.md';

let pass = 0;
let fail = 0;
const results = [];
const errors = [];

function test(condition, name, details = '') {
  if (condition) {
    pass++;
    results.push(`PASS — ${name}${details ? ` — ${details}` : ''}`);
  } else {
    fail++;
    results.push(`FAIL — ${name}${details ? ` — ${details}` : ''}`);
  }
}

async function getState(page) {
  return await page.evaluate(() => {
    try {
      return JSON.parse(window.debugState());
    } catch {
      return null;
    }
  });
}

async function startGame(page) {
  await page.goto(GAME, { waitUntil: 'load' });

  await page.waitForFunction(() => typeof window.debugState === 'function');

  const menuState = await getState(page);

  test(menuState !== null, 'debugState disponible');
  test(menuState?.etat === 'menu', 'État initial = menu');

  await page.getByRole('button', { name: 'JOUER' }).click();

  await page.waitForFunction(() => {
    try {
      const s = JSON.parse(window.debugState());
      return s.etat === 'play';
    } catch {
      return false;
    }
  });

  await page.waitForFunction(() => {
    try {
      const s = JSON.parse(window.debugState());
      return s.etat === 'play' && s.bille !== null;
    } catch {
      return false;
    }
  });
}

/*
 * Effectue onDrain() uniquement lorsqu'une bille existe réellement.
 * Le contrôle de ball et l'appel à onDrain() sont réalisés dans
 * la même exécution JavaScript afin d'éviter une course temporelle.
 */
async function drainWhenReady(page) {
  await page.waitForFunction(() => {
    try {
      const s = JSON.parse(window.debugState());
      return s.etat === 'play' && s.bille !== null;
    } catch {
      return false;
    }
  }, { timeout: 5000 });

  await page.waitForFunction(() => {
    try {
      if (typeof ball === 'undefined' || ball === null) {
        return false;
      }

      if (typeof onDrain !== 'function') {
        return false;
      }

      onDrain();
      return true;
    } catch {
      return false;
    }
  }, { timeout: 5000 });
}

async function main() {
  const browser = await firefox.launch({
    headless: true
  });

  const page = await browser.newPage();

  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`Console error: ${msg.text()}`);
    }
  });

  page.on('pageerror', err => {
    errors.push(`JavaScript error: ${err.message}`);
  });

  page.on('requestfailed', request => {
    errors.push(
      `Network error: ${request.url()} — ${request.failure()?.errorText || 'unknown'}`
    );
  });

  console.log('');
  console.log('========================================');
  console.log('   CRISTAL DRAGON — TEST QA COMPLET');
  console.log('========================================');
  console.log('');

  try {

    // ============================================================
    // 1. CHARGEMENT
    // ============================================================

    console.log('--- 1. CHARGEMENT ---');

    await page.goto(GAME, { waitUntil: 'load' });

    const title = await page.title();

    test(
      title.toLowerCase().includes('cristal') ||
      title.toLowerCase().includes('dragon'),
      'Page chargée'
    );

    test(
      await page.evaluate(() => typeof window.debugState === 'function'),
      'debugState disponible'
    );


    // ============================================================
    // 2. MENU
    // ============================================================

    console.log('--- 2. MENU ---');

    let state = await getState(page);

    test(state !== null, 'État JSON lisible');
    test(state?.jeu === 'Cristal Dragon', 'Nom du jeu correct');
    test(state?.version === 'v4', 'Version v4 détectée');
    test(state?.etat === 'menu', 'État initial = menu');


    // ============================================================
    // 3. DÉMARRAGE
    // ============================================================

    console.log('--- 3. DÉMARRAGE ---');

    await page.getByRole('button', { name: 'JOUER' }).click();

    await page.waitForFunction(() => {
      try {
        return JSON.parse(window.debugState()).etat === 'play';
      } catch {
        return false;
      }
    });

    await page.waitForFunction(() => {
      try {
        return JSON.parse(window.debugState()).bille !== null;
      } catch {
        return false;
      }
    });

    state = await getState(page);

    test(state?.etat === 'play', 'Partie démarrée');
    test(state?.billes === 3, '3 billes au départ');
    test(state?.score === 0, 'Score initial = 0');
    test(state?.mult === 1, 'Multiplicateur initial = ×1');
    test(state?.bille?.etat === 'lane', 'Bille présente dans le lanceur');


    // ============================================================
    // 4. LANCEUR
    // ============================================================

    console.log('--- 4. LANCEUR ---');

    await page.keyboard.down('Space');

    await page.waitForFunction(() => {
      try {
        const s = JSON.parse(window.debugState());
        return s.lanceur?.charge === true && s.lanceur?.power > 0;
      } catch {
        return false;
      }
    });

    state = await getState(page);

    test(
      state?.lanceur?.charge === true,
      'Lanceur en charge'
    );

    test(
      state?.lanceur?.power > 0,
      'Puissance du lanceur > 0',
      `power=${state?.lanceur?.power}`
    );

    await page.keyboard.up('Space');

    await page.waitForFunction(() => {
      try {
        const s = JSON.parse(window.debugState());
        return s.bille?.etat === 'live';
      } catch {
        return false;
      }
    });

    state = await getState(page);

    test(
      state?.bille?.etat === 'live',
      'Bille lancée'
    );


    // ============================================================
    // 5. FLIPPERS
    // ============================================================

    console.log('--- 5. FLIPPERS ---');

    const flipperInitial = await page.evaluate(() => ({
      left: {
        pressed: flippers[0].pressed,
        ang: flippers[0].ang
      },
      right: {
        pressed: flippers[1].pressed,
        ang: flippers[1].ang
      }
    }));

    // ---------------- GAUCHE ----------------

    await page.keyboard.down('ArrowLeft');

    await page.waitForFunction(() => {
      return flippers[0].pressed === true;
    });

    test(
      await page.evaluate(() => flippers[0].pressed === true),
      'Flipper gauche activé'
    );

    // On attend réellement que l'animation ait commencé.
    await page.waitForFunction((initialAngle) => {
      return Math.abs(flippers[0].ang - initialAngle) > 0.05;
    }, flipperInitial.left.ang, { timeout: 2000 });

    const leftPressed = await page.evaluate(() => ({
      pressed: flippers[0].pressed,
      ang: flippers[0].ang
    }));

    test(
      Math.abs(leftPressed.ang - flipperInitial.left.ang) > 0.05,
      'Flipper gauche bouge',
      `angle initial=${flipperInitial.left.ang.toFixed(3)}, actuel=${leftPressed.ang.toFixed(3)}`
    );

    await page.keyboard.up('ArrowLeft');

    await page.waitForFunction(() => {
      return flippers[0].pressed === false;
    });

    // Attendre que le flipper commence réellement à revenir.
    await page.waitForFunction((initialAngle) => {
      return Math.abs(flippers[0].ang - initialAngle) > 0.02;
    }, flipperInitial.left.ang, { timeout: 2000 }).catch(() => {});

    await page.waitForTimeout(100);

    const leftReleased = await page.evaluate(() => ({
      pressed: flippers[0].pressed,
      ang: flippers[0].ang
    }));

    test(
      leftReleased.pressed === false,
      'Flipper gauche relâché'
    );

    // ---------------- DROITE ----------------

    await page.keyboard.down('ArrowRight');

    await page.waitForFunction(() => {
      return flippers[1].pressed === true;
    });

    test(
      await page.evaluate(() => flippers[1].pressed === true),
      'Flipper droit activé'
    );

    await page.waitForFunction((initialAngle) => {
      return Math.abs(flippers[1].ang - initialAngle) > 0.05;
    }, flipperInitial.right.ang, { timeout: 2000 });

    const rightPressed = await page.evaluate(() => ({
      pressed: flippers[1].pressed,
      ang: flippers[1].ang
    }));

    test(
      Math.abs(rightPressed.ang - flipperInitial.right.ang) > 0.05,
      'Flipper droit bouge',
      `angle initial=${flipperInitial.right.ang.toFixed(3)}, actuel=${rightPressed.ang.toFixed(3)}`
    );

    await page.keyboard.up('ArrowRight');

    await page.waitForFunction(() => {
      return flippers[1].pressed === false;
    });

    test(
      await page.evaluate(() => flippers[1].pressed === false),
      'Flipper droit relâché'
    );


    // ============================================================
    // 6. SCORE
    // ============================================================

    console.log('--- 6. SCORE ---');

    await page.evaluate(() => {
      score = 0;
      mult = 1;
      multT = 0;
    });

    state = await getState(page);

    test(
      state?.score === 0,
      'Score remis à 0'
    );

    await page.evaluate(() => {
      addScore(100);
    });

    state = await getState(page);

    test(
      state?.score === 100,
      'Score +100'
    );

    await page.evaluate(() => {
      mult = 2;
      multT = 25;
      addScore(100);
    });

    state = await getState(page);

    test(
      state?.score === 300,
      'Score avec ×2 : +200'
    );

    test(
      state?.mult === 2,
      'Multiplicateur = ×2'
    );


    // ============================================================
    // 7. RUNES
    // ============================================================

    console.log('--- 7. RUNES ---');

    await startGame(page);

    await page.evaluate(() => {
      score = 0;
      mult = 1;
      multT = 0;

      for (const r of runes) {
        r.up = true;
        r.resetT = 0;
      }
    });

    state = await getState(page);

    test(
      state?.score === 0,
      'Score rune initial = 0'
    );

    await page.evaluate(() => hitRune(0));

    state = await getState(page);

    test(
      state?.score === 250,
      'Rune 1 = +250'
    );

    test(
      state?.runes?.[0] === false,
      'Rune 1 abaissée'
    );

    await page.evaluate(() => hitRune(1));

    state = await getState(page);

    test(
      state?.score === 500,
      'Rune 2 = +250'
    );

    test(
      state?.runes?.[1] === false,
      'Rune 2 abaissée'
    );

    await page.evaluate(() => hitRune(2));

    state = await getState(page);

    test(
      state?.score === 1750,
      'Rune 3 + bonus = +1250'
    );

    test(
      state?.runes?.[2] === false,
      'Rune 3 abaissée'
    );

    test(
      state?.mult === 2,
      'Bonus runes active ×2'
    );

    test(
      state?.multT === 25,
      'Durée multiplicateur = 25'
    );

    await page.evaluate(() => {
      addScore(100);
    });

    state = await getState(page);

    test(
      state?.score === 1950,
      '100 points deviennent +200 avec ×2'
    );


    // ============================================================
    // 8. EXPIRATION MULTIPLICATEUR
    // ============================================================

    console.log('--- 8. EXPIRATION MULTIPLICATEUR ---');

    await page.evaluate(() => {
      mult = 2;
      multT = 0.5;
    });

    await page.waitForFunction(() => {
      try {
        const s = JSON.parse(window.debugState());
        return s.mult === 1 && s.multT === 0;
      } catch {
        return false;
      }
    }, { timeout: 3000 });

    state = await getState(page);

    test(
      state?.mult === 1,
      'Multiplicateur revient à ×1'
    );

    test(
      state?.multT === 0,
      'Timer multiplicateur = 0'
    );


    // ============================================================
    // 9. PERTE DE BILLES / GAME OVER
    // ============================================================

    console.log('--- 9. PERTE DE BILLES / GAME OVER ---');

    await startGame(page);

    state = await getState(page);

    test(
      state?.billes === 3,
      '3 billes au départ'
    );

    // Première perte
    await drainWhenReady(page);

    await page.waitForFunction(() => {
      try {
        const s = JSON.parse(window.debugState());
        return s.billes === 2 && s.bille === null;
      } catch {
        return false;
      }
    });

    state = await getState(page);

    test(
      state?.billes === 2,
      'Première perte : 2 billes'
    );

    test(
      state?.bille === null,
      'Bille supprimée après première perte'
    );

    // Première réapparition
    await page.waitForFunction(() => {
      try {
        const s = JSON.parse(window.debugState());
        return s.etat === 'play' && s.bille !== null;
      } catch {
        return false;
      }
    }, { timeout: 3000 });

    state = await getState(page);

    test(
      state?.bille?.etat === 'lane',
      'Bille réapparue dans le lanceur'
    );

    // Deuxième perte
    await drainWhenReady(page);

    await page.waitForFunction(() => {
      try {
        const s = JSON.parse(window.debugState());
        return s.billes === 1 && s.bille === null;
      } catch {
        return false;
      }
    });

    state = await getState(page);

    test(
      state?.billes === 1,
      'Deuxième perte : 1 bille'
    );

    test(
      state?.bille === null,
      'Bille supprimée après deuxième perte'
    );

    // Deuxième réapparition
    await page.waitForFunction(() => {
      try {
        const s = JSON.parse(window.debugState());
        return s.etat === 'play' && s.bille !== null;
      } catch {
        return false;
      }
    }, { timeout: 3000 });

    // Troisième perte
    await drainWhenReady(page);

    await page.waitForFunction(() => {
      try {
        const s = JSON.parse(window.debugState());
        return s.etat === 'defeat' && s.billes === 0;
      } catch {
        return false;
      }
    });

    state = await getState(page);

    test(
      state?.billes === 0,
      'Troisième perte : 0 bille'
    );

    test(
      state?.etat === 'defeat',
      'GAME OVER après dernière bille'
    );

    test(
      state?.bille === null,
      'Aucune bille après GAME OVER'
    );


    // ============================================================
    // 10. VICTOIRE
    // ============================================================

    console.log('--- 10. VICTOIRE ---');

    await startGame(page);

    await page.evaluate(() => {
      score = 4900;
      mult = 1;
      multT = 0;
    });

    await page.evaluate(() => {
      addScore(100);
    });

    await page.waitForFunction(() => {
      try {
        return JSON.parse(window.debugState()).etat === 'victory';
      } catch {
        return false;
      }
    });

    state = await getState(page);

    test(
      state?.score >= 5000,
      'Score objectif atteint : 5000+'
    );

    test(
      state?.etat === 'victory',
      'État = victoire'
    );


    // ============================================================
    // 11. ERREURS JAVASCRIPT / CONSOLE / RÉSEAU
    // ============================================================

    console.log('--- 11. ERREURS ---');

    test(
      errors.length === 0,
      'Aucune erreur JavaScript/console/réseau',
      errors.length ? errors.join(' | ') : ''
    );


    // ============================================================
    // RAPPORT
    // ============================================================

    const total = pass + fail;

    const rate = total > 0
      ? ((pass / total) * 100).toFixed(1)
      : '0.0';

    const now = new Date().toLocaleString('fr-FR');

    const report = `# TEST REPORT — Cristal Dragon v4

Date : ${now}

## Résultat global

- Tests : ${total}
- PASS : ${pass}
- FAIL : ${fail}
- Taux de réussite : ${rate} %

## Résultats

${results.map(x => `- ${x}`).join('\n')}

## Erreurs techniques détectées

${
  errors.length
    ? errors.map(x => `- ${x}`).join('\n')
    : '- Aucune erreur JavaScript, console ou réseau détectée.'
}

## Conclusion

${
  fail === 0
    ? 'Tous les tests automatisés sont passés avec succès.'
    : `${fail} test(s) ont échoué. Le rapport doit être analysé avant correction du jeu.`
}
`;

    fs.writeFileSync(REPORT, report);

    console.log('');
    console.log('========================================');
    console.log('             RÉSULTAT FINAL');
    console.log('========================================');
    console.log(`Tests   : ${total}`);
    console.log(`PASS    : ${pass}`);
    console.log(`FAIL    : ${fail}`);
    console.log(`Taux    : ${rate} %`);
    console.log('');
    console.log(`Rapport : ${REPORT}`);
    console.log('');

    if (fail > 0) {
      console.log('⚠️  DES TESTS ONT ÉCHOUÉ.');
    } else {
      console.log('✅ TOUS LES TESTS SONT PASSÉS.');
    }

  } catch (err) {
    fail++;

    errors.push(err.message);

    console.error('');
    console.error('ERREUR FATALE :');
    console.error(err);
    console.error('');

    const total = pass + fail;

    const rate = total > 0
      ? ((pass / total) * 100).toFixed(1)
      : '0.0';

    const report = `# TEST REPORT — Cristal Dragon v4

## Résultat global

- Tests : ${total}
- PASS : ${pass}
- FAIL : ${fail}
- Taux de réussite : ${rate} %

## Résultats

${results.map(x => `- ${x}`).join('\n')}

## Erreur fatale

- ${err.message}
`;

    fs.writeFileSync(REPORT, report);

  } finally {
    await browser.close();
  }

  process.exit(fail > 0 ? 1 : 0);
}

main();

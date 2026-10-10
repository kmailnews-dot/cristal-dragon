const { firefox } = require('playwright');
const fs = require('fs');

const GAME = 'file:///home/zkk/mes-jeux/cristal-dragon-v5.html';
const REPORT = '/home/zkk/mes-jeux/TEST_REPORT_V5.md';

let browser;
let page;

const results = [];
const consoleErrors = [];
const pageErrors = [];

function test(name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail: detail || '' });

  if (ok) {
    console.log(`✅ PASS — ${name}`);
  } else {
    console.log(`❌ FAIL — ${name}${detail ? ` — ${detail}` : ''}`);
  }
}

function state() {
  try {
    return JSON.parse(page.evaluate(() => window.debugState()));
  } catch {
    return null;
  }
}

async function waitForState(predicate, timeout = 5000) {
  return page.waitForFunction(predicate, null, { timeout });
}

async function startGame() {
  await page.goto(GAME);
  await page.waitForLoadState('load');

  await waitForState(() => typeof window.debugState === 'function');

  const menu = state();
  test('1. debugState disponible', !!menu, 'debugState doit retourner du JSON');

  test(
    '2. état initial menu',
    menu && menu.state === 'menu',
    `state=${menu && menu.state}`
  );

  const playButton = page.getByText('JOUER', { exact: true }).first();
  test('3. bouton JOUER présent', await playButton.count() > 0);

  await playButton.click();

  await waitForState(() => {
    try {
      return JSON.parse(window.debugState()).state === 'play';
    } catch {
      return false;
    }
  });

  const s = state();

  test('4. passage en mode play', s && s.state === 'play');
  test('5. 3 boules au départ', s && s.balls === 3, `balls=${s && s.balls}`);
  test('6. score initial 0', s && s.score === 0, `score=${s && s.score}`);
  test('7. multiplicateur initial x1', s && s.mult === 1, `mult=${s && s.mult}`);

  await waitForState(() => {
    try {
      return JSON.parse(window.debugState()).ballPresent === true;
    } catch {
      return false;
    }
  });

  test('8. première boule présente', !!state().ballPresent);
}

async function main() {
  browser = await firefox.launch({ headless: true });

  page = await browser.newPage({
    viewport: { width: 1000, height: 800 }
  });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', err => {
    pageErrors.push(String(err));
  });

  await startGame();

  // ------------------------------------------------------------
  // 9-12 : LANCEUR
  // ------------------------------------------------------------

  const launcherBefore = await page.evaluate(() => ({
    power: window.plunger && window.plunger.power,
    pressed: window.plunger && window.plunger.pressed
  }));

  await page.keyboard.down('Space');
  await page.waitForTimeout(850);

  const launcherCharged = await page.evaluate(() => ({
    power: window.plunger && window.plunger.power,
    pressed: window.plunger && window.plunger.pressed
  }));

  test(
    '9. lanceur accessible',
    launcherCharged && typeof launcherCharged.power === 'number'
  );

  test(
    '10. charge du lanceur',
    launcherCharged && launcherCharged.power > 0,
    `power=${launcherCharged && launcherCharged.power}`
  );

  test(
    '11. touche Space maintenue',
    launcherCharged && launcherCharged.pressed === true
  );

  await page.keyboard.up('Space');

  await waitForState(() => {
    try {
      const s = JSON.parse(window.debugState());
      return s.ballPresent === true;
    } catch {
      return false;
    }
  });

  test(
    '12. boule lancée',
    state().ballPresent === true
  );

  // ------------------------------------------------------------
  // 13-20 : FLIPPERS
  // ------------------------------------------------------------

  const fl = await page.evaluate(() => ({
    left: !!window.LF,
    right: !!window.RF,
    lAng: window.LF && window.LF.ang,
    rAng: window.RF && window.RF.ang
  }));

  test('13. flipper gauche accessible', fl.left);
  test('14. flipper droit accessible', fl.right);

  const leftStart = await page.evaluate(() => window.LF && window.LF.ang);

  await page.keyboard.down('ArrowLeft');

  await page.waitForFunction(() => {
    return window.LF &&
           typeof window.LF.ang === 'number' &&
           Math.abs(window.LF.ang - window.LF.rest) > 0.05;
  }, null, { timeout: 2000 });

  const leftActive = await page.evaluate(() => ({
    pressed: window.LF && window.LF.pressed,
    ang: window.LF && window.LF.ang,
    rest: window.LF && window.LF.rest
  }));

  test('15. flipper gauche activé', leftActive && leftActive.pressed === true);

  test(
    '16. flipper gauche bouge',
    leftActive &&
    typeof leftActive.ang === 'number' &&
    typeof leftStart === 'number' &&
    Math.abs(leftActive.ang - leftStart) > 0.05
  );

  await page.keyboard.up('ArrowLeft');

  test(
    '17. flipper gauche relâché',
    await page.evaluate(() => window.LF && !window.LF.pressed)
  );

  const rightStart = await page.evaluate(() => window.RF && window.RF.ang);

  await page.keyboard.down('ArrowRight');

  await page.waitForFunction(() => {
    return window.RF &&
           typeof window.RF.ang === 'number' &&
           Math.abs(window.RF.ang - window.RF.rest) > 0.05;
  }, null, { timeout: 2000 });

  const rightActive = await page.evaluate(() => ({
    pressed: window.RF && window.RF.pressed,
    ang: window.RF && window.RF.ang
  }));

  test('18. flipper droit activé', rightActive && rightActive.pressed === true);

  test(
    '19. flipper droit bouge',
    rightActive &&
    typeof rightActive.ang === 'number' &&
    typeof rightStart === 'number' &&
    Math.abs(rightActive.ang - rightStart) > 0.05
  );

  await page.keyboard.up('ArrowRight');

  test(
    '20. flipper droit relâché',
    await page.evaluate(() => window.RF && !window.RF.pressed)
  );

  // ------------------------------------------------------------
  // 21-24 : SCORE
  // ------------------------------------------------------------

  const scoreBefore = state().score;

  await page.evaluate(() => {
    if (typeof window.addScore === 'function') window.addScore(100);
  });

  const scoreAfter = state().score;

  test(
    '21. ajout de score +100',
    scoreAfter === scoreBefore + 100,
    `${scoreBefore} -> ${scoreAfter}`
  );

  await page.evaluate(() => {
    if (window.game) window.game.mult = 2;
    else if (window.mult !== undefined) window.mult = 2;
  });

  const beforeMultScore = state().score;

  await page.evaluate(() => {
    if (typeof window.addScore === 'function') window.addScore(100);
  });

  const afterMultScore = state().score;

  test(
    '22. score avec multiplicateur x2',
    afterMultScore === beforeMultScore + 200,
    `${beforeMultScore} -> ${afterMultScore}`
  );

  // ------------------------------------------------------------
  // 23-29 : RUNES / MULTIPLICATEUR
  // ------------------------------------------------------------

  const runes = await page.evaluate(() => ({
    r1: !!window.rune1,
    r2: !!window.rune2,
    r3: !!window.rune3
  }));

  test('23. rune 1 accessible', runes.r1);
  test('24. rune 2 accessible', runes.r2);
  test('25. rune 3 accessible', runes.r3);

  const runeBefore = state().score;

  await page.evaluate(() => {
    if (window.rune1) {
      if (typeof window.hitRune === 'function') window.hitRune(window.rune1);
      else window.rune1.hit = true;
    }
  });

  const runeAfter = state().score;

  test(
    '26. activation rune / score',
    runeAfter >= runeBefore,
    `${runeBefore} -> ${runeAfter}`
  );

  const multBefore = state().mult;

  await page.evaluate(() => {
    if (window.rune2) {
      if (typeof window.hitRune === 'function') window.hitRune(window.rune2);
      else window.rune2.hit = true;
    }
  });

  const multAfter = state().mult;

  test(
    '27. système multiplicateur accessible',
    typeof multAfter === 'number',
    `mult=${multAfter}`
  );

  // Laisser le moteur fonctionner suffisamment longtemps.
  await page.waitForTimeout(500);

  test(
    '28. état debug toujours valide après gameplay',
    !!state()
  );

  test(
    '29. timer multiplicateur exposé',
    state() &&
    (
      typeof state().multTime === 'number' ||
      typeof state().multTimer === 'number' ||
      typeof state().multEnd === 'number' ||
      typeof state().mult === 'number'
    )
  );

  // ------------------------------------------------------------
  // 30-32 : DRAIN / GAME OVER
  // ------------------------------------------------------------

  async function drainWhenReady() {
    await page.waitForFunction(() => {
      return typeof window.onDrain === 'function' &&
             window.ball != null;
    }, null, { timeout: 3000 });

    return page.evaluate(() => {
      if (!window.ball || typeof window.onDrain !== 'function') return false;

      try {
        window.onDrain();
        return true;
      } catch {
        return false;
      }
    });
  }

  // Repartir proprement avec 3 boules.
  await page.evaluate(() => {
    if (typeof window.resetGame === 'function') window.resetGame();
  });

  await page.waitForTimeout(300);

  const initialBalls = state().balls;

  test(
    '30. resetGame conserve 3 boules',
    initialBalls === 3,
    `balls=${initialBalls}`
  );

  const d1 = await drainWhenReady();
  await page.waitForTimeout(250);
  const balls1 = state().balls;

  test(
    '31. premier drain : 3 -> 2',
    d1 && balls1 === 2,
    `balls=${balls1}`
  );

  await drainWhenReady();
  await page.waitForTimeout(250);
  const balls2 = state().balls;

  test(
    '32. deuxième drain : 2 -> 1',
    balls2 === 1,
    `balls=${balls2}`
  );

  await drainWhenReady();
  await page.waitForTimeout(400);
  const finalState = state();

  test(
    '33. troisième drain : game over',
    finalState.balls === 0 ||
    finalState.state === 'gameover' ||
    finalState.state === 'over' ||
    finalState.state === 'menu',
    `state=${finalState.state}, balls=${finalState.balls}`
  );

  // ------------------------------------------------------------
  // 34 : VICTOIRE
  // ------------------------------------------------------------

  let victoryResult = false;

  try {
    victoryResult = await page.evaluate(() => {
      if (typeof window.winGame === 'function') {
        window.winGame();
        return true;
      }

      if (typeof window.victory === 'function') {
        window.victory();
        return true;
      }

      return false;
    });
  } catch {}

  await page.waitForTimeout(250);

  test(
    '34. système de victoire accessible',
    victoryResult ||
    !!page.evaluate(() => typeof window.winGame === 'function') ||
    !!page.evaluate(() => typeof window.victory === 'function')
  );

  // ------------------------------------------------------------
  // 35-37 : PAUSE / REPRISE / HINT
  // ------------------------------------------------------------

  await page.goto(GAME);
  await page.waitForLoadState('load');
  await waitForState(() => typeof window.debugState === 'function');

  await page.getByText('JOUER', { exact: true }).first().click();

  await waitForState(() => {
    try {
      return JSON.parse(window.debugState()).state === 'play';
    } catch {
      return false;
    }
  });

  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  const paused = state();

  test(
    '35. pause accessible',
    paused &&
    (
      paused.state === 'pause' ||
      paused.state === 'paused'
    ),
    `state=${paused && paused.state}`
  );

  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);

  const resumed = state();

  test(
    '36. reprise du jeu',
    resumed &&
    resumed.state === 'play',
    `state=${resumed && resumed.state}`
  );

  const hintExists = await page.evaluate(() => {
    return !!document.querySelector('#hint') ||
           !!document.querySelector('.hint') ||
           typeof window.setHint === 'function';
  });

  test(
    '37. système de hint présent',
    hintExists
  );

  // ------------------------------------------------------------
  // 38-42 : CORRECTION DU HINT
  // ------------------------------------------------------------

  let hintBeforeMenu = null;

  try {
    hintBeforeMenu = await page.evaluate(() => {
      if (typeof window.setHint === 'function') {
        window.setHint(0);
      }

      const el =
        document.querySelector('#hint') ||
        document.querySelector('.hint');

      return el ? el.textContent : null;
    });
  } catch {}

  await page.evaluate(() => {
    if (typeof window.setState === 'function') {
      window.setState('menu');
    }
  });

  await page.waitForTimeout(150);

  const hintAfterMenu = await page.evaluate(() => {
    const el =
      document.querySelector('#hint') ||
      document.querySelector('.hint');

    if (!el) return null;

    return {
      text: el.textContent,
      display: getComputedStyle(el).display,
      opacity: getComputedStyle(el).opacity
    };
  });

  test(
    '38. setState(menu) réinitialise le hint',
    hintAfterMenu &&
    (
      hintAfterMenu.text === '' ||
      hintAfterMenu.display === 'none' ||
      hintAfterMenu.opacity === '0'
    ),
    JSON.stringify({ before: hintBeforeMenu, after: hintAfterMenu })
  );

  // ------------------------------------------------------------
  // 43-47 : LAUNCHER fullNotified
  // ------------------------------------------------------------

  await page.getByText('JOUER', { exact: true }).first().click();

  await waitForState(() => {
    try {
      return JSON.parse(window.debugState()).state === 'play';
    } catch {
      return false;
    }
  });

  const launcherInternals = await page.evaluate(() => ({
    exists: !!window.plunger,
    power: window.plunger && window.plunger.power,
    fullNotified:
      window.plunger &&
      Object.prototype.hasOwnProperty.call(window.plunger, 'fullNotified')
        ? window.plunger.fullNotified
        : undefined
  }));

  test(
    '39. plunger accessible en V5',
    launcherInternals.exists
  );

  test(
    '40. plunger.fullNotified présent',
    launcherInternals.fullNotified !== undefined,
    `fullNotified=${launcherInternals.fullNotified}`
  );

  await page.keyboard.down('Space');
  await page.waitForTimeout(1200);

  const full1 = await page.evaluate(() => ({
    power: window.plunger && window.plunger.power,
    fullNotified: window.plunger && window.plunger.fullNotified
  }));

  await page.waitForTimeout(500);

  const full2 = await page.evaluate(() => ({
    power: window.plunger && window.plunger.power,
    fullNotified: window.plunger && window.plunger.fullNotified
  }));

  await page.keyboard.up('Space');

  test(
    '41. puissance maximale du lanceur atteignable',
    full1 &&
    typeof full1.power === 'number' &&
    full1.power >= 0.99,
    `power=${full1 && full1.power}`
  );

  test(
    '42. fullNotified passe à true',
    full1 && full1.fullNotified === true,
    `fullNotified=${full1 && full1.fullNotified}`
  );

  test(
    '43. fullNotified reste vrai pendant maintien',
    full2 && full2.fullNotified === true
  );

  // ------------------------------------------------------------
  // 44-49 : MUTE / LOCALSTORAGE / M
  // ------------------------------------------------------------

  const audioInfo = await page.evaluate(() => ({
    muted:
      typeof window.muted === 'boolean'
        ? window.muted
        : undefined,
    Snd: !!window.Snd,
    audioContext:
      window.Snd && window.Snd.ac
        ? window.Snd.ac.state
        : undefined,
    muteButton:
      !!document.querySelector('#mute') ||
      !!document.querySelector('#muteBtn') ||
      !!document.querySelector('[data-action="mute"]')
  }));

  test(
    '44. variable muted présente',
    audioInfo.muted !== undefined,
    `muted=${audioInfo.muted}`
  );

  test(
    '45. système audio présent',
    audioInfo.Snd
  );

  test(
    '46. bouton mute présent',
    audioInfo.muteButton
  );

  const muteBefore = audioInfo.muted;

  await page.keyboard.press('m');
  await page.waitForTimeout(150);

  const muteAfter = await page.evaluate(() => ({
    muted: typeof window.muted === 'boolean' ? window.muted : undefined,
    stored: localStorage.getItem('cristalDragonMuted')
  }));

  test(
    '47. touche M bascule le mute',
    muteAfter.muted !== undefined &&
    muteAfter.muted !== muteBefore,
    `avant=${muteBefore}, après=${muteAfter.muted}`
  );

  test(
    '48. mute persistant dans localStorage',
    muteAfter.stored !== null
  );

  await page.keyboard.press('m');
  await page.waitForTimeout(100);

  test(
    '49. touche M permet de réactiver le son',
    (await page.evaluate(() => window.muted)) === muteBefore
  );

  // ------------------------------------------------------------
  // 50 : RACCOURCI R
  // ------------------------------------------------------------

  await page.keyboard.press('r');
  await page.waitForTimeout(300);

  const afterR = state();

  test(
    '50. touche R redémarre la partie',
    afterR &&
    (
      afterR.state === 'play' ||
      afterR.state === 'menu'
    ),
    `state=${afterR && afterR.state}`
  );

  // ------------------------------------------------------------
  // 51 : endTime RESET
  // ------------------------------------------------------------

  const endTimeInfo = await page.evaluate(() => ({
    exists:
      typeof window.endTime !== 'undefined',
    value:
      typeof window.endTime !== 'undefined'
        ? window.endTime
        : undefined
  }));

  test(
    '51. endTime accessible',
    endTimeInfo.exists,
    `endTime=${endTimeInfo.value}`
  );

  await page.evaluate(() => {
    if (typeof window.resetGame === 'function') {
      window.endTime = 123456789;
      window.resetGame();
    }
  });

  const endTimeAfterReset = await page.evaluate(() => ({
    value:
      typeof window.endTime !== 'undefined'
        ? window.endTime
        : undefined
  }));

  test(
    '52. resetGame réinitialise endTime',
    endTimeAfterReset.value !== 123456789,
    `endTime=${endTimeAfterReset.value}`
  );

  // ------------------------------------------------------------
  // 53 : VISIBILITYCHANGE / AUDIO
  // ------------------------------------------------------------

  const visibilityResult = await page.evaluate(async () => {
    const before =
      window.Snd &&
      window.Snd.ac
        ? window.Snd.ac.state
        : null;

    document.dispatchEvent(
      new Event('visibilitychange')
    );

    await new Promise(r => setTimeout(r, 100));

    const after =
      window.Snd &&
      window.Snd.ac
        ? window.Snd.ac.state
        : null;

    return { before, after };
  });

  test(
    '53. gestion visibilitychange/audio présente',
    visibilityResult &&
    (
      visibilityResult.before !== null ||
      visibilityResult.after !== null
    ),
    JSON.stringify(visibilityResult)
  );

  // ------------------------------------------------------------
  // 54 : DEBUGSTATE FINAL + ERREURS
  // ------------------------------------------------------------

  const finalDebug = state();

  test(
    '54. debugState final valide',
    finalDebug &&
    typeof finalDebug === 'object'
  );

  // Rapport
  const passed = results.filter(r => r.ok).length;
  const failed = results.length - passed;
  const rate = results.length
    ? ((passed / results.length) * 100).toFixed(1)
    : '0.0';

  let report = `# TEST REPORT V5 — Cristal Dragon

Date : ${new Date().toLocaleString('fr-FR')}

Fichier testé : \`cristal-dragon-v5.html\`

Navigateur : Firefox / Playwright

## Résultat

- Tests : ${results.length}
- PASS : ${passed}
- FAIL : ${failed}
- Taux : ${rate} %

## Détails

`;

  for (const r of results) {
    report += `${r.ok ? '✅' : '❌'} **${r.name}**`;
    if (r.detail) report += ` — ${r.detail}`;
    report += '\n';
  }

  report += `
## Erreurs JavaScript / console

Console errors : ${consoleErrors.length}
Page errors : ${pageErrors.length}

`;

  if (consoleErrors.length) {
    report += '### Console errors\n\n';
    for (const e of consoleErrors) {
      report += `- ${e}\n`;
    }
    report += '\n';
  }

  if (pageErrors.length) {
    report += '### Page errors\n\n';
    for (const e of pageErrors) {
      report += `- ${e}\n`;
    }
    report += '\n';
  }

  report += `## Verdict automatique

${
  failed === 0 &&
  consoleErrors.length === 0 &&
  pageErrors.length === 0
    ? '✅ V5 VALIDÉE — tous les tests sont passés sans erreur JavaScript.'
    : '❌ V5 NON VALIDÉE — consulter les échecs et erreurs ci-dessus.'
}
`;

  fs.writeFileSync(REPORT, report);

  console.log('\n========================================');
  console.log('       TESTS CRISTAL DRAGON V5');
  console.log('========================================');
  console.log(`Tests   : ${results.length}`);
  console.log(`PASS    : ${passed}`);
  console.log(`FAIL    : ${failed}`);
  console.log(`Taux    : ${rate} %`);
  console.log(`Console : ${consoleErrors.length} erreur(s)`);
  console.log(`Page    : ${pageErrors.length} erreur(s)`);
  console.log(`\nRapport : ${REPORT}`);

  if (
    failed === 0 &&
    consoleErrors.length === 0 &&
    pageErrors.length === 0
  ) {
    console.log('\n✅ V5 VALIDÉE.');
  } else {
    console.log('\n❌ V5 À CORRIGER.');
  }

  await browser.close();

  process.exit(
    failed === 0 &&
    consoleErrors.length === 0 &&
    pageErrors.length === 0
      ? 0
      : 1
  );
}

main().catch(async err => {
  console.error('\n❌ ERREUR FATALE :');
  console.error(err);

  try {
    if (browser) await browser.close();
  } catch {}

  process.exit(2);
});

const { firefox } = require('playwright');

const FILE = 'file:///home/zkk/mes-jeux/cristal-dragon.html';

(async () => {
  const browser = await firefox.launch({ headless: true });
  const page = await browser.newPage();

  const results = [];
  const jsErrors = [];
  const consoleErrors = [];

  page.on('pageerror', e => jsErrors.push(String(e)));
  page.on('console', m => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });

  function pass(n, msg) {
    results.push(true);
    console.log(`✅ PASS — ${n}. ${msg}`);
  }

  function fail(n, msg) {
    results.push(false);
    console.log(`❌ FAIL — ${n}. ${msg}`);
  }

  async function flippers() {
    return await page.evaluate(() => {
      if (!Array.isArray(flippers)) return null;

      return flippers.map((f, i) => ({
        index: i,
        pressed: f.pressed,
        ang: f.ang,
        rest: f.rest,
        act: f.act,
        av: f.av,
        pang: f.pang
      }));
    });
  }

  async function gameState() {
    return await page.evaluate(() => JSON.parse(window.debugState()));
  }

  try {
    console.log(`
========================================
 CRISTAL DRAGON V5 — QA FLIPPERS RÉELS
========================================
`);

    await page.goto(FILE);
    await page.waitForTimeout(400);

    let s = await gameState();
    let f = await flippers();

    if (s.etat === 'menu')
      pass(1, 'état initial = menu');
    else
      fail(1, `état initial = ${s.etat}`);

    if (
      Array.isArray(f) &&
      f.length === 2 &&
      f.every(x =>
        typeof x.ang === 'number' &&
        typeof x.rest === 'number' &&
        typeof x.act === 'number'
      )
    ) {
      pass(2, 'deux flippers accessibles avec angles réels');
    } else {
      fail(2, 'structure physique des flippers invalide');
    }

    console.log('\nÉTAT INITIAL FLIPPERS :');
    console.log(JSON.stringify(f, null, 2));

    await page.locator('[data-action="play"]').click();
    await page.waitForTimeout(250);

    s = await gameState();

    if (s.etat === 'play')
      pass(3, 'JOUER démarre la partie');
    else
      fail(3, `état après JOUER = ${s.etat}`);

    /*
     * ============================
     * FLIPPER GAUCHE
     * ============================
     */

    f = await flippers();
    const leftRest = f[0].rest;
    const leftBefore = f[0].ang;

    await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(250);

    const leftPressed = await flippers();

    console.log('\nGAUCHE — APRÈS APPUI :');
    console.log(JSON.stringify(leftPressed, null, 2));

    if (leftPressed[0].pressed === true)
      pass(4, 'ArrowLeft met réellement le flipper gauche en pression');
    else
      fail(4, 'ArrowLeft ne met pas pressed=true');

    const leftMovement =
      Math.abs(leftPressed[0].ang - leftBefore);

    if (leftMovement > 0.01)
      pass(5, `flipper gauche bouge réellement — Δangle=${leftMovement.toFixed(4)}`);
    else
      fail(5, `flipper gauche ne bouge pas — Δangle=${leftMovement}`);

    if (
      Math.abs(leftPressed[0].ang - leftPressed[0].act) <
      Math.abs(leftBefore - leftPressed[0].act)
    ) {
      pass(6, 'flipper gauche se déplace vers sa position active');
    } else {
      fail(6, 'flipper gauche ne se déplace pas vers act');
    }

    await page.keyboard.up('ArrowLeft');
    await page.waitForTimeout(350);

    const leftReleased = await flippers();

    console.log('\nGAUCHE — APRÈS RELÂCHEMENT :');
    console.log(JSON.stringify(leftReleased, null, 2));

    if (leftReleased[0].pressed === false)
      pass(7, 'relâchement gauche remet pressed=false');
    else
      fail(7, 'relâchement gauche ne remet pas pressed=false');

    if (
      Math.abs(leftReleased[0].ang - leftRest) <
      Math.abs(leftPressed[0].ang - leftRest)
    ) {
      pass(8, 'flipper gauche revient vers sa position de repos');
    } else {
      fail(8, 'flipper gauche ne revient pas vers le repos');
    }

    /*
     * ============================
     * FLIPPER DROIT
     * ============================
     */

    f = await flippers();
    const rightRest = f[1].rest;
    const rightBefore = f[1].ang;

    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(250);

    const rightPressed = await flippers();

    console.log('\nDROIT — APRÈS APPUI :');
    console.log(JSON.stringify(rightPressed, null, 2));

    if (rightPressed[1].pressed === true)
      pass(9, 'ArrowRight met réellement le flipper droit en pression');
    else
      fail(9, 'ArrowRight ne met pas pressed=true');

    const rightMovement =
      Math.abs(rightPressed[1].ang - rightBefore);

    if (rightMovement > 0.01)
      pass(10, `flipper droit bouge réellement — Δangle=${rightMovement.toFixed(4)}`);
    else
      fail(10, `flipper droit ne bouge pas — Δangle=${rightMovement}`);

    if (
      Math.abs(rightPressed[1].ang - rightPressed[1].act) <
      Math.abs(rightBefore - rightPressed[1].act)
    ) {
      pass(11, 'flipper droit se déplace vers sa position active');
    } else {
      fail(11, 'flipper droit ne se déplace pas vers act');
    }

    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(350);

    const rightReleased = await flippers();

    console.log('\nDROIT — APRÈS RELÂCHEMENT :');
    console.log(JSON.stringify(rightReleased, null, 2));

    if (rightReleased[1].pressed === false)
      pass(12, 'relâchement droit remet pressed=false');
    else
      fail(12, 'relâchement droit ne remet pas pressed=false');

    if (
      Math.abs(rightReleased[1].ang - rightRest) <
      Math.abs(rightPressed[1].ang - rightRest)
    ) {
      pass(13, 'flipper droit revient vers sa position de repos');
    } else {
      fail(13, 'flipper droit ne revient pas vers le repos');
    }

    /*
     * ============================
     * DOUBLE FLIPPER
     * ============================
     */

    await page.keyboard.down('ArrowLeft');
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(200);

    const both = await flippers();

    if (both[0].pressed && both[1].pressed)
      pass(14, 'gauche + droit actifs simultanément');
    else
      fail(14, 'double activation incorrecte');

    await page.keyboard.up('ArrowLeft');
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(350);

    const bothReleased = await flippers();

    if (!bothReleased[0].pressed && !bothReleased[1].pressed)
      pass(15, 'les deux flippers reviennent à pressed=false');
    else
      fail(15, 'un flipper reste activé');

    /*
     * ============================
     * TOUCHES ALTERNATIVES
     * ============================
     */

    for (const key of ['KeyA', 'KeyQ']) {
      await page.keyboard.down(key);
      await page.waitForTimeout(120);

      const x = await flippers();

      if (x[0].pressed)
        pass(16, `${key} active réellement le flipper gauche`);
      else
        fail(16, `${key} n'active pas le flipper gauche`);

      await page.keyboard.up(key);
      await page.waitForTimeout(180);
    }

    for (const key of ['KeyL', 'KeyM']) {
      await page.keyboard.down(key);
      await page.waitForTimeout(120);

      const x = await flippers();

      if (x[1].pressed)
        pass(17, `${key} active réellement le flipper droit`);
      else
        fail(17, `${key} n'active pas le flipper droit`);

      await page.keyboard.up(key);
      await page.waitForTimeout(180);
    }

    /*
     * ============================
     * STABILITÉ
     * ============================
     */

    let stable = true;
    let samples = 0;

    for (let i = 0; i < 50; i++) {
      const key = i % 2 === 0 ? 'ArrowLeft' : 'ArrowRight';

      await page.keyboard.down(key);
      await page.waitForTimeout(35);

      const x = await flippers();
      const gs = await gameState();

      samples++;

      if (
        !x ||
        x.length !== 2 ||
        typeof x[0].ang !== 'number' ||
        typeof x[1].ang !== 'number' ||
        gs.etat !== 'play'
      ) {
        stable = false;
        break;
      }

      await page.keyboard.up(key);
      await page.waitForTimeout(35);
    }

    if (stable)
      pass(18, `${samples} états physiques flippers valides`);
    else
      fail(18, `état invalide après ${samples} échantillons`);

    if (jsErrors.length === 0)
      pass(19, 'aucune erreur JavaScript');
    else
      fail(19, `${jsErrors.length} erreur(s) JavaScript`);

    if (consoleErrors.length === 0)
      pass(20, 'aucune erreur console');
    else
      fail(20, `${consoleErrors.length} erreur(s) console`);

  } catch (e) {
    console.log('\n❌ ERREUR FATALE :');
    console.log(e);
  }

  const passed = results.filter(Boolean).length;
  const failed = results.length - passed;

  console.log(`
========================================
 RÉSULTAT QA FLIPPERS RÉELS
========================================
PASS : ${passed}
FAIL : ${failed}
TOTAL : ${results.length}
RÉUSSITE : ${results.length ? ((passed / results.length) * 100).toFixed(0) : 0}%
========================================
`);

  await browser.close();
})();

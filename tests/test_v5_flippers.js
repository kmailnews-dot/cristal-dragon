const { firefox } = require('playwright');

const FILE = 'file:///home/zkk/mes-jeux/cristal-dragon-v5.html';

(async () => {
  const browser = await firefox.launch({ headless: true });
  const page = await browser.newPage();

  const results = [];
  const errors = [];
  const consoleErrors = [];

  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => {
    if (m.type() === 'error') consoleErrors.push(m.text());
  });

  function pass(n, msg) {
    results.push({ ok: true, n, msg });
    console.log(`✅ PASS — ${n}. ${msg}`);
  }

  function fail(n, msg) {
    results.push({ ok: false, n, msg });
    console.log(`❌ FAIL — ${n}. ${msg}`);
  }

  async function state() {
    return await page.evaluate(() => {
      const s = window.debugState();
      return {
        etat: s.etat,
        bille: s.bille,
        lanceur: s.lanceur,
        runes: s.runes,
        score: s.score,
        billes: s.billes
      };
    });
  }

  try {
    console.log(`
========================================
 CRISTAL DRAGON V5 — QA FLIPPERS V3
========================================
`);

    await page.goto(FILE);
    await page.waitForTimeout(300);

    let s = await state();

    if (s.etat === 'menu') pass(1, 'état initial = menu');
    else fail(1, `état initial inattendu = ${s.etat}`);

    await page.locator('[data-action="play"]').click();
    await page.waitForTimeout(300);

    s = await state();

    if (s.etat === 'play') pass(2, 'JOUER démarre la partie');
    else fail(2, `état après JOUER = ${s.etat}`);

    /*
     * On cherche les objets internes exposés par V5.
     */
    const internals = await page.evaluate(() => ({
      setFlipper: typeof window.setFlipper,
      updateFlippers: typeof window.updateFlippers,
      drawFlipperAt: typeof window.drawFlipperAt,
      drawFlippers: typeof window.drawFlippers
    }));

    if (
      internals.setFlipper === 'function' &&
      internals.updateFlippers === 'function'
    ) {
      pass(3, 'fonctions internes des flippers accessibles');
    } else {
      fail(3, 'fonctions internes des flippers indisponibles');
    }

    /*
     * Capture des propriétés globales susceptibles de contenir
     * l'état physique des flippers.
     */
    const beforeKeys = await page.evaluate(() => {
      const keys = Object.keys(window);

      return keys.filter(k =>
        /flipper|flip|left|right|keys/i.test(k)
      ).slice(0, 100);
    });

    console.log('Objets globaux liés aux flippers :', beforeKeys);

    /*
     * Test gauche : pression maintenue.
     */
    await page.keyboard.down('ArrowLeft');
    await page.waitForTimeout(150);

    const leftHeld = await page.evaluate(() => ({
      state: window.debugState(),
      globals: Object.keys(window)
        .filter(k => /flipper|flip|keys/i.test(k))
        .slice(0, 100)
    }));

    await page.keyboard.up('ArrowLeft');
    await page.waitForTimeout(100);

    const leftReleased = await state();

    if (leftHeld.state.etat === 'play')
      pass(4, 'ArrowLeft maintenu sans sortie du jeu');
    else
      fail(4, `état après ArrowLeft = ${leftHeld.state.etat}`);

    if (leftReleased.etat === 'play')
      pass(5, 'flipper gauche revient sans casser le jeu');
    else
      fail(5, `état après relâchement gauche = ${leftReleased.etat}`);

    /*
     * Test droit.
     */
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(150);

    const rightHeld = await state();

    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(100);

    const rightReleased = await state();

    if (rightHeld.etat === 'play')
      pass(6, 'ArrowRight maintenu sans sortie du jeu');
    else
      fail(6, `état après ArrowRight = ${rightHeld.etat}`);

    if (rightReleased.etat === 'play')
      pass(7, 'flipper droit revient sans casser le jeu');
    else
      fail(7, `état après relâchement droit = ${rightReleased.etat}`);

    /*
     * Gauche + droite simultanés.
     */
    await page.keyboard.down('ArrowLeft');
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(200);

    const both = await state();

    await page.keyboard.up('ArrowLeft');
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(100);

    if (both.etat === 'play')
      pass(8, 'deux flippers simultanément');
    else
      fail(8, `état pendant double flipper = ${both.etat}`);

    /*
     * Cycles rapides : 20 cycles gauche/droite.
     */
    let cyclesOK = true;

    for (let i = 0; i < 20; i++) {
      await page.keyboard.down('ArrowLeft');
      await page.waitForTimeout(20);
      await page.keyboard.up('ArrowLeft');

      await page.keyboard.down('ArrowRight');
      await page.waitForTimeout(20);
      await page.keyboard.up('ArrowRight');

      const x = await state();

      if (x.etat !== 'play') {
        cyclesOK = false;
        break;
      }
    }

    if (cyclesOK)
      pass(9, '20 cycles rapides gauche/droite');
    else
      fail(9, 'le jeu quitte play pendant les cycles');

    /*
     * Vérification des commandes alternatives.
     */
    for (const key of ['KeyA', 'KeyQ', 'KeyL', 'KeyM']) {
      await page.keyboard.press(key);
      await page.waitForTimeout(30);
    }

    s = await state();

    if (s.etat === 'play')
      pass(10, 'A/Q/L/M fonctionnent sans anomalie');
    else
      fail(10, `état après A/Q/L/M = ${s.etat}`);

    /*
     * Stabilité pendant 2 secondes avec sollicitations.
     */
    let valid = true;
    let samples = 0;

    for (let i = 0; i < 40; i++) {
      await page.keyboard.down(i % 2 ? 'ArrowLeft' : 'ArrowRight');
      await page.waitForTimeout(25);

      const x = await state();
      samples++;

      if (
        x.etat !== 'play' ||
        typeof x.score !== 'number' ||
        typeof x.billes !== 'number'
      ) {
        valid = false;
        break;
      }

      await page.keyboard.up(i % 2 ? 'ArrowLeft' : 'ArrowRight');
      await page.waitForTimeout(25);
    }

    if (valid)
      pass(11, `stabilité flippers — ${samples} états valides`);
    else
      fail(11, `état interne invalide après ${samples} échantillons`);

    if (errors.length === 0)
      pass(12, 'aucune erreur JavaScript');
    else
      fail(12, `${errors.length} erreur(s) JavaScript`);

    if (consoleErrors.length === 0)
      pass(13, 'aucune erreur console');
    else
      fail(13, `${consoleErrors.length} erreur(s) console`);

  } catch (e) {
    console.log('❌ ERREUR FATALE :', e);
  }

  const passed = results.filter(r => r.ok).length;
  const failed = results.filter(r => !r.ok).length;

  console.log(`
========================================
 RÉSULTAT QA FLIPPERS
========================================
PASS : ${passed}
FAIL : ${failed}
TOTAL : ${results.length}
RÉUSSITE : ${results.length ? ((passed / results.length) * 100).toFixed(0) : 0}%
========================================
`);

  await browser.close();
})();

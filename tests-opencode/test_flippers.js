const { firefox } = require('@playwright/test');

(async () => {
  const browser = await firefox.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 }
  });

  const errors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`[Console] ${msg.text()}`);
    }
  });

  page.on('pageerror', error => {
    errors.push(`[JavaScript] ${error.message}`);
  });

  await page.goto('file:///home/zkk/mes-jeux/cristal-dragon-v4.html');

  await page.getByRole('button', { name: 'JOUER' }).click();

  await page.waitForFunction(() => {
    const s = JSON.parse(window.debugState());
    return s.etat === 'play' && s.bille && s.bille.etat === 'lane';
  });

  console.log('\n===== TEST FLIPPERS =====');

  // Récupération de l'état interne des flippers
  const getFlippers = () => page.evaluate(() =>
    flippers.map(f => ({
      pressed: f.pressed,
      ang: f.ang,
      pang: f.pang
    }))
  );

  const initial = await getFlippers();

  console.log('\nÉTAT INITIAL :');
  console.log(initial);

  // =========================
  // FLIPPER GAUCHE
  // =========================

  await page.keyboard.down('ArrowLeft');
  await page.waitForTimeout(150);

  const leftPressed = await getFlippers();

  await page.keyboard.up('ArrowLeft');
  await page.waitForTimeout(200);

  const leftReleased = await getFlippers();

  // =========================
  // FLIPPER DROIT
  // =========================

  await page.keyboard.down('ArrowRight');
  await page.waitForTimeout(150);

  const rightPressed = await getFlippers();

  await page.keyboard.up('ArrowRight');
  await page.waitForTimeout(200);

  const rightReleased = await getFlippers();

  console.log('\nGAUCHE ENFONCÉ :');
  console.log(leftPressed);

  console.log('\nGAUCHE RELÂCHÉ :');
  console.log(leftReleased);

  console.log('\nDROITE ENFONCÉ :');
  console.log(rightPressed);

  console.log('\nDROITE RELÂCHÉ :');
  console.log(rightReleased);

  const checks = [];

  // Partie active
  const game = await page.evaluate(() =>
    JSON.parse(window.debugState())
  );

  checks.push({
    nom: 'Partie en cours',
    ok: game.etat === 'play'
  });

  // Gauche : pressed doit être true pendant l'appui
  checks.push({
    nom: 'Flipper gauche activé',
    ok: leftPressed[0].pressed === true
  });

  // Gauche : angle doit avoir changé
  checks.push({
    nom: 'Flipper gauche bouge',
    ok: Math.abs(leftPressed[0].ang - initial[0].ang) > 0.01
  });

  // Gauche : retour après relâchement
  checks.push({
    nom: 'Flipper gauche revient',
    ok: Math.abs(leftReleased[0].ang - initial[0].ang) < 0.15
  });

  // Droite : pressed doit être true pendant l'appui
  checks.push({
    nom: 'Flipper droit activé',
    ok: rightPressed[1].pressed === true
  });

  // Droite : angle doit avoir changé
  checks.push({
    nom: 'Flipper droit bouge',
    ok: Math.abs(rightPressed[1].ang - initial[1].ang) > 0.01
  });

  // Droite : retour après relâchement
  checks.push({
    nom: 'Flipper droit revient',
    ok: Math.abs(rightReleased[1].ang - initial[1].ang) < 0.15
  });

  // Pas d'erreurs
  checks.push({
    nom: 'Aucune erreur JavaScript/console',
    ok: errors.length === 0
  });

  console.log('\n===== ASSERTIONS =====');

  for (const c of checks) {
    console.log(`${c.ok ? 'PASS' : 'FAIL'} — ${c.nom}`);
  }

  console.log(
    `\nRÉSULTAT : ${checks.filter(c => c.ok).length}/${checks.length} tests réussis`
  );

  if (errors.length) {
    console.log('\nERREURS :');
    errors.forEach(e => console.log(e));
  }

  await page.screenshot({
    path: 'screenshots/cristal-dragon-flippers.png',
    fullPage: true
  });

  await browser.close();

  process.exit(checks.every(c => c.ok) ? 0 : 1);
})();

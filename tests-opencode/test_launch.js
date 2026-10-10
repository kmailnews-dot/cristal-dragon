const { firefox } = require('@playwright/test');

(async () => {
  const browser = await firefox.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 }
  });

  const errors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`[Console] ${msg.text()}`);
  });

  page.on('pageerror', error => {
    errors.push(`[JavaScript] ${error.message}`);
  });

  await page.goto('file:///home/zkk/mes-jeux/cristal-dragon-v4.html');
  await page.getByRole('button', { name: 'JOUER' }).click();

  // Attendre que la bille soit réellement disponible dans le lanceur
  await page.waitForFunction(() => {
    if (typeof window.debugState !== 'function') return false;
    const s = JSON.parse(window.debugState());
    return s.etat === 'play' && s.bille && s.bille.etat === 'lane';
  }, null, { timeout: 5000 });

  const before = await page.evaluate(() => JSON.parse(window.debugState()));

  // Maintenir ESPACE pendant 800 ms
  await page.keyboard.down('Space');
  await page.waitForTimeout(800);

  const charged = await page.evaluate(() => JSON.parse(window.debugState()));

  // Relâcher ESPACE = lancement
  await page.keyboard.up('Space');
  await page.waitForTimeout(100);

  const after = await page.evaluate(() => JSON.parse(window.debugState()));

  console.log('\n===== TEST LANCEMENT =====');

  console.log('\nAVANT CHARGE :');
  console.log(before);

  console.log('\nPENDANT CHARGE :');
  console.log(charged);

  console.log('\nAPRÈS RELÂCHEMENT :');
  console.log(after);

  console.log('\n===== ASSERTIONS =====');

  const checks = [
    ['Partie en cours', before.etat === 'play'],
    ['Bille dans le lanceur', before.bille?.etat === 'lane'],
    ['Lanceur chargé', charged.lanceur?.charge === true],
    ['Puissance > 0', charged.lanceur?.power > 0],
    ['Bille lancée', after.bille?.etat === 'live'],
    ['Aucune erreur JavaScript/console', errors.length === 0]
  ];

  let passed = 0;

  for (const [name, ok] of checks) {
    console.log(`${ok ? 'PASS' : 'FAIL'} — ${name}`);
    if (ok) passed++;
  }

  console.log(`\nRÉSULTAT : ${passed}/${checks.length} tests réussis`);

  if (errors.length) {
    console.log('\nERREURS :');
    errors.forEach(error => console.log(error));
  }

  await page.screenshot({
    path: 'screenshots/cristal-dragon-launch.png',
    fullPage: true
  });

  await browser.close();

  process.exit(passed === checks.length ? 0 : 1);
})();

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
  await page.waitForTimeout(500);

  const before = await page.evaluate(() => JSON.parse(window.debugState()));

  await page.getByRole('button', { name: 'JOUER' }).click();

  await page.waitForTimeout(500);

  const after = await page.evaluate(() => JSON.parse(window.debugState()));

  console.log('\n===== TEST DÉMARRAGE =====');
  console.log('\nAVANT :');
  console.log(before);

  console.log('\nAPRÈS JOUER :');
  console.log(after);

  console.log('\n===== ASSERTIONS =====');

  const checks = [
    ['État = play', after.etat === 'play'],
    ['3 billes', after.billes === 3],
    ['Score = 0', after.score === 0],
    ['Multiplicateur = 1', after.mult === 1],
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
    path: 'screenshots/cristal-dragon-start.png',
    fullPage: true
  });

  await browser.close();

  process.exit(passed === checks.length ? 0 : 1);
})();

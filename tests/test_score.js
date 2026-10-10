const { firefox } = require('playwright');

(async () => {
  const browser = await firefox.launch({ headless: true });
  const page = await browser.newPage();

  const errors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') errors.push('Console: ' + msg.text());
  });

  page.on('pageerror', err => {
    errors.push('Page: ' + err.message);
  });

  await page.goto(
    'file:///home/zkk/mes-jeux/cristal-dragon-v4.html'
  );

  await page.getByRole('button', { name: 'JOUER' }).click();

  await page.waitForFunction(() => {
    const s = JSON.parse(window.debugState());
    return s.etat === 'play';
  });

  console.log('\n===== TEST SCORE =====');

  const initial = await page.evaluate(() =>
    JSON.parse(window.debugState())
  );

  console.log('\nÉTAT INITIAL :');
  console.log(initial);

  // Test d'un score simple de 100 points
  const score1 = await page.evaluate(() => {
    addScore(100);
    return JSON.parse(window.debugState());
  });

  console.log('\nAPRÈS +100 :');
  console.log(score1);

  // Test du multiplicateur ×2
  const score2 = await page.evaluate(() => {
    mult = 2;
    addScore(100);
    return JSON.parse(window.debugState());
  });

  console.log('\nAPRÈS +100 AVEC ×2 :');
  console.log(score2);

  // Assertions
  let passed = 0;
  let failed = 0;

  function test(condition, label) {
    if (condition) {
      console.log('PASS — ' + label);
      passed++;
    } else {
      console.log('FAIL — ' + label);
      failed++;
    }
  }

  test(initial.score === 0, 'Score initial = 0');
  test(score1.score === 100, 'Score après +100 = 100');
  test(score2.score === 300, 'Score avec ×2 : +200');
  test(score2.mult === 2, 'Multiplicateur = ×2');
  test(score2.etat === 'play', 'Partie toujours en cours');
  test(errors.length === 0, 'Aucune erreur JavaScript/console');

  console.log(`\nRÉSULTAT : ${passed}/${passed + failed} tests réussis`);

  await browser.close();

  process.exit(failed === 0 ? 0 : 1);
})();

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

  console.log('\n===== TEST RUNES =====');

  const initial = await page.evaluate(() =>
    JSON.parse(window.debugState())
  );

  console.log('\nÉTAT INITIAL :');
  console.log(initial);

  // Frappe rune 1
  const rune1 = await page.evaluate(() => {
    hitRune(0);
    return JSON.parse(window.debugState());
  });

  console.log('\nAPRÈS RUNE 1 :');
  console.log(rune1);

  // Frappe rune 2
  const rune2 = await page.evaluate(() => {
    hitRune(1);
    return JSON.parse(window.debugState());
  });

  console.log('\nAPRÈS RUNE 2 :');
  console.log(rune2);

  // Frappe rune 3
  const rune3 = await page.evaluate(() => {
    hitRune(2);
    return JSON.parse(window.debugState());
  });

  console.log('\nAPRÈS RUNE 3 :');
  console.log(rune3);

  // Test d'un score après activation du multiplicateur
  const afterMult = await page.evaluate(() => {
    addScore(100);
    return JSON.parse(window.debugState());
  });

  console.log('\nAPRÈS +100 AVEC MULTIPLICATEUR :');
  console.log(afterMult);

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

  test(rune1.score === 250, 'Rune 1 = +250');

  test(rune2.score === 500, 'Rune 2 = +250');

  test(rune3.score === 1750, 'Rune 3 + bonus = +1250');

  test(
    rune3.runes.every(r => r === false),
    'Les 3 runes sont abaissées'
  );

  test(rune3.mult === 2, 'Multiplicateur activé à ×2');

  test(rune3.multT === 25, 'Durée du multiplicateur = 25');

  test(afterMult.score === 1950, '100 points deviennent +200 avec ×2');

  test(afterMult.etat === 'play', 'Partie toujours en cours');

  test(errors.length === 0, 'Aucune erreur JavaScript/console');

  console.log(
    `\nRÉSULTAT : ${passed}/${passed + failed} tests réussis`
  );

  await browser.close();

  process.exit(failed === 0 ? 0 : 1);
})();

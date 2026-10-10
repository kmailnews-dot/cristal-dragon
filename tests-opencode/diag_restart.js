const { firefox } = require('@playwright/test');

(async () => {
  const browser = await firefox.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('file:///home/zkk/mes-jeux/cristal-dragon-v5-opencode.html');
  await page.waitForLoadState('domcontentloaded');

  const play = page.locator('button:visible').filter({ hasText: 'JOUER' }).first();
  await play.click();
  await page.waitForTimeout(300);

  console.log('\n--- ETAT PLAY ---');
  console.log(await page.evaluate(() => window.debugState()));

  console.log('\n--- BOUTONS PLAY ---');
  console.log(await page.locator('button').evaluateAll(btns =>
    btns.map((b, i) => ({
      i,
      text: b.innerText.trim(),
      action: b.getAttribute('data-action'),
      id: b.id,
      visible: !!(b.offsetWidth || b.offsetHeight || b.getClientRects().length),
      display: getComputedStyle(b).display,
      visibility: getComputedStyle(b).visibility
    }))
  ));

  const pause = page.locator('#btnPause');

  if (await pause.count()) {
    await pause.click();
    await page.waitForTimeout(150);
  }

  console.log('\n--- ETAT PAUSE ---');
  console.log(await page.evaluate(() => window.debugState()));

  console.log('\n--- BOUTONS PAUSE ---');
  console.log(await page.locator('button').evaluateAll(btns =>
    btns.map((b, i) => ({
      i,
      text: b.innerText.trim(),
      action: b.getAttribute('data-action'),
      id: b.id,
      visible: !!(b.offsetWidth || b.offsetHeight || b.getClientRects().length),
      display: getComputedStyle(b).display,
      visibility: getComputedStyle(b).visibility
    }))
  ));

  const restartPause = page.locator(
    'section[data-p="pause"] [data-action="restart"]:visible'
  );

  console.log('\n--- RECOMMENCER DANS PAUSE ---');
  console.log('count=', await restartPause.count());

  if (await restartPause.count()) {
    await restartPause.click();
    await page.waitForTimeout(300);

    console.log('\n--- ETAT APRES RECOMMENCER ---');
    console.log(await page.evaluate(() => window.debugState()));
  }

  console.log('\n--- BOUTONS APRES RECOMMENCER ---');
  console.log(await page.locator('button').evaluateAll(btns =>
    btns.map((b, i) => ({
      i,
      text: b.innerText.trim(),
      action: b.getAttribute('data-action'),
      id: b.id,
      visible: !!(b.offsetWidth || b.offsetHeight || b.getClientRects().length),
      display: getComputedStyle(b).display,
      visibility: getComputedStyle(b).visibility
    }))
  ));

  await browser.close();
})();

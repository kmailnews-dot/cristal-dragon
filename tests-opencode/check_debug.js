const { firefox } = require('@playwright/test');

(async () => {
  const browser = await firefox.launch({ headless: true });
  const page = await browser.newPage();

  await page.goto('file:///home/zkk/mes-jeux/cristal-dragon-v4.html', {
    waitUntil: 'load'
  });

  await page.waitForTimeout(1000);

  const result = await page.evaluate(() => {
    if (typeof window.debugState !== 'function') {
      return {
        exists: false,
        value: null
      };
    }

    return {
      exists: true,
      value: window.debugState()
    };
  });

  console.log(JSON.stringify(result, null, 2));

  await browser.close();
})();

const { firefox } = require('playwright');

const GAME = 'file:///home/zkk/mes-jeux/cristal-dragon-v5-opencode.html';

(async () => {
  const browser = await firefox.launch({ headless: true });
  const page = await browser.newPage();

  const consoleErrors = [];
  const pageErrors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });

  page.on('pageerror', err => {
    pageErrors.push(String(err));
  });

  console.log('');
  console.log('========================================');
  console.log(' DIAGNOSTIC CRISTAL DRAGON V5');
  console.log('========================================');
  console.log('');

  try {
    await page.goto(GAME, { waitUntil: 'load' });
    console.log('✅ Fichier V5 chargé');
  } catch (e) {
    console.log('❌ Erreur chargement : ' + e.message);
  }

  await page.waitForTimeout(1000);

  console.log('');
  console.log('=== JAVASCRIPT ===');

  const info = await page.evaluate(() => {
    let debugResult = null;
    let debugError = null;

    if (typeof window.debugState === 'function') {
      try {
        debugResult = window.debugState();
      } catch (e) {
        debugError = String(e);
      }
    }

    return {
      debugState: typeof window.debugState,
      debugResult,
      debugError,
      setState: typeof window.setState,
      resetGame: typeof window.resetGame,
      addScore: typeof window.addScore,
      onDrain: typeof window.onDrain,
      winGame: typeof window.winGame,
      victory: typeof window.victory,
      plunger: typeof window.plunger,
      LF: typeof window.LF,
      RF: typeof window.RF,
      Snd: typeof window.Snd,
      muted: typeof window.muted
    };
  });

  console.log(JSON.stringify(info, null, 2));

  console.log('');
  console.log('=== BOUTON JOUER ===');

  const jouerCount = await page.getByText('JOUER', { exact: true }).count();
  console.log('JOUER trouvé : ' + jouerCount);

  if (jouerCount > 0) {
    try {
      await page.getByText('JOUER', { exact: true }).first().click();
      await page.waitForTimeout(500);

      const afterClick = await page.evaluate(() => {
        let result = null;

        if (typeof window.debugState === 'function') {
          try {
            result = window.debugState();
          } catch (e) {
            result = 'ERREUR : ' + String(e);
          }
        }

        return result;
      });

      console.log('debugState après JOUER :');
      console.log(afterClick);
    } catch (e) {
      console.log('❌ Erreur clic JOUER : ' + e.message);
    }
  }

  console.log('');
  console.log('=== ERREURS CONSOLE ===');

  if (consoleErrors.length === 0) {
    console.log('Aucune erreur console.');
  } else {
    consoleErrors.forEach((e, i) => {
      console.log(`❌ Console ${i + 1} : ${e}`);
    });
  }

  console.log('');
  console.log('=== ERREURS JAVASCRIPT PAGE ===');

  if (pageErrors.length === 0) {
    console.log('Aucune erreur JavaScript.');
  } else {
    pageErrors.forEach((e, i) => {
      console.log(`❌ JavaScript ${i + 1} : ${e}`);
    });
  }

  console.log('');
  console.log('========================================');
  console.log(' FIN DU DIAGNOSTIC');
  console.log('========================================');

  await browser.close();
})();

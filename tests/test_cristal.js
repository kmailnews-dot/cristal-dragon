const { firefox } = require('@playwright/test');
const fs = require('fs');

(async () => {
  const start = Date.now();
  const errors = [];
  const warnings = [];
  const screenshots = 'screenshots';

  fs.mkdirSync(screenshots, { recursive: true });

  const browser = await firefox.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 }
  });

  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`[Console] ${msg.text()}`);
    }
    if (msg.type() === 'warning') {
      warnings.push(`[Console] ${msg.text()}`);
    }
  });

  page.on('pageerror', error => {
    errors.push(`[JavaScript] ${error.message}`);
  });

  page.on('requestfailed', request => {
    errors.push(`[Réseau] ${request.url()} — ${request.failure()?.errorText || 'échec'}`);
  });

  const url = 'file:///home/zkk/mes-jeux/cristal-dragon-v4.html';

  let navigationError = null;

  try {
    await page.goto(url, {
      waitUntil: 'load',
      timeout: 30000
    });
  } catch (error) {
    navigationError = error.message;
    errors.push(`[Navigation] ${error.message}`);
  }

  await page.waitForTimeout(3000);

  const title = await page.title();
  const bodyText = await page.locator('body').innerText().catch(() => '');

  await page.screenshot({
    path: `${screenshots}/cristal-dragon-initial.png`,
    fullPage: true
  });

  const duration = ((Date.now() - start) / 1000).toFixed(1);

  const result = errors.length === 0 ? 'PASS' : 'FAIL';

  const report = `# TEST REPORT — CRISTAL DRAGON V4

Date : ${new Date().toLocaleString('fr-FR')}

## Résultat

**${result}**

## Environnement

- Navigateur : Firefox Playwright
- Viewport : 1280 × 720
- Fichier testé : cristal-dragon-v4.html
- Durée : ${duration} secondes

## Chargement

- Navigation : ${navigationError ? 'ÉCHEC' : 'OK'}
- Titre : ${title || '(aucun)'}

## Erreurs détectées

${errors.length ? errors.map(e => `- ${e}`).join('\\n') : 'Aucune erreur détectée.'}

## Avertissements

${warnings.length ? warnings.map(e => `- ${e}`).join('\\n') : 'Aucun avertissement détecté.'}

## Capture d'écran

- screenshots/cristal-dragon-initial.png

## Texte détecté dans la page

${bodyText.slice(0, 3000)}

## Conclusion

${result === 'PASS'
  ? 'Le jeu se charge correctement et aucune erreur JavaScript, console ou réseau n’a été détectée pendant le test initial.'
  : 'Des problèmes ont été détectés. Consulter les erreurs ci-dessus et la capture d’écran.'}
`;

  fs.writeFileSync('TEST_REPORT.md', report);

  console.log(report);

  await browser.close();
})();

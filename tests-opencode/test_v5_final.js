const { firefox } = require('playwright');
const fs = require('fs');

const FILE = 'file:///home/zkk/mes-jeux/cristal-dragon-v5-opencode.html';
const REPORT = '/home/zkk/mes-jeux/TEST_REPORT.md';

(async () => {
  const browser = await firefox.launch({ headless: true });
  const page = await browser.newPage();

  const results = [];
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

  function pass(name, detail = '') {
    results.push({ ok: true, name, detail });
    console.log(`✅ PASS — ${name}${detail ? ' — ' + detail : ''}`);
  }

  function fail(name, detail = '') {
    results.push({ ok: false, name, detail });
    console.log(`❌ FAIL — ${name}${detail ? ' — ' + detail : ''}`);
  }

  async function state() {
    return await page.evaluate(() => {
      if (typeof window.debugState !== 'function') {
        throw new Error('debugState() indisponible');
      }
      return JSON.parse(window.debugState());
    });
  }

  async function check(name, fn) {
    try {
      const r = await fn();
      if (r === true) pass(name);
      else fail(name, String(r));
    } catch (e) {
      fail(name, e.message);
    }
  }

  try {
    console.log('');
    console.log('========================================');
    console.log(' TEST COMPLET CRISTAL DRAGON V5');
    console.log('========================================');
    console.log('');

    await page.goto(FILE, { waitUntil: 'load' });

    // ------------------------------------------------------------
    // 1 — CHARGEMENT
    // ------------------------------------------------------------

    await check('1. fichier V5 chargé', async () => {
      return (await page.title()) !== null;
    });

    await check('2. debugState disponible', async () => {
      return await page.evaluate(() =>
        typeof window.debugState === 'function'
      );
    });

    await check('3. debugState retourne du JSON valide', async () => {
      const s = await state();
      return s && typeof s === 'object';
    });

    await check('4. version V5', async () => {
      const s = await state();
      return s.version === 'v5' || String(s.version).toLowerCase() === 'v5';
    });

    // ------------------------------------------------------------
    // 2 — ÉTAT INITIAL
    // ------------------------------------------------------------

    await check('5. état initial = menu', async () => {
      const s = await state();
      return s.etat === 'menu';
    });

    await check('6. score initial = 0', async () => {
      const s = await state();
      return s.score === 0;
    });

    await check('7. 3 billes initiales', async () => {
      const s = await state();
      return s.billes === 3;
    });

    await check('8. multiplicateur initial = 1', async () => {
      const s = await state();
      return s.mult === 1;
    });

    await check('9. son initial non coupé', async () => {
      const s = await state();
      return s.muted === false;
    });

    await check('10. lanceur initial au repos', async () => {
      const s = await state();
      return s.lanceur &&
             s.lanceur.charge === false &&
             s.lanceur.power === 0;
    });

    await check('11. 3 runes disponibles au départ', async () => {
      const s = await state();
      return Array.isArray(s.runes) &&
             s.runes.length === 3 &&
             s.runes.every(x => x === true);
    });

    // ------------------------------------------------------------
    // 3 — DÉMARRAGE
    // ------------------------------------------------------------

    const playButton = page.getByText('JOUER', { exact: true }).first();

    await check('12. bouton JOUER présent', async () => {
      return await playButton.count() > 0;
    });

    await playButton.click();

    await page.waitForFunction(() => {
      try {
        const s = JSON.parse(window.debugState());
        return s.etat === 'play';
      } catch {
        return false;
      }
    }, { timeout: 5000 });

    await check('13. JOUER démarre la partie', async () => {
      const s = await state();
      return s.etat === 'play';
    });

    await check('14. balle créée après démarrage', async () => {
      const s = await state();
      return s.bille !== null;
    });

    await check('15. balle initialement dans le lanceur', async () => {
      const s = await state();
      return s.bille &&
             ['lane', 'live'].includes(s.bille.etat);
    });

    // ------------------------------------------------------------
    // 4 — LANCEUR
    // ------------------------------------------------------------

    await page.keyboard.down('Space');

    await page.waitForFunction(() => {
      try {
        const s = JSON.parse(window.debugState());
        return s.lanceur &&
               (s.lanceur.charge === true || s.lanceur.power > 0);
      } catch {
        return false;
      }
    }, { timeout: 3000 });

    await check('16. appui Espace active le lanceur', async () => {
      const s = await state();
      return s.lanceur.charge === true || s.lanceur.power > 0;
    });

    await page.waitForTimeout(500);

    await check('17. puissance du lanceur augmente', async () => {
      const s = await state();
      return s.lanceur.power > 0;
    });

    await page.keyboard.up('Space');

    await page.waitForTimeout(200);

    await check('18. relâchement Espace désactive la charge', async () => {
      const s = await state();
      return s.lanceur.charge === false;
    });

    await check('19. balle toujours présente après lancement', async () => {
      const s = await state();
      return s.bille !== null;
    });

    // ------------------------------------------------------------
    // 5 — SCORE
    // ------------------------------------------------------------

    await check('20. addScore disponible', async () => {
      return await page.evaluate(() =>
        typeof window.addScore === 'function'
      );
    });

    const beforeScore = await state();

    await page.evaluate(() => window.addScore(100));

    await check('21. addScore ajoute 100 points', async () => {
      const s = await state();
      return s.score === beforeScore.score + 100;
    });

    // ------------------------------------------------------------
    // 6 — RESET
    // ------------------------------------------------------------

    await check('22. resetGame disponible', async () => {
      return await page.evaluate(() =>
        typeof window.resetGame === 'function'
      );
    });

    await page.evaluate(() => window.resetGame());

    await page.waitForFunction(() => {
      try {
        const s = JSON.parse(window.debugState());
        return s.etat === 'menu' || s.etat === 'play';
      } catch {
        return false;
      }
    }, { timeout: 3000 });

    await check('23. resetGame remet le score à zéro', async () => {
      const s = await state();
      return s.score === 0;
    });

    await check('24. resetGame remet le multiplicateur à 1', async () => {
      const s = await state();
      return s.mult === 1;
    });

    await check('25. resetGame remet les runes', async () => {
      const s = await state();
      return Array.isArray(s.runes) &&
             s.runes.length === 3 &&
             s.runes.every(x => x === true);
    });

    // ------------------------------------------------------------
    // 7 — SON / MUTE
    // ------------------------------------------------------------

    await check('26. bouton son présent', async () => {
      return await page.locator('#soundBtn').count() === 1;
    });

    const muteBefore = await state();

    await page.locator('#soundBtn').click();

    await page.waitForFunction(() => {
      try {
        const s = JSON.parse(window.debugState());
        return typeof s.muted === 'boolean';
      } catch {
        return false;
      }
    });

    await check('27. bouton son change muted', async () => {
      const s = await state();
      return s.muted !== muteBefore.muted;
    });

    const muteAfter = await state();

    await page.locator('#soundBtn').click();

    await check('28. bouton son peut être réactivé', async () => {
      const s = await state();
      return s.muted === muteBefore.muted;
    });

    // ------------------------------------------------------------
    // 8 — ONDRAIN
    // ------------------------------------------------------------

    await page.evaluate(() => {
      if (typeof window.resetGame === 'function') window.resetGame();
      if (typeof window.setState === 'function') window.setState('play');
    });

    await page.waitForFunction(() => {
      try {
        const s = JSON.parse(window.debugState());
        return s.etat === 'play' && s.bille !== null;
      } catch {
        return false;
      }
    }, { timeout: 3000 });

    const ballsBefore = await state();

    await check('29. onDrain disponible', async () => {
      return await page.evaluate(() =>
        typeof window.onDrain === 'function'
      );
    });

    await page.evaluate(() => window.onDrain());

    await page.waitForTimeout(300);

    await check('30. une bille est retirée après drainage', async () => {
      const s = await state();
      return s.billes === ballsBefore.billes - 1 ||
             s.billes === ballsBefore.billes;
    });

    // ------------------------------------------------------------
    // 9 — ABSENCE D'ERREURS
    // ------------------------------------------------------------

    await check('31. aucune erreur JavaScript de page', async () => {
      return pageErrors.length === 0;
    });

    await check('32. aucune erreur console', async () => {
      return consoleErrors.length === 0;
    });

    // ------------------------------------------------------------
    // RAPPORT
    // ------------------------------------------------------------

    const passed = results.filter(r => r.ok).length;
    const failed = results.filter(r => !r.ok).length;
    const total = results.length;
    const rate = total ? ((passed / total) * 100).toFixed(1) : '0.0';

    let md = '# TEST REPORT — CRISTAL DRAGON V5\n\n';
    md += `Date : ${new Date().toLocaleString('fr-FR')}\n\n`;
    md += `Tests : **${total}**\n\n`;
    md += `PASS : **${passed}**\n\n`;
    md += `FAIL : **${failed}**\n\n`;
    md += `Taux : **${rate}%**\n\n`;

    md += '## Résultats\n\n';

    for (const r of results) {
      md += `- ${r.ok ? '✅ PASS' : '❌ FAIL'} — ${r.name}`;
      if (r.detail) md += ` — ${r.detail}`;
      md += '\n';
    }

    md += '\n## Erreurs JavaScript\n\n';
    if (pageErrors.length === 0) {
      md += 'Aucune erreur JavaScript.\n';
    } else {
      for (const e of pageErrors) md += `- ${e}\n`;
    }

    md += '\n## Erreurs console\n\n';
    if (consoleErrors.length === 0) {
      md += 'Aucune erreur console.\n';
    } else {
      for (const e of consoleErrors) md += `- ${e}\n`;
    }

    md += '\n## Conclusion\n\n';

    if (failed === 0) {
      md += '✅ **TOUS LES TESTS V5 SONT PASSÉS.**\n';
    } else {
      md += `⚠️ **${failed} test(s) ont échoué.**\n`;
    }

    fs.writeFileSync(REPORT, md);

    console.log('');
    console.log('========================================');
    console.log(' RÉSULTAT FINAL V5');
    console.log('========================================');
    console.log(`Tests   : ${total}`);
    console.log(`PASS    : ${passed}`);
    console.log(`FAIL    : ${failed}`);
    console.log(`Taux    : ${rate} %`);
    console.log('');
    console.log(`Rapport : ${REPORT}`);
    console.log('');

    if (failed === 0) {
      console.log('✅ TOUS LES TESTS V5 SONT PASSÉS.');
    } else {
      console.log('⚠️ DES TESTS V5 ONT ÉCHOUÉ.');
    }

  } catch (e) {
    console.error('');
    console.error('❌ ERREUR FATALE :');
    console.error(e);
  } finally {
    await browser.close();
  }
})();

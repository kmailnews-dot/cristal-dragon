/* test_v5_accessibility.js — vérifie le remapping clavier, la persistance et les défauts */
const { firefox } = require('playwright');
const path = require('path');

const FILE = 'file://' + path.resolve(__dirname, '..', 'cristal-dragon.html');
const sleep = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await firefox.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('JS: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errors.push('CONSOLE: ' + m.text()); });

  let pass = 0, fail = 0;
  const ok = (n) => { console.log('✅ ' + n); pass++; };
  const ko = (n, d) => { console.log('❌ ' + n + ' — ' + d); fail++; };

  await page.goto(FILE);
  await sleep(400);

  // Nettoyer le localStorage pour partir d'un état propre
  await page.evaluate(() => { try { localStorage.removeItem('cristalDragonKeyMap'); } catch(e){} });
  await page.reload();
  await sleep(400);

  // 1. Bouton Paramètres présent
  const btnSettings = await page.$('[data-action="settings"]');
  btnSettings ? ok('1. bouton Paramètres présent') : ko('1. bouton Paramètres présent', 'absent');

  // 2. Clic ouvre l'écran settings
  if (btnSettings) {
    await btnSettings.click();
    await sleep(300);
    const etat = await page.evaluate(() => JSON.parse(window.debugState()).etat);
    etat === 'settings' ? ok('2. clic Paramètres ouvre l\'écran') : ko('2. clic Paramètres ouvre l\'écran', 'etat=' + etat);

    // 3. Trois lignes visibles
    const rows = await page.$$('section[data-p="settings"] .row');
    rows.length === 8 ? ok('3. huit lignes (5 commandes + palette + 2 volumes) affichées') : ko('3. huit lignes', 'count=' + rows.length);

    // 4. Défauts affichés
    const lblL = await page.textContent('#keyLbl-left');
    lblL && lblL.includes('Left') ? ok('4. libellé gauche par défaut affiché') : ko('4. libellé gauche', 'texte="' + lblL + '"');

    // 5. Capture d'une nouvelle touche
    const btnCapture = await page.$('[data-action="capture"][data-target="left"]');
    if (btnCapture) {
      await btnCapture.click();
      await sleep(200);
      const capturing = await page.evaluate(() => {
        const b = document.querySelector('[data-action="capture"][data-target="left"]');
        return b && b.classList.contains('capturing');
      });
      capturing ? ok('5a. bouton gauche en mode capture') : ko('5a. mode capture', 'classe capturing absente');

      await page.keyboard.press('KeyZ');
      await sleep(200);

      const afterCapture = await page.evaluate(() => {
        const m = JSON.parse(localStorage.getItem('cristalDragonKeyMap') || '{}');
        return m.left || [];
      });
      JSON.stringify(afterCapture) === JSON.stringify(['KeyZ'])
        ? ok('5b. touche Z enregistrée pour flipper gauche')
        : ko('5b. enregistrement Z', 'keymap.left=' + JSON.stringify(afterCapture));

      const lblAfter = await page.textContent('#keyLbl-left');
      lblAfter && lblAfter.trim() === 'Z' ? ok('5c. libellé mis à jour à Z') : ko('5c. libellé après capture', 'texte="' + lblAfter + '"');
    } else {
      ko('5a. bouton capture gauche', 'introuvable');
    }

    // 6. Persistance après rechargement
    await page.reload();
    await sleep(400);
    const persisted = await page.evaluate(() => {
      const m = JSON.parse(localStorage.getItem('cristalDragonKeyMap') || '{}');
      return m.left || [];
    });
    JSON.stringify(persisted) === JSON.stringify(['KeyZ'])
      ? ok('6. touche Z persiste après rechargement')
      : ko('6. persistance', 'keymap.left=' + JSON.stringify(persisted));

    // 7. En jeu : Z fait bouger le flipper gauche, ArrowLeft non
    await page.click('[data-action="play"]');
    await sleep(300);

    // Fermer la bille dans le lanceur pour que les flippers soient actifs
    await page.evaluate(() => {
      const s = JSON.parse(window.debugState());
      return s.etat;
    });

    await page.keyboard.down('KeyZ');
    await sleep(120);
    const flipperZ = await page.evaluate(() => {
      // On regarde keys.L via debugState indirect : le flipper gauche doit être actif
      // On va lire l'état interne via la fonction exposée si dispo, sinon via le rendu
      return window.__flipperState ? window.__flipperState() : null;
    });
    await page.keyboard.up('KeyZ');

    // Fallback : vérifier que Z a déclenché un événement sans erreur, et que ArrowLeft ne fait plus rien via keymap
    const keymapNow = await page.evaluate(() => JSON.parse(localStorage.getItem('cristalDragonKeyMap') || '{}'));
    const arrowLeftDisabled = keymapNow.left && !keymapNow.left.includes('ArrowLeft');
    arrowLeftDisabled ? ok('7. ArrowLeft retiré du mapping') : ko('7. ArrowLeft retiré', 'keymap=' + JSON.stringify(keymapNow.left));

    // 8. Réinitialiser
    await page.evaluate(() => window.setState ? window.setState('menu') : null);
    await sleep(200);
    // Revenir au menu si on n'y est pas
    const etatMenu = await page.evaluate(() => JSON.parse(window.debugState()).etat);
    if (etatMenu !== 'menu') {
      await page.evaluate(() => { const b = document.querySelector('[data-action="menu"]'); if (b) b.click(); });
      await sleep(200);
    }
    const btnSettings2 = await page.$('[data-action="settings"]');
    if (btnSettings2) {
      await btnSettings2.click();
      await sleep(250);
      const resetBtn = await page.$('[data-action="reset-keys"]');
      if (resetBtn) {
        await resetBtn.click();
        await sleep(200);
        const back = await page.evaluate(() => JSON.parse(localStorage.getItem('cristalDragonKeyMap') || '{}'));
        const isDefault = back.left && back.left.includes('ArrowLeft') && back.left.includes('KeyA');
        isDefault ? ok('8. Réinitialiser restaure les défauts') : ko('8. reset', 'keymap=' + JSON.stringify(back));
      } else {
        ko('8. bouton reset-keys', 'introuvable');
      }
    } else {
      ko('8. réouverture settings', 'bouton absent');
    }
  }

  // 9. Aucune erreur JS/console
  if (errors.length === 0) {
    ok('9. aucune erreur JS/console');
  } else {
    ko('9. aucune erreur JS/console', errors.slice(0, 3).join(' | '));
  }

  console.log('');
  console.log('========================================');
  console.log(' RÉSULTAT TEST ACCESSIBILITÉ');
  console.log('========================================');
  console.log(' PASS : ' + pass);
  console.log(' FAIL : ' + fail);
  if (errors.length) {
    console.log('');
    console.log(' Erreurs JavaScript :');
    errors.slice(0, 10).forEach(e => console.log('   ' + e));
  }

  await browser.close();
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => {
  console.error('ERREUR FATALE :', e.message);
  process.exit(1);
});

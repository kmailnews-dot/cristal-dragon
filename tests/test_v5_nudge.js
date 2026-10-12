/* test_v5_nudge.js — verifie nudge clavier, TILT et reset */
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
  const ok = n => { console.log('\u2705 ' + n); pass++; };
  const ko = (n, d) => { console.log('\u274c ' + n + ' \u2014 ' + d); fail++; };

  const clickAction = (a) => page.evaluate((act) => {
    const b = document.querySelector('[data-action="' + act + '"]');
    if (b) { b.click(); return true; }
    return false;
  }, a);

  const forceMenu = () => page.evaluate(() => {
    ['resumeNo','menu'].forEach(a => {
      document.querySelectorAll('[data-action="' + a + '"]').forEach(b => {
        try { b.click(); } catch(e){}
      });
    });
    try { if (typeof setState === 'function') setState('menu'); } catch(e){}
  });

  const getState = () => page.evaluate(() => JSON.parse(window.debugState()));

  // --- Demarrage propre ---
  await page.goto(FILE);
  await sleep(400);
  await page.evaluate(() => {
    try {
      localStorage.removeItem('cristalDragonKeyMap');
      localStorage.removeItem('cristalDragonSave');
      localStorage.setItem('cristalDragonTutorialSeen','1');
    } catch(e){}
  });
  await page.reload();
  await sleep(500);
  await forceMenu();
  await sleep(200);

  // --- 1. Etat initial : pas de tilt ---
  const s0 = await getState();
  (s0.tilted === false && s0.nudgeCount === 0)
    ? ok('1. etat initial : tilted=false, nudgeCount=0')
    : ko('1. etat initial', JSON.stringify({t:s0.tilted, n:s0.nudgeCount}));

  // --- 2. Parametres affiche 2 nouvelles lignes nudge ---
  await clickAction('settings');
  await sleep(250);
  const hasNudgeUp = await page.evaluate(() => !!document.querySelector('[data-action="capture"][data-target="nudgeUp"]'));
  const hasNudgeDown = await page.evaluate(() => !!document.querySelector('[data-action="capture"][data-target="nudgeDown"]'));
  (hasNudgeUp && hasNudgeDown)
    ? ok('2. lignes Nudge haut et Nudge bas presentes dans Parametres')
    : ko('2. UI nudge', 'up=' + hasNudgeUp + ' down=' + hasNudgeDown);

  // --- 3. Retour au menu, demarrer la partie ---
  await clickAction('menu');
  await sleep(200);
  await clickAction('play');
  await sleep(500);

  // --- 4. Lancer la bille avec Space ---
  await page.keyboard.down('Space');
  await sleep(400);
  await page.keyboard.up('Space');
  await sleep(400);

  const s1 = await getState();
  s1.bille && s1.bille.etat === 'live'
    ? ok('3. bille lancee et en etat live')
    : ko('3. bille live', 'bille=' + JSON.stringify(s1.bille));

  // --- 5. Nudge haut modifie vy ---
  const vyBefore = s1.bille ? s1.bille.vy : null;
  await page.keyboard.press('ArrowUp');
  await sleep(150);
  const s2 = await getState();
  const vyAfter = s2.bille ? s2.bille.vy : null;
  (s2.nudgeCount === 1 && vyAfter !== null && vyAfter !== vyBefore)
    ? ok('4. ArrowUp incremente nudgeCount et change vy')
    : ko('4. nudge haut', 'count=' + s2.nudgeCount + ' vy=' + vyAfter + ' (avant ' + vyBefore + ')');

  // --- 6. Nudge bas fonctionne aussi ---
  await page.keyboard.press('ArrowDown');
  await sleep(150);
  const s3 = await getState();
  (s3.nudgeCount === 2)
    ? ok('5. ArrowDown incremente nudgeCount a 2')
    : ko('5. nudge bas', 'count=' + s3.nudgeCount);

  // --- 7. TILT apres depassement de la fenetre (MAX=3) ---
  await page.keyboard.press('ArrowUp');
  await sleep(80);
  await page.keyboard.press('ArrowDown');
  await sleep(80);
  const s4 = await getState();
  s4.tilted === true
    ? ok('6. TILT apres 4 nudges dans la fenetre')
    : ko('6. TILT', 'tilted=' + s4.tilted + ' count=' + s4.nudgeCount);

  // --- 8. Apres TILT, les flippers sont bloques ---
  const before = await page.evaluate(() => {
    try { return JSON.stringify(window.debugState()); } catch(e){ return '{}'; }
  });
  await page.keyboard.down('ArrowLeft');
  await sleep(200);
  const after = await page.evaluate(() => {
    try { return JSON.stringify(window.debugState()); } catch(e){ return '{}'; }
  });
  await page.keyboard.up('ArrowLeft');
  const s5 = await getState();
  s5.tilted === true
    ? ok('7. TILT persiste pendant la bille en cours')
    : ko('7. TILT persiste', 'tilted=' + s5.tilted);

  // --- 9. TILT leve au spawn de la bille suivante ---
  await page.evaluate(() => { try { window.onDrain(); } catch(e){} });
  await sleep(1400);
  const s6 = await getState();
  s6.tilted === false
    ? ok('8. TILT leve apres respawn de la bille')
    : ko('8. TILT leve', 'tilted=' + s6.tilted + ' etat=' + s6.etat);

  // --- 10. Aucune erreur JS ---
  errors.length === 0
    ? ok('9. aucune erreur JS/console')
    : ko('9. erreurs', errors.slice(0,3).join(' | '));

  console.log('');
  console.log('========================================');
  console.log(' RESULTAT TEST NUDGE');
  console.log('========================================');
  console.log(' PASS : ' + pass);
  console.log(' FAIL : ' + fail);
  if (errors.length) {
    console.log('');
    console.log(' Erreurs :');
    errors.slice(0,10).forEach(e => console.log('   ' + e));
  }

  await browser.close();
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => {
  console.error('ERREUR FATALE :', e.message);
  process.exit(1);
});

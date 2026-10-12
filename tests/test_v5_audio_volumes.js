/* test_v5_audio_volumes.js — sliders de volume independants */
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

  // Helpers tout-en-evaluate : pas de visibilite exigee
  const clickAction = (act) => page.evaluate((a) => {
    const b = document.querySelector('[data-action="' + a + '"]');
    if (b) { b.click(); return true; }
    return false;
  }, act);

  const forceMenu = () => page.evaluate(() => {
    // Fermer tout overlay connu en cliquant sur les boutons retour/menu/resumeNo
    ['resumeNo','menu'].forEach(a => {
      document.querySelectorAll('[data-action="' + a + '"]').forEach(b => {
        try { b.click(); } catch(e){}
      });
    });
    // Fermer le tutoriel s'il est actif
    try {
      if (typeof setState === 'function') setState('menu');
    } catch(e){}
  });

  const setRange = (id, val) => page.evaluate(({id, val}) => {
    const el = document.getElementById(id);
    if (!el) return false;
    el.value = String(val);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    return true;
  }, {id, val});

  const getStored = (key) => page.evaluate((k) => localStorage.getItem(k), key);

  // --- Demarrage propre ---
  await page.goto(FILE);
  await sleep(400);
  await page.evaluate(() => {
    try {
      localStorage.removeItem('cristalDragonVolSfx');
      localStorage.removeItem('cristalDragonVolMusic');
      localStorage.removeItem('cristalDragonSave');
      localStorage.setItem('cristalDragonTutorialSeen', '1');
    } catch(e){}
  });
  await page.reload();
  await sleep(500);
  await forceMenu();
  await sleep(200);

  // --- 1. Bouton Parametres present dans le DOM ---
  const hasBtn = await page.evaluate(() => !!document.querySelector('[data-action="settings"]'));
  hasBtn ? ok('1. bouton Parametres present') : ko('1. bouton Parametres', 'absent');

  // --- 2. Ouverture des parametres via evaluate (bypass visibilite) ---
  await clickAction('settings');
  await sleep(300);
  const etat = await page.evaluate(() => {
    try { return JSON.parse(window.debugState()).etat; } catch(e){ return '?'; }
  });
  etat === 'settings' ? ok('2. ecran Parametres ouvert') : ko('2. ouverture Parametres', 'etat=' + etat);

  // --- 3. Deux sliders ---
  const sliderCount = await page.evaluate(() => document.querySelectorAll('section[data-p="settings"] input[type="range"]').length);
  sliderCount === 2 ? ok('3. deux sliders affiches') : ko('3. sliders', 'count=' + sliderCount);

  // --- 4. Valeurs par defaut 100 ---
  const v0 = await page.evaluate(() => ({
    s: document.getElementById('volSfx') ? document.getElementById('volSfx').value : null,
    m: document.getElementById('volMusic') ? document.getElementById('volMusic').value : null
  }));
  (v0.s === '100' && v0.m === '100') ? ok('4. volumes par defaut a 100') : ko('4. defauts', JSON.stringify(v0));

  // --- 5. Baisser SFX a 30, verifier persistance ---
  await setRange('volSfx', 30);
  await sleep(200);
  const s1 = await getStored('cristalDragonVolSfx');
  parseFloat(s1) === 0.3 ? ok('5. SFX=30% persiste') : ko('5. persistance SFX', 'stored=' + s1);

  // --- 6. Musique inchangee ---
  const m1 = await getStored('cristalDragonVolMusic');
  parseFloat(m1) === 1 ? ok('6. Musique inchangee a 100%') : ko('6. independance Musique', 'stored=' + m1);

  // --- 7. Baisser Musique a 20 ---
  await setRange('volMusic', 20);
  await sleep(200);
  const m2 = await getStored('cristalDragonVolMusic');
  parseFloat(m2) === 0.2 ? ok('7. Musique=20% persiste') : ko('7. persistance Musique', 'stored=' + m2);

  // --- 8. SFX toujours a 30 ---
  const s2 = await getStored('cristalDragonVolSfx');
  parseFloat(s2) === 0.3 ? ok('8. SFX reste a 30% (independance)') : ko('8. independance SFX', 'stored=' + s2);

  // --- 9. Rechargement : les sliders doivent refleter le stockage ---
  await page.reload();
  await sleep(500);
  await forceMenu();
  await sleep(200);
  await clickAction('settings');
  await sleep(300);
  const v1 = await page.evaluate(() => ({
    s: document.getElementById('volSfx') ? document.getElementById('volSfx').value : null,
    m: document.getElementById('volMusic') ? document.getElementById('volMusic').value : null
  }));
  (v1.s === '30' && v1.m === '20') ? ok('9. volumes restaures apres rechargement') : ko('9. restauration', JSON.stringify(v1));

  // --- 10. Labels ---
  const lbl = await page.evaluate(() => ({
    s: (document.getElementById('volSfxVal')||{}).textContent,
    m: (document.getElementById('volMusicVal')||{}).textContent
  }));
  (lbl.s === '30%' && lbl.m === '20%') ? ok('10. libelles % corrects') : ko('10. libelles', JSON.stringify(lbl));

  // --- 11. Aucune erreur ---
  errors.length === 0 ? ok('11. aucune erreur JS/console') : ko('11. erreurs', errors.slice(0,3).join(' | '));

  console.log('');
  console.log('========================================');
  console.log(' RESULTAT TEST VOLUMES');
  console.log('========================================');
  console.log(' PASS : ' + pass);
  console.log(' FAIL : ' + fail);
  if (errors.length) {
    console.log('');
    console.log(' Erreurs :');
    errors.slice(0, 10).forEach(e => console.log('   ' + e));
  }

  await browser.close();
  process.exit(fail > 0 ? 1 : 0);
})().catch(e => {
  console.error('ERREUR FATALE :', e.message);
  process.exit(1);
});

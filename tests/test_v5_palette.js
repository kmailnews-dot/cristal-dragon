/* test_v5_palette.js — palettes accessibilite daltonisme */
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

  await page.goto(FILE);
  await sleep(400);
  await page.evaluate(() => {
    try { localStorage.removeItem('cristalDragonPalette'); } catch(e){}
  });
  await page.reload();
  await sleep(500);

  // 1. PALETTES expose 3 entrees
  const pal = await page.evaluate(() => {
    try { return Object.keys(window.PALETTES); } catch(e){ return null; }
  });
  (pal && pal.length === 3 && pal.includes('default') && pal.includes('deuteranopie') && pal.includes('protanopie'))
    ? ok('1. PALETTES : 3 entrees (default, deuteranopie, protanopie)')
    : ko('1. PALETTES', JSON.stringify(pal));

  // 2. setPalette et getPalette exposes
  const fns = await page.evaluate(() => ({
    set: typeof window.setPalette,
    get: typeof window.getPalette
  }));
  (fns.set === 'function' && fns.get === 'function')
    ? ok('2. setPalette et getPalette exposes sur window')
    : ko('2. fonctions', JSON.stringify(fns));

  // 3. Palette par defaut au chargement
  const cur0 = await page.evaluate(() => window.getPalette());
  cur0 === 'default' ? ok('3. palette par defaut au chargement') : ko('3. defaut', 'cur=' + cur0);

  // 4. Changer de palette fonctionne
  const changed = await page.evaluate(() => {
    try {
      const r = window.setPalette('deuteranopie');
      return { ok: r, cur: window.getPalette() };
    } catch(e){ return { erreur: e.message }; }
  });
  (changed.ok === true && changed.cur === 'deuteranopie')
    ? ok('4. setPalette("deuteranopie") fonctionne')
    : ko('4. changement', JSON.stringify(changed));

  // 5. Persistance localStorage
  const stored = await page.evaluate(() => localStorage.getItem('cristalDragonPalette'));
  stored === 'deuteranopie' ? ok('5. palette persistee dans localStorage') : ko('5. persistance', 'stored=' + stored);

  // 6. Persistance apres rechargement
  await page.reload();
  await sleep(500);
  const cur1 = await page.evaluate(() => window.getPalette());
  cur1 === 'deuteranopie' ? ok('6. palette restauree apres rechargement') : ko('6. restauration', 'cur=' + cur1);

  // 7. Rejet d'une palette inconnue
  const rejected = await page.evaluate(() => {
    try {
      const r = window.setPalette('inconnue');
      return { ok: r, cur: window.getPalette() };
    } catch(e){ return { erreur: e.message }; }
  });
  (rejected.ok === false && rejected.cur === 'deuteranopie')
    ? ok('7. setPalette("inconnue") rejete, palette inchangee')
    : ko('7. rejet', JSON.stringify(rejected));

  // 8. Retour a default
  const back = await page.evaluate(() => {
    window.setPalette('default');
    return window.getPalette();
  });
  back === 'default' ? ok('8. retour a default') : ko('8. retour default', 'cur=' + back);

  // 9. Select visible dans Parametres
  const hasSelect = await page.evaluate(() => {
    const s=document.getElementById('paletteSelect');
    return s ? { value: s.value, options: s.options.length } : null;
  });
  (hasSelect && hasSelect.options === 3)
    ? ok('9. select palette dans Parametres (3 options)')
    : ko('9. select palette', JSON.stringify(hasSelect));

  // 10. Changer le select met a jour la palette
  await page.evaluate(() => {
    const s=document.getElementById('paletteSelect');
    if(s){ s.value='protanopie'; s.dispatchEvent(new Event('change', {bubbles:true})); }
  });
  await sleep(200);
  const cur2 = await page.evaluate(() => window.getPalette());
  cur2 === 'protanopie' ? ok('10. select change la palette active') : ko('10. select change', 'cur=' + cur2);

  // 11. Aucune erreur
  errors.length === 0 ? ok('11. aucune erreur JS/console') : ko('11. erreurs', errors.slice(0,3).join(' | '));

  console.log('');
  console.log('========================================');
  console.log(' RESULTAT TEST PALETTE');
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

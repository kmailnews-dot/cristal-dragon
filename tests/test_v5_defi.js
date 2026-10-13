/* test_v5_defi.js — mode defi seede par la date, top 5 du jour */
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

  await page.goto(FILE);
  await sleep(400);
  await page.evaluate(() => {
    try {
      localStorage.removeItem('cristalDragonSave');
      localStorage.removeItem('cristalDragonDailyTop5');
      localStorage.setItem('cristalDragonTutorialSeen','1');
    } catch(e){}
  });
  await page.reload();
  await sleep(500);
  await forceMenu();
  await sleep(200);

  // 1. dailySeed() = YYYYMMDD local
  const seed = await page.evaluate(() => {
    try { return window.dailySeed ? window.dailySeed() : (typeof dailySeed === 'function' ? dailySeed() : null); }
    catch(e){ return null; }
  });
  const d = new Date();
  const expected = parseInt('' + d.getFullYear() + String(d.getMonth()+1).padStart(2,'0') + String(d.getDate()).padStart(2,'0'), 10);
  (seed === expected)
    ? ok('1. dailySeed() = date locale YYYYMMDD')
    : ko('1. dailySeed', 'seed=' + seed + ' attendu=' + expected);

  // 2. Bouton Defi present dans le menu
  const hasDaily = await page.evaluate(() => !!document.querySelector('[data-action="daily"]'));
  hasDaily ? ok('2. bouton Defi present') : ko('2. bouton Defi', 'absent');

  // 3. Mode defi dans MODES
  const hasDefi = await page.evaluate(() => {
    try { return typeof MODES !== 'undefined' && !!MODES.defi; } catch(e){ return false; }
  });
  hasDefi ? ok('3. MODES.defi existe') : ko('3. MODES.defi', 'absent');

  // 4. Determinisme : deux appels successifs avec la meme seed
  const det = await page.evaluate(() => {
    try {
      seedDaily(20261013);
      const a = [rngDaily(), rngDaily(), rngDaily()];
      seedDaily(20261013);
      const b = [rngDaily(), rngDaily(), rngDaily()];
      return { same: a.join() === b.join(), a, b };
    } catch(e){ return { error: e.message }; }
  });
  det.same ? ok('4. RNG deterministe (meme seed -> meme sequence)') : ko('4. determinisme', JSON.stringify(det));

  // 5. Deux seeds differentes -> sequences differentes
  const diff = await page.evaluate(() => {
    try {
      seedDaily(20261013);
      const a = rngDaily();
      seedDaily(20261014);
      const b = rngDaily();
      return { different: a !== b };
    } catch(e){ return { error: e.message }; }
  });
  diff.different ? ok('5. seeds differentes -> sequences differentes') : ko('5. seeds differentes', JSON.stringify(diff));

  // 6. dailyTop5 : ajout + tri + limite 5
  const top = await page.evaluate(() => {
    try {
      localStorage.removeItem('cristalDragonDailyTop5');
      addDailyScore(100);
      addDailyScore(500);
      addDailyScore(300);
      addDailyScore(700);
      addDailyScore(50);
      addDailyScore(999);
      const t = loadDailyTop();
      return { scores: t.scores, len: t.scores.length };
    } catch(e){ return { error: e.message }; }
  });
  (top.len === 5 && top.scores[0] === 999 && top.scores[4] === 100)
    ? ok('6. top 5 du jour : tri decroissant + limite 5')
    : ko('6. top 5', JSON.stringify(top));

  // 7. Reset automatique si date differente
  const reset = await page.evaluate(() => {
    try {
      localStorage.setItem('cristalDragonDailyTop5', JSON.stringify({date: '20200101', scores: [1,2,3]}));
      const t = loadDailyTop();
      return { scores: t.scores, date: t.date };
    } catch(e){ return { error: e.message }; }
  });
  (reset.scores.length === 0)
    ? ok('7. reset auto si date differente')
    : ko('7. reset date', JSON.stringify(reset));

  // 8. Mode defi non affecte par le RNG : les modes classic/chrono/survie utilisent Math.random
  const classicRand = await page.evaluate(() => {
    try {
      gameMode='classic';
      const a = rngGame();
      const b = rngGame();
      gameMode='defi';
      seedDaily(20261013);
      const c = rngGame();
      seedDaily(20261013);
      const d = rngGame();
      gameMode='classic';
      return { classicDiff: a !== b, defiSame: c === d };
    } catch(e){ return { error: e.message }; }
  });
  (classicRand.classicDiff && classicRand.defiSame)
    ? ok('8. rngGame() : Math.random en classic, rngDaily en defi')
    : ko('8. rngGame', JSON.stringify(classicRand));

  // 9. Aucune erreur
  errors.length === 0
    ? ok('9. aucune erreur JS/console')
    : ko('9. erreurs', errors.slice(0,3).join(' | '));

  console.log('');
  console.log('========================================');
  console.log(' RESULTAT TEST DEFI QUOTIDIEN');
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

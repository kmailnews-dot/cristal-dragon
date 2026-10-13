/* test_v5_multiball.js — un drain consomme un extraBall au lieu d'une vie */
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

  const forceBall = () => page.evaluate(() => {
    try {
      if (typeof spawnBall === 'function' && (typeof ball === 'undefined' || !ball)) {
        spawnBall();
      }
      if (ball) { ball.state = 'live'; ball.y = 600; }
    } catch(e){}
  });

  await page.goto(FILE);
  await sleep(400);
  await page.evaluate(() => {
    try {
      localStorage.removeItem('cristalDragonSave');
      localStorage.setItem('cristalDragonTutorialSeen','1');
    } catch(e){}
  });
  await page.reload();
  await sleep(500);
  await forceMenu();
  await sleep(200);

  await clickAction('play');
  await sleep(400);

  // Etat 1 : 5 billes, 0 extra
  const s0 = await getState();
  (s0.billes === 5) ? ok('1. partie classique : 5 billes') : ko('1. billes initiales', 'billes=' + s0.billes);

  // Injecter un extraBall et un main ball actif
  const injected = await page.evaluate(() => {
    try {
      // spawnExtraBalls est global
      if (typeof spawnExtraBalls === 'function') {
        spawnExtraBalls(200, 350);
      }
      // Force une bille live
      if (typeof spawnBall === 'function') {
        spawnBall();
        ball.state = 'live';
        ball.y = 600;
      }
      return {
        extras: (typeof extraBalls !== 'undefined') ? extraBalls.length : -1,
        bille: (typeof ball !== 'undefined' && ball) ? ball.state : null
      };
    } catch(e) { return { error: e.message }; }
  });

  if (injected.extras === 2 && injected.bille === 'live') {
    ok('2. injection : 2 extraBalls + bille principale live');
  } else {
    ko('2. injection', JSON.stringify(injected));
  }

  // Drain 1 : consomme 1 extra, balls reste a 5
  await forceBall();
  await page.evaluate(() => { try { window.onDrain(); } catch(e){} });
  await sleep(200);
  const s1 = await page.evaluate(() => {
    return {
      billes: JSON.parse(window.debugState()).billes,
      extras: (typeof extraBalls !== 'undefined') ? extraBalls.length : -1
    };
  });

  (s1.billes === 5 && s1.extras === 1)
    ? ok('3. drain avec extra : billes reste a 5, extras 2->1')
    : ko('3. drain 1', JSON.stringify(s1));

  // Drain 2 : consomme le 2e extra
  await forceBall();
  await page.evaluate(() => { try { window.onDrain(); } catch(e){} });
  await sleep(200);
  const s2 = await page.evaluate(() => {
    return {
      billes: JSON.parse(window.debugState()).billes,
      extras: (typeof extraBalls !== 'undefined') ? extraBalls.length : -1
    };
  });

  (s2.billes === 5 && s2.extras === 0)
    ? ok('4. drain avec dernier extra : billes reste a 5, extras 1->0')
    : ko('4. drain 2', JSON.stringify(s2));

  // Drain 3 : plus d'extra -> decremente les billes
  await forceBall();
  await page.evaluate(() => { try { window.onDrain(); } catch(e){} });
  await sleep(200);
  const s3 = await getState();

  (s3.billes === 4)
    ? ok('5. drain sans extra : billes 5->4')
    : ko('5. drain 3', 'billes=' + s3.billes);

  // Aucune erreur
  errors.length === 0
    ? ok('6. aucune erreur JS/console')
    : ko('6. erreurs', errors.slice(0,3).join(' | '));

  console.log('');
  console.log('========================================');
  console.log(' RESULTAT TEST MULTIBALL');
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

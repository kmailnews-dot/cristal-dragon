/* BOT EXPERT — joue à Cristal Dragon jusqu'à la VICTOIRE
 * Stratégie : suit la bille, tape le flipper du bon côté, relance la bille si besoin.
 */
const { firefox } = require("playwright");

const FILE = 'file:///home/zkk/mes-jeux/cristal-dragon.html';

(async () => {
  const browser = await firefox.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });

  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const ev = (fn) => page.evaluate(fn);
  const snap = () => page.evaluate(() => ({
    state, score, balls, comboMult,
    ball: ball ? { x: ball.x, y: ball.y, vx: ball.vx, vy: ball.vy, state: ball.state } : null,
    flip: [flippers[0].pressed, flippers[1].pressed],
  }));

  try {
    console.log('\n===== BOT EXPERT — objectif VICTOIRE =====\n');
    await page.goto(FILE);
    await page.waitForLoadState('load');
    await sleep(500);

    // Démarrer
    const playBtn = page.locator('button:visible').filter({ hasText: 'JOUER' }).first();
    if (await playBtn.count()) { await playBtn.click(); await sleep(300); }
    else await ev(() => startGame());

    console.log('Partie démarrée. Le bot joue jusqu\'à VICTOIRE ou DEFEAT (max 5 min)...\n');

    const t0 = Date.now();
    const MAX_MS = 5 * 60 * 1000;
    let lastLog = 0;
    let lastScore = 0;
    let taps = 0;
    let launches = 0;
    let maxCombo = 1;

    while (Date.now() - t0 < MAX_MS) {
      const s = await snap();

      // Fin de partie ?
      if (s.state === 'victory' || s.state === 'defeat') {
        const duree = ((Date.now() - t0) / 1000).toFixed(1);
        console.log(`\n===== FIN : ${s.state.toUpperCase()} =====`);
        console.log(`Score final : ${s.score}`);
        console.log(`Durée : ${duree}s`);
        console.log(`Billes restantes : ${s.balls}`);
        console.log(`Tapes flippers : ${taps}`);
        console.log(`Lancements : ${launches}`);
        console.log(`Combo max : x${maxCombo}`);
        console.log(`Erreurs JS : ${errors.length === 0 ? 'aucune' : errors.join(' | ')}`);

        // Log périodique
        if (s.score > lastScore + 1000) {
          console.log(`  [${((Date.now()-t0)/1000).toFixed(0)}s] score=${s.score} billes=${s.balls} combo=x${s.comboMult} ball=${s.ball?`(${Math.round(s.ball.x)},${Math.round(s.ball.y)})`:'null'}`);
          lastScore = s.score;
        }
        if (s.comboMult > maxCombo) maxCombo = s.comboMult;

        if (s.state === 'victory') {
          console.log('\n>>> VICTOIRE ! Le bot a atteint 50000 points. <<<');
          await browser.close();
          process.exit(0);
        } else {
          console.log('\n>>> DÉFAITE. Le bot a perdu ses 5 billes. <<<');
          await browser.close();
          process.exit(1);
        }
      }

      // Bille dans le lanceur → lancer
      if (s.ball && s.ball.state === 'lane') {
        await page.keyboard.down('Space');
        await sleep(800);
        await page.keyboard.up('Space');
        launches++;
        await sleep(300);
        continue;
      }

      // Bille absente → attendre le respawn
      if (!s.ball) {
        await sleep(200);
        continue;
      }

      // Stratégie experte : si la bille est dans la moitié basse, taper le flipper du bon côté
      const bx = s.ball.x;
      const by = s.ball.y;

      if (by > 450) {
        if (bx < 200) {
          // Bille à gauche → flipper gauche
          await page.keyboard.down('ArrowLeft');
          await sleep(80);
          await page.keyboard.up('ArrowLeft');
          taps++;
        } else {
          // Bille à droite → flipper droit
          await page.keyboard.down('ArrowRight');
          await sleep(80);
          await page.keyboard.up('ArrowRight');
          taps++;
        }
      } else if (by > 350) {
        // Zone intermédiaire : taper les deux rapidement
        await page.keyboard.down('ArrowLeft');
        await page.keyboard.down('ArrowRight');
        await sleep(60);
        await page.keyboard.up('ArrowLeft');
        await page.keyboard.up('ArrowRight');
        taps += 2;
      }

      // Log toutes les 10s
      const elapsed = Date.now() - t0;
      if (elapsed - lastLog > 10000) {
        lastLog = elapsed;
        console.log(`  [${(elapsed/1000).toFixed(0)}s] score=${s.score} billes=${s.balls} combo=x${s.comboMult} ball=${s.ball?`(${Math.round(s.ball.x)},${Math.round(s.ball.y)})`:'null'}`);
      }

      await sleep(40);
    }

    console.log('\n>>> TIMEOUT après 5 minutes. Partie non terminée. <<<');
    await browser.close();
    process.exit(2);

  } catch (e) {
    console.error('ERREUR BOT :', e);
    await browser.close();
    process.exit(3);
  }
})();

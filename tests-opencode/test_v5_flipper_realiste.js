/* BOT FLIPPER RÉALISTE — Joue N parties, analyse le réalisme du jeu.
 * Simule un joueur humain avec des imperfections (latence, erreurs).
 * Contrôle : physique, contrôles, collisions, score, drains, boss, combos.
 */
const { firefox } = require("playwright");

const FILE = 'file:///home/zkk/mes-jeux/cristal-dragon-v5-opencode.html';
const NB_PARTIES = 20; // Modifie ici pour 100

(async () => {
  const browser = await firefox.launch({ headless: true });

  const rapport = {
    parties: [],
    bugs: { js: [], console: [], incoherences: [] },
    stats: {
      total: 0, victoires: 0, defaites: 0, timeouts: 0,
      scoreTotal: 0, scoreMax: 0, scoreMin: Infinity,
      dureeTotal: 0, dureeMin: Infinity, dureeMax: 0,
      drainsTotal: 0, comboMax: 0,
      bossKills: 0, phases2: 0, bonusDeclenches: 0, perfectDeclenches: 0,
      projectilesTouches: 0,
    }
  };

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  async function jouerPartie(num) {
    const page = await browser.newPage();
    const bugsJS = [];
    const bugsConsole = [];

    page.on('pageerror', e => bugsJS.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') bugsConsole.push(m.text()); });

    const stats = {
      num, resultat: null, score: 0, duree: 0, drains: 0, comboMax: 1,
      bossKills: 0, phases2: 0, bonus: 0, perfect: 0,
      erreursJS: 0, erreursConsole: 0, incoherences: [],
    };

    try {
      await page.goto(FILE);
      await page.waitForLoadState('load');
      await sleep(300);

      // Instrumentation
      await page.evaluate(() => {
        window.__stats = { bossKills: 0, phases2: 0 };
        const origHitRune = window.hitRune;
      });

      // Démarrer
      const playBtn = page.locator('button:visible').filter({ hasText: 'JOUER' }).first();
      if (await playBtn.count()) { await playBtn.click(); await sleep(250); }
      else await page.evaluate(() => startGame());

      const t0 = Date.now();
      const MAX_MS = 3 * 60 * 1000;
      let lastBalls = 5;
      let lastBossHp = 5;
      let lastBonus = false;
      let lastPerfect = false;

      // Simuler un humain : latence aléatoire entre 30 et 120ms
      const latence = () => 30 + Math.random() * 90;

      while (Date.now() - t0 < MAX_MS) {
        const s = await page.evaluate(() => ({
          state, score, balls, comboMult,
          bonus: typeof bonus !== 'undefined' ? bonus : false,
          perfectShown: typeof perfectShown !== 'undefined' ? perfectShown : false,
          eye: { hp: eye.hp, deadT: eye.deadT },
          ball: ball ? { x: ball.x, y: ball.y, state: ball.state } : null,
          projectiles: projectiles.filter(p => p.actif).length,
        }));

        if (s.balls < lastBalls) { stats.drains += (lastBalls - s.balls); lastBalls = s.balls; }
        if (s.comboMult > stats.comboMax) stats.comboMax = s.comboMult;
        if (s.eye.hp < lastBossHp) { if (s.eye.hp === 0) stats.bossKills++; if (s.eye.hp === 2) stats.phases2++; lastBossHp = s.eye.hp; }
        if (s.eye.hp > lastBossHp) { lastBossHp = s.eye.hp; }
        if (s.bonus && !lastBonus) { stats.bonus++; lastBonus = true; }
        if (!s.bonus) lastBonus = false;
        if (s.perfectShown && !lastPerfect) { stats.perfect++; lastPerfect = true; }
        if (!s.perfectShown) lastPerfect = false;

        if (s.state === 'victory' || s.state === 'defeat') {
          stats.resultat = s.state;
          stats.score = s.score;
          break;
        }

        // Bille dans le lanceur
        if (s.ball && s.ball.state === 'lane') {
          await page.keyboard.down('Space');
          await sleep(600 + Math.random() * 400); // Charge variable
          await page.keyboard.up('Space');
          await sleep(latence());
          continue;
        }

        if (!s.ball) { await sleep(100); continue; }

        // Stratégie humaine : suivre la bille avec un peu de latence
        const bx = s.ball.x, by = s.ball.y;
        const delai = latence();

        if (by > 460) {
          // Zone basse : frapper le bon flipper
          if (bx < 200) {
            await page.keyboard.down('ArrowLeft');
            await sleep(delai);
            await page.keyboard.up('ArrowLeft');
          } else {
            await page.keyboard.down('ArrowRight');
            await sleep(delai);
            await page.keyboard.up('ArrowRight');
          }
        } else if (by > 380) {
          // Zone intermédiaire : les deux (comme un humain qui panique)
          await page.keyboard.down('ArrowLeft');
          await page.keyboard.down('ArrowRight');
          await sleep(delai * 0.7);
          await page.keyboard.up('ArrowLeft');
          await page.keyboard.up('ArrowRight');
        }

        await sleep(20 + Math.random() * 40);
      }

      stats.duree = (Date.now() - t0) / 1000;
      if (!stats.resultat) stats.resultat = 'timeout';
      stats.score = await page.evaluate(() => score);

      // Vérifier cohérence
      const incoh = await page.evaluate(() => {
        const issues = [];
        if (score < 0) issues.push('score negatif');
        if (balls < 0) issues.push('billes negatives');
        if (balls > 5) issues.push('billes > 5');
        if (comboMult < 1 || comboMult > 5) issues.push('comboMult hors limites');
        if (eye.hp < 0 || eye.hp > 5) issues.push('eye.hp hors limites');
        if (eye.deadT < 0) issues.push('eye.deadT negatif');
        return issues;
      });
      stats.incoherences = incoh;
      stats.erreursJS = bugsJS.length;
      stats.erreursConsole = bugsConsole.length;

      if (bugsJS.length) bugsJS.forEach(b => rapport.bugs.js.push(`P${num}: ${b}`));
      if (bugsConsole.length) bugsConsole.forEach(b => rapport.bugs.console.push(`P${num}: ${b}`));
      if (incoh.length) incoh.forEach(i => rapport.bugs.incoherences.push(`P${num}: ${i}`));

    } catch (e) {
      stats.erreurs = 'EXCEPTION: ' + e.message;
    }

    await page.close();
    return stats;
  }

  // LANCER LES PARTIES
  console.log(`\n========================================`);
  console.log(` BOT FLIPPER RÉALISTE — ${NB_PARTIES} PARTIES`);
  console.log(`========================================\n`);

  const tDebut = Date.now();

  for (let i = 1; i <= NB_PARTIES; i++) {
    const stats = await jouerPartie(i);
    rapport.parties.push(stats);
    console.log(`P${i}/${NB_PARTIES} | ${stats.resultat.toUpperCase().padEnd(8)} | score=${String(stats.score).padStart(6)} | duree=${stats.duree.toFixed(1)}s | drains=${stats.drains} | combo=x${stats.comboMax} | boss=${stats.bossKills}`);
  }

  // STATS GLOBALES
  const s = rapport.stats;
  rapport.parties.forEach(p => {
    s.total++;
    if (p.resultat === 'victory') s.victoires++;
    else if (p.resultat === 'defeat') s.defaites++;
    else s.timeouts++;
    s.scoreTotal += p.score;
    if (p.score > s.scoreMax) s.scoreMax = p.score;
    if (p.score < s.scoreMin) s.scoreMin = p.score;
    s.dureeTotal += p.duree;
    if (p.duree < s.dureeMin) s.dureeMin = p.duree;
    if (p.duree > s.dureeMax) s.dureeMax = p.duree;
    s.drainsTotal += p.drains;
    if (p.comboMax > s.comboMax) s.comboMax = p.comboMax;
    s.bossKills += p.bossKills;
    s.phases2 += p.phases2;
    s.bonusDeclenches += p.bonus;
    s.perfectDeclenches += p.perfect;
  });

  const dureeTotaleMin = ((Date.now() - tDebut) / 1000 / 60).toFixed(1);

  console.log(`\n\n========================================`);
  console.log(` RAPPORT FINAL — ${NB_PARTIES} PARTIES`);
  console.log(`========================================\n`);

  console.log('## STATISTIQUES');
  console.log(`  Duree totale du test  : ${dureeTotaleMin} min`);
  console.log(`  Parties jouees        : ${s.total}`);
  console.log(`  Victoires             : ${s.victoires} (${(s.victoires/s.total*100).toFixed(0)}%)`);
  console.log(`  Defaites              : ${s.defaites} (${(s.defaites/s.total*100).toFixed(0)}%)`);
  console.log(`  Timeouts              : ${s.timeouts}`);
  console.log(`  Score total           : ${s.scoreTotal}`);
  console.log(`  Score max             : ${s.scoreMax}`);
  console.log(`  Score min             : ${s.scoreMin}`);
  console.log(`  Score moyen           : ${Math.round(s.scoreTotal/s.total)}`);
  console.log(`  Duree moyenne         : ${(s.dureeTotal/s.total).toFixed(1)}s`);
  console.log(`  Duree min/max         : ${s.dureeMin.toFixed(1)}s / ${s.dureeMax.toFixed(1)}s`);
  console.log(`  Drains total          : ${s.drainsTotal}`);
  console.log(`  Drains moyen/partie   : ${(s.drainsTotal/s.total).toFixed(1)}`);
  console.log(`  Combo max             : x${s.comboMax}`);
  console.log(`  Boss tues             : ${s.bossKills}`);
  console.log(`  Phases 2 vues         : ${s.phases2}`);
  console.log(`  Bonus declenches      : ${s.bonusDeclenches}`);
  console.log(`  PERFECT declenches    : ${s.perfectDeclenches}`);

  console.log('\n## BUGS');
  console.log(`  Erreurs JS     : ${rapport.bugs.js.length}`);
  console.log(`  Erreurs console: ${rapport.bugs.console.length}`);
  console.log(`  Incoherences   : ${rapport.bugs.incoherences.length}`);

  console.log('\n## ANALYSE FLIPPER RÉALISTE');

  const tauxVictoire = s.victoires / s.total;
  const dureeMoy = s.dureeTotal / s.total;
  const drainsMoy = s.drainsTotal / s.total;

  if (tauxVictoire > 0.9) console.log('  ⚠ Jeu TROP FACILE pour le bot (90%+ de victoires)');
  else if (tauxVictoire > 0.7) console.log('  ✅ Difficulte correcte (70-90% de victoires)');
  else if (tauxVictoire > 0.4) console.log('  ✅ Difficulte FLIPPER REALISTE (40-70% de victoires)');
  else console.log('  ⚠ Jeu TROP DUR pour le bot (<40% de victoires)');

  if (dureeMoy < 20) console.log('  ⚠ Parties trop courtes (<20s)');
  else if (dureeMoy < 45) console.log('  ✅ Duree correcte (20-45s) — style arcade');
  else if (dureeMoy < 90) console.log('  ✅ Duree FLIPPER REALISTE (45-90s)');
  else console.log('  ⚠ Parties trop longues (>90s)');

  if (drainsMoy < 1) console.log('  ⚠ Tres peu de drains (jeu trop facile)');
  else if (drainsMoy < 3) console.log('  ✅ Drains corrects (1-3 par partie)');
  else if (drainsMoy < 6) console.log('  ✅ Drains FLIPPER REALISTE (3-6 par partie)');
  else console.log('  ⚠ Trop de drains (>6 par partie)');

  if (s.bossKills < s.total / 4) console.log('  ⚠ Boss rarement tue (trop dur ?)');
  else if (s.bossKills > s.total * 0.8) console.log('  ⚠ Boss toujours tue (trop facile ?)');
  else console.log('  ✅ Boss tue de temps en temps (equilibre)');

  console.log('\n## AMÉLIORATIONS SUGGÉRÉES');
  const sugg = [];
  if (tauxVictoire > 0.85) sugg.push('Augmenter GOAL (50000 -> 70000) ou reduire les points');
  if (tauxVictoire < 0.3) sugg.push('Reduire GOAL (50000 -> 30000) ou augmenter les billes');
  if (dureeMoy < 25) sugg.push('Parties trop courtes — augmenter GOAL ou reduire les points');
  if (dureeMoy > 100) sugg.push('Parties trop longues — reduire GOAL');
  if (s.bossKills === 0) sugg.push('Boss jamais tue — reduire ses PV (5 -> 3) ou son cooldown (0.9s -> 0.6s)');
  if (s.comboMax < 5) sugg.push('Combo x5 jamais atteint — verifier le systeme de combo');
  if (sugg.length === 0) console.log('  Aucune — le jeu est bien equilibre');
  else sugg.forEach(su => console.log('  💡 ' + su));

  console.log('\n========================================');
  console.log(' FIN DU RAPPORT');
  console.log('========================================\n');

  await browser.close();
  const bugCritique = rapport.bugs.js.length > 0 || rapport.bugs.console.length > 0 || rapport.bugs.incoherences.length > 0;
  process.exit(bugCritique ? 1 : 0);

})();

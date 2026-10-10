/* MEGA-BOT — Simule 10 joueurs, teste toutes les mécaniques,
 * détecte les bugs, produit un rapport final.
 */
const { firefox } = require("playwright");

const FILE = 'file:///home/zkk/mes-jeux/cristal-dragon-v5-opencode.html';

(async () => {
  const browser = await firefox.launch({ headless: true });

  const rapport = {
    parties: [],
    bugsJS: [],
    bugsConsole: [],
    incoherences: [],
    observations: [],
    statsGlobales: {
      partiesJouees: 0,
      victoires: 0,
      defaites: 0,
      timeouts: 0,
      scoreTotal: 0,
      scoreMax: 0,
      dureeTotale: 0,
      dureeMin: Infinity,
      dureeMax: 0,
      comboMax: 0,
      drainsTotal: 0,
      bossKills: 0,
      phases2: 0,
      bonusDeclenches: 0,
      perfectDeclenches: 0,
      erreursDetectees: 0,
    }
  };

  const sleep = ms => new Promise(r => setTimeout(r, ms));

  async function jouerPartie(numPartie) {
    const page = await browser.newPage();
    const bugsJS = [];
    const bugsConsole = [];

    page.on('pageerror', e => bugsJS.push(String(e)));
    page.on('console', m => { if (m.type() === 'error') bugsConsole.push(m.text()); });

    const stats = {
      num: numPartie,
      resultat: null,
      score: 0,
      duree: 0,
      drains: 0,
      comboMax: 1,
      bossKills: 0,
      phases2Vues: 0,
      bonusDeclenches: 0,
      perfectDeclenches: 0,
      erreursJS: 0,
      erreursConsole: 0,
      observations: [],
    };

    try {
      await page.goto(FILE);
      await page.waitForLoadState('load');
      await sleep(400);

      // Instrumentation : compter les événements clés
      await page.evaluate(() => {
        window.__stats = {
          bossKills: 0, phases2: 0, bonusDeclenches: 0, perfectDeclenches: 0,
        };
        // Hook sur setState pour dÃ©tecter victory/defeat
        const origSetState = window.setState;
        if (origSetState) {
          window.setState = function(s) {
            if (s === 'victory') window.__stats.victory = true;
            if (s === 'defeat') window.__stats.defeat = true;
            return origSetState.apply(this, arguments);
          };
        }
      });

      // Démarrer la partie
      const playBtn = page.locator('button:visible').filter({ hasText: 'JOUER' }).first();
      if (await playBtn.count()) { await playBtn.click(); await sleep(300); }
      else await page.evaluate(() => startGame());

      const t0 = Date.now();
      const MAX_MS = 4 * 60 * 1000; // 4 minutes max
      let lastScore = 0;
      let lastBalls = 5;
      let lastBossHp = 5;
      let lastBonus = false;
      let lastPerfect = false;

      while (Date.now() - t0 < MAX_MS) {
        const s = await page.evaluate(() => ({
          state, score, balls, comboMult,
          bonus: typeof bonus !== 'undefined' ? bonus : false,
          perfectShown: typeof perfectShown !== 'undefined' ? perfectShown : false,
          eye: { hp: eye.hp, deadT: eye.deadT },
          ball: ball ? { x: ball.x, y: ball.y, state: ball.state } : null,
          flip: [flippers[0].pressed, flippers[1].pressed],
          projectiles: projectiles.filter(p => p.actif).length,
        }));

        // Détection de changements clés
        if (s.balls < lastBalls) { stats.drains += (lastBalls - s.balls); lastBalls = s.balls; }
        if (s.comboMult > stats.comboMax) stats.comboMax = s.comboMult;
        if (s.eye.hp < lastBossHp && s.eye.hp >= 0) {
          if (s.eye.hp === 0) stats.bossKills++;
          if (s.eye.hp === 2) stats.phases2Vues++;
          lastBossHp = s.eye.hp;
        }
        if (s.eye.hp > lastBossHp) { lastBossHp = s.eye.hp; stats.bossKills++; }
        if (s.bonus && !lastBonus) { stats.bonusDeclenches++; lastBonus = true; }
        if (!s.bonus) lastBonus = false;
        if (s.perfectShown && !lastPerfect) { stats.perfectDeclenches++; lastPerfect = true; }
        if (!s.perfectShown) lastPerfect = false;

        // Fin de partie
        if (s.state === 'victory' || s.state === 'defeat') {
          stats.resultat = s.state;
          stats.score = s.score;
          break;
        }

        // Bille dans le lanceur → tirer
        if (s.ball && s.ball.state === 'lane') {
          await page.keyboard.down('Space'); await sleep(700); await page.keyboard.up('Space');
          await sleep(200);
          continue;
        }

        // Bille absente → attendre
        if (!s.ball) { await sleep(150); continue; }

        // Stratégie experte : suivre la bille
        const bx = s.ball.x, by = s.ball.y;
        if (by > 450) {
          if (bx < 200) {
            await page.keyboard.down('ArrowLeft'); await sleep(70); await page.keyboard.up('ArrowLeft');
          } else {
            await page.keyboard.down('ArrowRight'); await sleep(70); await page.keyboard.up('ArrowRight');
          }
        } else if (by > 350) {
          await page.keyboard.down('ArrowLeft'); await page.keyboard.down('ArrowRight');
          await sleep(50);
          await page.keyboard.up('ArrowLeft'); await page.keyboard.up('ArrowRight');
        }

        await sleep(35);
      }

      stats.duree = (Date.now() - t0) / 1000;
      if (!stats.resultat) stats.resultat = 'timeout';
      stats.score = await page.evaluate(() => score);

      // Vérifier les hooks
      const hooks = await page.evaluate(() => window.__stats || {});
      stats.erreursJS = bugsJS.length;
      stats.erreursConsole = bugsConsole.length;

      // Vérifications de cohérence post-partie
      const incoherence = await page.evaluate(() => {
        const issues = [];
        if (score < 0) issues.push('score négatif');
        if (balls < 0) issues.push('billes négatives');
        if (balls > 5) issues.push('billes > 5 (' + balls + ')');
        if (comboMult < 1 || comboMult > 5) issues.push('comboMult hors limites : ' + comboMult);
        if (eye.hp < 0 || eye.hp > 5) issues.push('eye.hp hors limites : ' + eye.hp);
        if (eye.deadT < 0) issues.push('eye.deadT négatif');
        return issues;
      });
      stats.incoherences = incoherence;

      if (bugsJS.length > 0) bugsJS.forEach(b => rapport.bugsJS.push(`Partie ${numPartie}: ${b}`));
      if (bugsConsole.length > 0) bugsConsole.forEach(b => rapport.bugsConsole.push(`Partie ${numPartie}: ${b}`));
      if (incoherence.length > 0) incoherence.forEach(i => rapport.incoherences.push(`Partie ${numPartie}: ${i}`));

    } catch (e) {
      stats.erreurs = 'EXCEPTION: ' + e.message;
      rapport.bugsJS.push(`Partie ${numPartie}: EXCEPTION ${e.message}`);
    }

    await page.close();
    return stats;
  }

  // ---------- LANCER 10 PARTIES ----------
  console.log('\n========================================');
  console.log(' MEGA-BOT — 10 PARTIES COMPLETES');
  console.log('========================================\n');

  for (let i = 1; i <= 10; i++) {
    console.log(`--- Partie ${i}/10 ---`);
    const stats = await jouerPartie(i);
    rapport.parties.push(stats);

    // Log
    console.log(`  ${stats.resultat.toUpperCase()} | score=${stats.score} | durée=${stats.duree.toFixed(1)}s | drains=${stats.drains} | comboMax=x${stats.comboMax} | bossKills=${stats.bossKills} | erreursJS=${stats.erreursJS}`);
    if (stats.incoherences && stats.incoherences.length > 0) {
      console.log(`  ⚠ Incohérences : ${stats.incoherences.join(', ')}`);
    }
  }

  // ---------- STATS GLOBALES ----------
  const s = rapport.statsGlobales;
  rapport.parties.forEach(p => {
    s.partiesJouees++;
    if (p.resultat === 'victory') s.victoires++;
    else if (p.resultat === 'defeat') s.defaites++;
    else s.timeouts++;
    s.scoreTotal += p.score;
    if (p.score > s.scoreMax) s.scoreMax = p.score;
    s.dureeTotale += p.duree;
    if (p.duree < s.dureeMin) s.dureeMin = p.duree;
    if (p.duree > s.dureeMax) s.dureeMax = p.duree;
    if (p.comboMax > s.comboMax) s.comboMax = p.comboMax;
    s.drainsTotal += p.drains;
    s.bossKills += p.bossKills;
    s.phases2 += p.phases2Vues;
    s.bonusDeclenches += p.bonusDeclenches;
    s.perfectDeclenches += p.perfectDeclenches;
    s.erreursDetectees += p.erreursJS + p.erreursConsole;
  });

  // ---------- RAPPORT FINAL ----------
  console.log('\n\n========================================');
  console.log(' RAPPORT FINAL — MEGA-BOT');
  console.log('========================================\n');

  console.log('## STATISTIQUES GLOBALES\n');
  console.log(`  Parties jouées      : ${s.partiesJouees}`);
  console.log(`  Victoires           : ${s.victoires} (${(s.victoires/s.partiesJouees*100).toFixed(0)}%)`);
  console.log(`  Défaites            : ${s.defaites} (${(s.defaites/s.partiesJouees*100).toFixed(0)}%)`);
  console.log(`  Timeouts            : ${s.timeouts}`);
  console.log(`  Score total         : ${s.scoreTotal}`);
  console.log(`  Score max           : ${s.scoreMax}`);
  console.log(`  Score moyen         : ${Math.round(s.scoreTotal/s.partiesJouees)}`);
  console.log(`  Durée totale        : ${s.dureeTotale.toFixed(1)}s`);
  console.log(`  Durée moyenne       : ${(s.dureeTotale/s.partiesJouees).toFixed(1)}s`);
  console.log(`  Durée min / max     : ${s.dureeMin.toFixed(1)}s / ${s.dureeMax.toFixed(1)}s`);
  console.log(`  Combo max           : x${s.comboMax}`);
  console.log(`  Drains total        : ${s.drainsTotal}`);
  console.log(`  Boss tués           : ${s.bossKills}`);
  console.log(`  Phases 2 vues       : ${s.phases2}`);
  console.log(`  Bonus déclenchés    : ${s.bonusDeclenches}`);
  console.log(`  PERFECT déclenchés  : ${s.perfectDeclenches}`);
  console.log(`  Erreurs détectées   : ${s.erreursDetectees}`);

  console.log('\n## BUGS JAVASCRIPT');
  if (rapport.bugsJS.length === 0) console.log('  Aucun');
  else rapport.bugsJS.forEach(b => console.log('  ❌ ' + b));

  console.log('\n## BUGS CONSOLE');
  if (rapport.bugsConsole.length === 0) console.log('  Aucun');
  else rapport.bugsConsole.forEach(b => console.log('  ❌ ' + b));

  console.log('\n## INCOHÉRENCES DÉTECTÉES');
  if (rapport.incoherences.length === 0) console.log('  Aucune');
  else rapport.incoherences.forEach(i => console.log('  ⚠ ' + i));

  console.log('\n## DÉFAUTS / OBSERVATIONS');
  if (s.victoires + s.defaites < s.partiesJouees) {
    console.log(`  ⚠ ${s.timeouts} partie(s) n'ont pas fini en 4 min (peut-être trop dur ou bug)`);
  }
  if (s.erreursDetectees > 0) {
    console.log(`  ❌ ${s.erreursDetectees} erreur(s) JS/console détectée(s)`);
  }
  if (s.drainsTotal > s.partiesJouees * 5) {
    console.log(`  ⚠ Trop de drains (${s.drainsTotal} pour ${s.partiesJouees} parties) — jeu peut-être trop dur`);
  }
  if (s.victoires === s.partiesJouees) {
    console.log(`  ⚠ Le bot gagne TOUJOURS (100%) — jeu peut-être trop facile`);
  }
  if (s.comboMax < 5) {
    console.log(`  ⚠ Combo max atteint : x${s.comboMax} (jamais x5) — le système de combo est peut-être mal calibré`);
  }
  if (s.bossKills < s.partiesJouees / 2) {
    console.log(`  ⚠ Boss peu tué (${s.bossKills} sur ${s.partiesJouees} parties) — trop dur ?`);
  }
  if (rapport.bugsJS.length === 0 && rapport.bugsConsole.length === 0 && rapport.incoherences.length === 0) {
    console.log('  ✅ Aucun défaut critique détecté');
  }

  console.log('\n## AMÉLIORATIONS SUGGÉRÉES');
  const suggestions = [];
  if (s.victoires / s.partiesJouees > 0.8) suggestions.push('Réduire GOAL ou augmenter la difficulté (bot gagne trop)');
  if (s.victoires / s.partiesJouees < 0.3) suggestions.push('Réduire la difficulté (bot perd trop)');
  if (s.dureeTotale / s.partiesJouees < 20) suggestions.push('Parties trop courtes (<20s) — augmenter GOAL');
  if (s.dureeTotale / s.partiesJouees > 120) suggestions.push('Parties trop longues (>2min) — réduire GOAL');
  if (s.bonusDeclenches < s.partiesJouees / 2) suggestions.push('Bonus peu déclenché — les runes sont peut-être trop dures à activer');
  if (s.perfectDeclenches < s.partiesJouees / 2) suggestions.push('PERFECT peu déclenché — combo x5 trop dur à atteindre');
  if (suggestions.length === 0) console.log('  Aucune — le jeu est bien équilibré');
  else suggestions.forEach(sug => console.log('  💡 ' + sug));

  console.log('\n========================================');
  console.log(' FIN DU RAPPORT');
  console.log('========================================\n');

  await browser.close();

  // Exit code : 0 si aucun bug critique, 1 sinon
  const bugCritique = rapport.bugsJS.length > 0 || rapport.bugsConsole.length > 0 || rapport.incoherences.length > 0;
  process.exit(bugCritique ? 1 : 0);

})();

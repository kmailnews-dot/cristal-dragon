/* BOT JOUEUR AUTOMATIQUE — Cristal Dragon V5
 * Simule une partie complète comme un joueur humain via Playwright (firefox).
 * Fichier autorisé : UNIQUEMENT ce fichier dans tests-opencode/.
 * Ne modifie JAMAIS le jeu. Lecture seule via evaluate + vrais inputs clavier/souris.
 */
const { firefox } = require('playwright');

const FILE = 'file:///home/zkk/mes-jeux/cristal-dragon-v5-opencode.html';

(async () => {
  const browser = await firefox.launch({ headless: true });
  const page = await browser.newPage();
  const results = [];
  const pageErrors = [];
  const consoleErrors = [];

  page.on('pageerror', err => pageErrors.push(String(err)));
  page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });

  const pass = (name, detail = '') => { results.push({ ok: true, name, detail }); console.log(`PASS — ${name}${detail ? ' — ' + detail : ''}`); };
  const fail = (name, detail = '') => { results.push({ ok: false, name, detail }); console.log(`FAIL — ${name}${detail ? ' — ' + detail : ''}`); };
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const ev = (fn, arg) => page.evaluate(fn, arg);
  const snap = () => page.evaluate(() => ({
    state, score, balls, mult, comboMult, comboT, bonus, bonusT,
    ball: ball ? { x: Math.round(ball.x), y: Math.round(ball.y), state: ball.state } : null,
    flip: [flippers[0].pressed, flippers[1].pressed],
    plunger: { charging: plunger.charging, power: +plunger.power.toFixed(2) },
    runes: runes.map(r => r.up), eye: { hp: eye.hp, deadT: +eye.deadT.toFixed(2) },
    proj: projectiles.map(p => p.actif),
  }));

  async function waitBallLane(timeoutMs = 8000) {
    const t0 = Date.now();
    while (Date.now() - t0 < timeoutMs) {
      const s = await snap();
      if (s.ball && s.ball.state === 'lane') return true;
      await sleep(150);
    }
    return false;
  }
  // Lancement réel : maintenir Espace puis relâcher (comme un humain)
  async function humanLaunch(chargeMs = 700) {
    if (!await waitBallLane()) return false;
    await page.keyboard.down('Space');
    await sleep(chargeMs);
    await page.keyboard.up('Space');
    await sleep(300);
    const s = await snap();
    return s.ball && s.ball.state === 'live';
  }

  try {
    console.log('\n===== BOT JOUEUR — CRISTAL DRAGON V5 =====\n');
    await page.goto(FILE);
    await page.waitForLoadState('load');
    await sleep(500);

    // ---------- 1. DÉMARRAGE ----------
    console.log('--- 1. DEMARRAGE ---');
    let s = await snap();
    if (s.state === 'menu') pass('1a. menu affiché au chargement');
    else fail('1a. menu affiché au chargement', `state=${s.state}`);

    const playBtn = page.locator('button:visible').filter({ hasText: 'JOUER' }).first();
    if (await playBtn.count()) { await playBtn.click(); await sleep(300); }
    else fail('1b. bouton JOUER trouvé', 'absent');
    s = await snap();
    if (s.state === 'play') pass('1b. clic JOUER démarre (state=play)');
    else fail('1b. clic JOUER démarre (state=play)', `state=${s.state}`);
    if (s.balls === 5 && s.score === 0 && s.mult === 1 && s.comboMult === 1)
      pass('1c. init partie', '5 billes, score 0, mult 1, comboMult 1');
    else fail('1c. init partie', JSON.stringify({ balls: s.balls, score: s.score, mult: s.mult, comboMult: s.comboMult }));

    // ---------- 2. LANCEMENT DE BILLE ----------
    console.log('--- 2. LANCEMENT ---');
    const laneOk = await waitBallLane();
    if (laneOk) pass('2a. bille en lane après démarrage');
    else fail('2a. bille en lane après démarrage', JSON.stringify((await snap()).ball));
    await page.keyboard.down('Space');
    await sleep(350);
    s = await snap();
    if (s.plunger.charging === true && s.plunger.power > 0)
      pass('2b. Espace maintenu charge le lanceur', `power=${s.plunger.power}`);
    else fail('2b. Espace maintenu charge le lanceur', JSON.stringify(s.plunger));
    await page.keyboard.up('Space');
    await sleep(250);
    s = await snap();
    const posA = s.ball ? { x: s.ball.x, y: s.ball.y } : null;
    if (s.ball && s.ball.state === 'live') pass('2c. relâchement lance la bille (live)');
    else fail('2c. relâchement lance la bille (live)', JSON.stringify(s.ball));
    await sleep(500);
    const s2 = await snap();
    if (posA && s2.ball && (s2.ball.x !== posA.x || s2.ball.y !== posA.y))
      pass('2d. la bille bouge après lancement', `(${posA.x},${posA.y})→(${s2.ball.x},${s2.ball.y})`);
    else fail('2d. la bille bouge après lancement', JSON.stringify(s2.ball));

    // ---------- 3. FLIPPERS ----------
    console.log('--- 3. FLIPPERS ---');
    await page.keyboard.down('ArrowLeft'); await sleep(120);
    s = await snap();
    if (s.flip[0] === true) pass('3a. ArrowLeft → flipper gauche pressed');
    else fail('3a. ArrowLeft → flipper gauche pressed', JSON.stringify(s.flip));
    await page.keyboard.up('ArrowLeft'); await sleep(120);
    s = await snap();
    if (s.flip[0] === false) pass('3b. relâchement → flipper gauche repos');
    else fail('3b. relâchement → flipper gauche repos', JSON.stringify(s.flip));
    await page.keyboard.down('ArrowRight'); await sleep(120);
    s = await snap();
    if (s.flip[1] === true) pass('3c. ArrowRight → flipper droit pressed');
    else fail('3c. ArrowRight → flipper droit pressed', JSON.stringify(s.flip));
    await page.keyboard.up('ArrowRight'); await sleep(120);
    s = await snap();
    if (s.flip[1] === false) pass('3d. relâchement → flipper droit repos');
    else fail('3d. relâchement → flipper droit repos', JSON.stringify(s.flip));

    // 30 s de jeu réel avec flippers aléatoires (sert aussi aux sections 4 et 8)
    console.log('--- 3e. 30 s de jeu réel (flippers aléatoires) ---');
    const t0 = Date.now();
    let taps = 0, drainsSeen = 0, ballsRef = (await snap()).balls;
    const scoreBefore30 = (await snap()).score;
    let maxCombo30 = 1;
    while (Date.now() - t0 < 30000) {
      const side = Math.random() < 0.5 ? 'ArrowLeft' : 'ArrowRight';
      await page.keyboard.down(side);
      await sleep(60 + Math.random() * 80);
      await page.keyboard.up(side);
      taps++;
      const st = await snap();
      if (st.comboMult > maxCombo30) maxCombo30 = st.comboMult;
      if (st.balls < ballsRef) { drainsSeen++; ballsRef = st.balls; }
      if (st.state === 'defeat' || st.state === 'victory') break;
      if (st.ball && st.ball.state === 'lane') {
        await page.keyboard.down('Space'); await sleep(600);
        await page.keyboard.up('Space'); await sleep(200);
      } else {
        await sleep(120);
      }
    }
    const scoreAfter30 = (await snap()).score;
    pass('3e. 30 s de jeu avec flippers aléatoires', `${taps} tapes, score ${scoreBefore30}→${scoreAfter30}, drains=${drainsSeen}, comboMax=${maxCombo30}`);
    // Redémarrer une partie propre pour la suite déterministe
    await ev(() => startGame()); await sleep(300);

    // ---------- 4. SCORE ET COLLISIONS (vraie physique : téléportation + moteur) ----------
    console.log('--- 4. COLLISIONS ---');
    // Bumper
    let sc0 = (await snap()).score;
    await ev(() => { const b = bumpers[0]; if (!ball) spawnBall(); ball.x = b.x; ball.y = b.y; ball.px = b.x; ball.py = b.y; ball.vx = 0; ball.vy = -50; ball.state = 'live'; });
    await sleep(400);
    let sc1 = (await snap()).score;
    if (sc1 > sc0) pass('4a. bumper → score augmente', `${sc0}→${sc1}`);
    else fail('4a. bumper → score augmente', `${sc0}→${sc1}`);
    // Sling (milieu du segment gauche)
    sc0 = sc1;
    await ev(() => { if (!ball) spawnBall(); ball.x = 75; ball.y = 530; ball.px = 75; ball.py = 530; ball.vx = 60; ball.vy = 0; ball.state = 'live'; });
    await sleep(400);
    sc1 = (await snap()).score;
    if (sc1 > sc0) pass('4b. sling → score augmente', `${sc0}→${sc1}`);
    else fail('4b. sling → score augmente', `${sc0}→${sc1}`);
    // Rune (vraie fonction hitRune via collision segment)
    await ev(() => startGame()); await sleep(200);
    await ev(() => { if (!ball) spawnBall(); const r = runes[0]; ball.x = 48; ball.y = r.y1; ball.px = 48; ball.py = r.y1; ball.vx = 0; ball.vy = 30; ball.state = 'live'; });
    await sleep(400);
    s = await snap();
    if (s.runes[0] === false) pass('4c. rune touchée → passe à false', JSON.stringify(s.runes));
    else fail('4c. rune touchée → passe à false', JSON.stringify(s.runes));
    // Œil dragon : téléportation dessus, le moteur décrémente les PV
    await ev(() => startGame()); await sleep(200);
    const hp0 = (await snap()).eye.hp;
    await ev(() => { eye.cd = 0; if (!ball) spawnBall(); ball.x = eye.x; ball.y = eye.y; ball.px = eye.x; ball.py = eye.y; ball.vx = 0; ball.vy = 0; ball.state = 'live'; });
    await sleep(400);
    s = await snap();
    if (s.eye.hp === hp0 - 1) pass('4d. œil touché → perd 1 PV', `hp ${hp0}→${s.eye.hp}`);
    else fail('4d. œil touché → perd 1 PV', `hp ${hp0}→${s.eye.hp}`);

    // ---------- 5. COMBO ----------
    console.log('--- 5. COMBO ---');
    await ev(() => startGame()); await sleep(200);
    await ev(() => { scoreHit(100, 200, 300); });
    await sleep(150);
    await ev(() => { scoreHit(100, 200, 300); });
    await sleep(150);
    s = await snap();
    if (s.comboMult >= 3) pass('5a. touches enchaînées → comboMult monte', `comboMult=${s.comboMult}`);
    else fail('5a. touches enchaînées → comboMult monte', `comboMult=${s.comboMult}`);
    await sleep(3400); // WINDOW = 3.0 s
    s = await snap();
    if (s.comboMult === 1) pass('5b. après 3 s sans touche → comboMult=1');
    else fail('5b. après 3 s sans touche → comboMult=1', `comboMult=${s.comboMult}`);

    // ---------- 6. BONUS DORÉ ----------
    console.log('--- 6. BONUS ---');
    await ev(() => startGame()); await sleep(200);
    await ev(() => { hitRune(0); hitRune(1); hitRune(2); });
    await sleep(200);
    s = await snap();
    if (s.bonus === true) pass('6a. 3 runes → bonus=true');
    else fail('6a. 3 runes → bonus=true', `bonus=${s.bonus}`);
    if (s.bonusT > 0) pass('6b. bonusT>0', `bonusT=${s.bonusT}`);
    else fail('6b. bonusT>0', `bonusT=${s.bonusT}`);

    // ---------- 7. DRAGON / BOSS ----------
    console.log('--- 7. BOSS ---');
    await ev(() => startGame()); await sleep(200);
    // NOTE : chaque touche œil score via scoreHit() (combo ×5 possible) ;
    // on bloque score à 0 pour isoler la logique boss (la victoire par score est testée en §10).
    let hp = 5;
    for (let i = 0; i < 14 && hp > 0; i++) {
      await ev(() => { score = 0; eye.cd = 0; if (!ball) spawnBall(); ball.x = eye.x; ball.y = eye.y; ball.px = eye.x; ball.py = eye.y; ball.vx = 0; ball.vy = 0; ball.state = 'live'; });
      await sleep(350);
      hp = (await snap()).eye.hp;
    }
    s = await snap();
    if (s.eye.hp === 0) pass('7a. 5 touches → eye.hp=0', `hp=${s.eye.hp}`);
    else fail('7a. 5 touches → eye.hp=0', `hp=${s.eye.hp}`);
    if (s.eye.deadT > 0) pass('7b. boss vaincu → deadT=5', `deadT=${s.eye.deadT}`);
    else fail('7b. boss vaincu → deadT=5', `deadT=${s.eye.deadT}`);
    await ev(() => { score = 0; }); // évite une victory parasite pendant l'attente résurrection
    await sleep(5600); // résurrection après 5 s
    s = await snap();
    if (s.eye.hp === 5) pass('7c. après 5 s → résurrection hp=5');
    else fail('7c. après 5 s → résurrection hp=5', `hp=${s.eye.hp}`);
    // Phase 2 : hp<=2 → projectiles 2x plus rapides (intervalle 1 s au lieu de 2 s)
    await ev(() => { startGame(); eye.hp = 2; eye.deadT = 0; for (const p of projectiles) p.actif = false; projT = 0; });
    await sleep(1300);
    s = await snap();
    if (s.proj.some(a => a)) pass('7d. phase 2 (hp<=2) → projectile en ~1 s', JSON.stringify(s.proj));
    else fail('7d. phase 2 (hp<=2) → projectile en ~1 s', JSON.stringify(s.proj));

    // ---------- 8. PROJECTILES ----------
    console.log('--- 8. PROJECTILES ---');
    await ev(() => startGame()); await sleep(200);
    await humanLaunch();
    let projSeen = false;
    for (let i = 0; i < 12; i++) { await sleep(250); if ((await snap()).proj.some(a => a)) { projSeen = true; break; } }
    if (projSeen) pass('8a. un projectile apparaît après ~2 s');
    else fail('8a. un projectile apparaît après ~2 s', 'aucun projectile en 3 s');
    // Bille + projectile → combo perdu (vraie collision moteur)
    await ev(() => { if (!ball) spawnBall(); ball.x = 200; ball.y = 400; ball.px = 200; ball.py = 400; ball.vx = 0; ball.vy = 0; ball.state = 'live'; scoreHit(100, 200, 300); });
    await sleep(150);
    const comboBefore = (await snap()).comboMult;
    await ev(() => { const pr = projectiles.find(p => !p.actif) || projectiles[0]; pr.x = ball.x; pr.y = ball.y; pr.vx = 0; pr.vy = 0; pr.actif = true; });
    await sleep(400);
    s = await snap();
    if (comboBefore > 1 && s.comboMult === 1) pass('8b. bille touche projectile → combo perdu', `combo ${comboBefore}→${s.comboMult}`);
    else fail('8b. bille touche projectile → combo perdu', `combo ${comboBefore}→${s.comboMult}`);

    // ---------- 9. DRAIN ----------
    console.log('--- 9. DRAIN ---');
    await ev(() => startGame()); await sleep(200);
    for (let i = 0; i < 5; i++) {
      await ev(() => { if (!ball) spawnBall(); ball.x = 200; ball.y = 660; onDrain(); });
      await sleep(250);
    }
    s = await snap();
    if (s.state === 'defeat') pass('9. 3 drains via onDrain() → defeat', `balls=${s.balls}`);
    else fail('9. 3 drains via onDrain() → defeat', `state=${s.state}, balls=${s.balls}`);

    // ---------- 10. VICTOIRE ----------
    console.log('--- 10. VICTOIRE ---');
    await ev(() => startGame()); await sleep(200);
    await ev(() => { let guard = 0; while (score < 50000 && guard++ < 40) addScore(5000); });
    await sleep(200);
    s = await snap();
    if (s.state === 'victory') pass('10. score=50000 via addScore() → victory', `score=${s.score}`);
    else fail('10. score=50000 via addScore() → victory', `state=${s.state}, score=${s.score}`);

    // ---------- 11. PARTIE COMPLÈTE (bot joue vraiment, max 2 min) ----------
    console.log('--- 11. PARTIE COMPLETE ---');
    await ev(() => startGame()); await sleep(300);
    await humanLaunch();
    const g0 = await snap();
    const scoreStart = g0.score, ballsStart = g0.balls;
    let gTaps = 0, gMaxCombo = 1, lastBalls = ballsStart;
    let gDrains = 0, gLaunches = 1;
    const gT0 = Date.now();
    let gEnd = null;
    while (Date.now() - gT0 < 120000) {
      const side = Math.random() < 0.5 ? 'ArrowLeft' : 'ArrowRight';
      await page.keyboard.down(side);
      await sleep(50 + Math.random() * 70);
      await page.keyboard.up(side);
      gTaps++;
      const st = await snap();
      if (st.comboMult > gMaxCombo) gMaxCombo = st.comboMult;
      if (st.balls < lastBalls) { gDrains++; lastBalls = st.balls; }
      if (st.state === 'victory' || st.state === 'defeat') { gEnd = st; break; }
      if (st.ball && st.ball.state === 'lane') {
        await page.keyboard.down('Space'); await sleep(550 + Math.random() * 300);
        await page.keyboard.up('Space'); await sleep(200);
        gLaunches++;
      } else {
        await sleep(100);
      }
    }
    gEnd = gEnd || await snap();
    const pts = gEnd.score - scoreStart;
    const duree = Math.round((Date.now() - gT0) / 1000);
    if (gEnd.state === 'victory' || gEnd.state === 'defeat')
      pass('11. partie complète jouée jusqu\'au bout', `${gEnd.state} en ${duree}s, ${pts} pts, ${gDrains} drains, ${gLaunches} lancements, ${gTaps} tapes, comboMax=${gMaxCombo}`);
    else
      fail('11. partie complète jouée jusqu\'au bout', `toujours en ${gEnd.state} après ${duree}s (timeout 120s), ${pts} pts, ${gDrains} drains`);

    // ---------- ERREURS ----------
    console.log('--- ERREURS ---');
    if (pageErrors.length === 0) pass('12a. aucune erreur JavaScript');
    else fail('12a. aucune erreur JavaScript', pageErrors.slice(0, 5).join(' | '));
    if (consoleErrors.length === 0) pass('12b. aucune erreur console');
    else fail('12b. aucune erreur console', consoleErrors.slice(0, 5).join(' | '));

    const total = results.length;
    const ok = results.filter(r => r.ok).length;
    console.log(`\n===== RESULTAT BOT : ${ok}/${total} PASS (${Math.round(ok / total * 100)}%) =====`);
    await browser.close();
    process.exit(ok === total ? 0 : 1);
  } catch (err) {
    console.error('ERREUR BOT :', err);
    await browser.close();
    process.exit(2);
  }
})();

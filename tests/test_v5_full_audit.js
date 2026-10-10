/* Audit complet CRISTAL DRAGON — 12 sections, lecture seule du jeu.
 * Usage : node tests/test_v5_full_audit.js
 * Produit : console + tests/AUDIT_REPORT.md
 * Contrainte : ne modifie JAMAIS cristal-dragon.html (etat manipule via evaluate uniquement).
 */
const { firefox } = require('playwright');
const fs = require('fs');
const path = require('path');

const GAME = 'file:///home/zkk/mes-jeux/cristal-dragon.html';
const REPORT = '/home/zkk/mes-jeux/tests/AUDIT_REPORT.md';
const T0 = Date.now();

const results = []; // {section, name, ok, detail}
function rec(section, name, ok, detail = '') {
  results.push({ section, name, ok: !!ok, detail: String(detail) });
  console.log(`${ok ? 'PASS' : 'FAIL'} [${section}] ${name}${detail ? ' — ' + detail : ''}`);
}

let browser, ctx, page;

async function newPage() {
  if (page) await page.close().catch(() => {});
  page = await ctx.newPage();
  await page.goto(GAME);
  await page.waitForLoadState('load');
  await page.waitForFunction(() => typeof window.debugState === 'function', null, { timeout: 15000 });
  // Etat deterministe : vide le localStorage puis recharge
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.waitForLoadState('load');
  await page.waitForFunction(() => typeof window.debugState === 'function', null, { timeout: 15000 });
}

const ds = () => page.evaluate(() => JSON.parse(window.debugState()));
const ev = (fn) => page.evaluate(fn);
async function clickAction(a) {
  await page.locator(`[data-action="${a}"]`).first().click();
}

async function section(name, fn) {
  try {
    await newPage();
    await fn();
  } catch (e) {
    rec(name, 'section sans crash', false, 'EXCEPTION: ' + (e.message || e).split('\n')[0]);
  }
}

(async () => {
  browser = await firefox.launch({ headless: true });
  ctx = await browser.newContext({ viewport: { width: 500, height: 900 } });

  // ---------- 1. MENU PRINCIPAL ----------
  await section('MENU', async () => {
    const btns = await ev(() => {
      const vis = (el) => !!(el.offsetWidth || el.offsetHeight);
      const has = (t) => {
        const els = [...document.querySelectorAll('#overlay [data-action]')];
        const b = els.find((e) => e.textContent.trim().includes(t));
        return b ? vis(b) : false;
      };
      return {
        jouer: has('JOUER'), entr: has('Entra'), modes: has('Modes'),
        shop: has('Boutique'), quetes: has('Quêtes'), tuto: has('Tutoriel'),
        stats: has('Statistiques'), ach: has('Succès'), about: has('propos'),
        resumeVisible: (() => { const b = document.getElementById('btnResume'); return b ? (b.style.display !== 'none' && vis(b)) : false; })(),
        coins: (document.getElementById('mCoins') || {}).textContent || ''
      };
    });
    const labels = ['jouer', 'entr', 'modes', 'shop', 'quetes', 'tuto', 'stats', 'ach', 'about'];
    const n = labels.filter((k) => btns[k]).length;
    rec('MENU', `9 boutons presents (${n}/9)`, n === 9, JSON.stringify(btns));
    rec('MENU', 'solde Pieces visible', /Pièces/.test(btns.coins), btns.coins);
    rec('MENU', 'bouton Reprendre cache sans save', btns.resumeVisible === false, 'visible=' + btns.resumeVisible);
  });

  // ---------- 2. MODE CLASSIQUE ----------
  await section('CLASSIQUE', async () => {
    await clickAction('play');
    await page.waitForFunction(() => { try { return JSON.parse(window.debugState()).etat === 'play'; } catch { return false; } }, null, { timeout: 8000 });
    const s = await ev(() => ({ m: gameMode, b: bossType, balls, goal, hp: eye.hp, maxHp: eye.maxHp }));
    rec('CLASSIQUE', 'gameMode=classic, bossType=gold', s.m === 'classic' && s.b === 'gold', `mode=${s.m} boss=${s.b}`);
    rec('CLASSIQUE', '5 billes, objectif 50000', s.balls === 5 && s.goal === 50000, `balls=${s.balls} goal=${s.goal}`);
    rec('CLASSIQUE', 'boss 5 PV', s.hp === 5 && s.maxHp === 5, `hp=${s.hp}/${s.maxHp}`);
    const c = await ev(() => { comboT = 0; comboMult = 1; scoreHit(100, 200, 300); scoreHit(100, 200, 300); scoreHit(100, 200, 300); scoreHit(100, 200, 300); return { comboMult, comboT }; });
    rec('CLASSIQUE', 'combo monte (4x scoreHit -> x5)', c.comboMult === 5, 'comboMult=' + c.comboMult);
    const p = await ev(() => { powerup = null; powerupT = 0.01; return true; });
    await page.waitForTimeout(600);
    const p2 = await ev(() => powerup !== null);
    rec('CLASSIQUE', 'power-up spawn apres 15s (force)', p && p2, 'powerup present=' + p2);
    const d = await ev(() => {
      if (!ball) spawnBall(); ball.state = 'live'; ball.x = 200; ball.y = 400;
      const avant = balls; onDrain(); return { avant, apres: balls };
    });
    rec('CLASSIQUE', 'drain decremente billes', d.apres === d.avant - 1, `${d.avant}->${d.apres}`);
  });

  // ---------- 3. MODE CHRONO ----------
  await section('CHRONO', async () => {
    await clickAction('modes');
    await clickAction('mode-chrono');
    await page.waitForFunction(() => { try { return JSON.parse(window.debugState()).etat === 'play'; } catch { return false; } }, null, { timeout: 8000 });
    const s = await ev(() => ({ m: gameMode, b: bossType, balls, goal, hp: eye.hp, maxHp: eye.maxHp, ct: chronoT }));
    rec('CHRONO', "gameMode=chrono, bossType=fire", s.m === 'chrono' && s.b === 'fire', `mode=${s.m} boss=${s.b}`);
    rec('CHRONO', '3 billes, objectif 30000', s.balls === 3 && s.goal === 30000, `balls=${s.balls} goal=${s.goal}`);
    rec('CHRONO', 'boss 3 PV', s.hp === 3 && s.maxHp === 3, `hp=${s.hp}/${s.maxHp}`);
    rec('CHRONO', 'timer demarre a 60', s.ct <= 60 && s.ct > 50, 'chronoT=' + s.ct);
    await ev(() => { chronoT = 0.3; });
    let etat = '';
    try {
      await page.waitForFunction(() => { try { return JSON.parse(window.debugState()).etat === 'defeat'; } catch { return false; } }, null, { timeout: 6000 });
      etat = 'defeat';
    } catch { etat = (await ds()).etat; }
    rec('CHRONO', 'chronoT=0 -> defeat', etat === 'defeat', 'etat=' + etat);
  });

  // ---------- 4. MODE SURVIE ----------
  await section('SURVIE', async () => {
    await clickAction('modes');
    await clickAction('mode-survie');
    await page.waitForFunction(() => { try { return JSON.parse(window.debugState()).etat === 'play'; } catch { return false; } }, null, { timeout: 8000 });
    const s = await ev(() => ({ m: gameMode, b: bossType, balls, goal, hp: eye.hp, maxHp: eye.maxHp, bumper: MODES.survie.bumper }));
    rec('SURVIE', "gameMode=survie, bossType=ice", s.m === 'survie' && s.b === 'ice', `mode=${s.m} boss=${s.b}`);
    rec('SURVIE', '1 bille, objectif 20000', s.balls === 1 && s.goal === 20000, `balls=${s.balls} goal=${s.goal}`);
    rec('SURVIE', 'boss 8 PV', s.hp === 8 && s.maxHp === 8, `hp=${s.hp}/${s.maxHp}`);
    const g = await ev(() => { const a = score; comboT = 0; comboMult = 1; scoreHit(MODES.survie.bumper, 200, 300); return { bumper: MODES.survie.bumper, gain: score - a, mult: comboMult }; });
    rec('SURVIE', 'bumpers donnent 500', g.bumper === 500 && g.gain === 500 * g.mult, `base=${g.bumper} gain=${g.gain} (x${g.mult})`);
    await ev(() => {
      if (!ball) spawnBall(); ball.state = 'live'; ball.x = 200; ball.y = 400; ball.vx = 200; ball.vy = 200;
      projectiles[0].x = 200; projectiles[0].y = 400; projectiles[0].vx = 0; projectiles[0].vy = 200; projectiles[0].actif = true;
    });
    await page.waitForTimeout(400);
    const sl = await ev(() => ({ slowT, comboMult }));
    rec('SURVIE', 'effet slow (projectile -> slowT>0)', sl.slowT > 0, 'slowT=' + sl.slowT);
  });

  // ---------- 5. ENTRAINEMENT ----------
  await section('TRAINING', async () => {
    await clickAction('training');
    await page.waitForFunction(() => { try { return JSON.parse(window.debugState()).etat === 'play'; } catch { return false; } }, null, { timeout: 8000 });
    const t = await ev(() => trainingMode);
    rec('TRAINING', 'trainingMode=true', t === true, 'trainingMode=' + t);
    const b = await ev(() => {
      for (let i = 0; i < 10; i++) { if (!ball) spawnBall(); ball.state = 'live'; ball.x = 200; ball.y = 400; onDrain(); }
      return balls;
    });
    rec('TRAINING', '10x onDrain -> billes infinies (5)', b === 5, 'balls=' + b);
    const a = await ev(() => {
      achievements = {}; score = 50000; best = 50000; stats.bossKills = 10;
      checkAchievements();
      return { keys: Object.keys(achievements), scoreLocked: !achievements['score10000'], bossLocked: !achievements['roiFlipper'] };
    });
    rec('TRAINING', 'checkAchievements ne debloque rien (sauf modeTraining)', a.scoreLocked && a.bossLocked, 'unlocks=' + JSON.stringify(a.keys));
    const st = await ev(() => {
      const v0 = stats.victories, d0 = stats.defeats, t0 = stats.trainingGames;
      score = goal + 1000; setState('victory');
      return { v: stats.victories - v0, d: stats.defeats - d0, t: stats.trainingGames, tOk: t0 >= 1 };
    });
    rec('TRAINING', 'stats non enregistrees (victories+0, trainingGames++)', st.v === 0 && st.d === 0 && st.tOk, `victories+${st.v} defeats+${st.d} trainingGames=${st.t}`);
  });

  // ---------- 6. BOUTIQUE ----------
  await section('BOUTIQUE', async () => {
    await clickAction('shop');
    await page.waitForTimeout(300);
    const n = await ev(() => document.getElementById('shopList').children.length);
    rec('BOUTIQUE', '4 skins listes', n === 4, 'skins=' + n);
    await ev(() => { coins = 200; saveCoins(200); renderShop(); });
    await page.locator('button[data-action="buy-skin"][data-skin="gold"]').first().click();
    await page.waitForTimeout(300);
    const shop = await ev(() => ({ owned: isSkinOwned('gold'), skin: currentSkin, coins }));
    rec('BOUTIQUE', 'acheter gold (100 pieces)', shop.owned === true, `owned=${shop.owned} coins=${shop.coins}`);
    // Equiper : passer sur classic puis re-equiper gold
    await ev(() => { renderShop(); });
    const eqBtn = page.locator('button[data-action="equip-skin"][data-skin="classic"]').first();
    if (await eqBtn.count() > 0) { await eqBtn.click(); await page.waitForTimeout(200); }
    const mid = await ev(() => currentSkin);
    await ev(() => { renderShop(); });
    await page.locator('button[data-action="equip-skin"][data-skin="gold"]').first().click();
    await page.waitForTimeout(200);
    const fin = await ev(() => currentSkin);
    rec('BOUTIQUE', 'equiper gold', fin === 'gold', `classic->${mid}->${fin}`);
    const db = await ev(() => { try { if (!ball) spawnBall(); ball.state = 'live'; ball.x = 200; ball.y = 400; drawBall(1); return 'ok'; } catch (e) { return 'CRASH:' + e.message; } });
    rec('BOUTIQUE', 'drawBall applique le skin sans crash', db === 'ok', db);
  });

  // ---------- 7. QUETES ----------
  await section('QUETES', async () => {
    await clickAction('quests');
    await page.waitForTimeout(300);
    const q = await ev(() => ({
      n: document.getElementById('questList').children.length,
      txt: document.getElementById('questList').textContent
    }));
    rec('QUETES', '3 quetes listees', q.n === 3, 'quetes=' + q.n);
    rec('QUETES', 'progression affichee (0/5, 0/2, 0/1)',
      q.txt.includes('0/5') && q.txt.includes('0/2') && q.txt.includes('0/1'), q.txt.slice(0, 120));
    const r = await ev(() => {
      const avant = coins;
      for (let i = 0; i < 5; i++) checkQuests('gameend');
      const jq = questById('joueur');
      return { done: jq.done, prog: jq.progress, gain: coins - avant };
    });
    rec('QUETES', "5 parties -> quete 'joueur' done +50 pieces", r.done === true && r.gain === 50, `done=${r.done} ${r.prog}/5 gain=${r.gain}`);
  });

  // ---------- 8. SUCCES ----------
  await section('SUCCES', async () => {
    await clickAction('achievements');
    await page.waitForTimeout(300);
    const n = await ev(() => document.getElementById('achList').children.length);
    rec('SUCCES', '30 succes listes', n === 30, 'succes=' + n);
    const s = await ev(() => {
      achievements = {}; gamesPlayed = 1;
      checkAchievements();
      const b = document.getElementById('achBanner');
      return { unlocked: !!achievements['premierPas'], banner: b ? b.textContent : '(absent)', queued: achQueue.length };
    });
    rec('SUCCES', 'deblocage -> notification', s.unlocked && /SUCCÈS/.test(s.banner), `premierPas=${s.unlocked} banner="${s.banner.slice(0, 60)}"`);
  });

  // ---------- 9. STATISTIQUES ----------
  await section('STATS', async () => {
    await clickAction('stats');
    await page.waitForTimeout(300);
    const s = await ev(() => ({
      g: document.getElementById('stGames').textContent,
      w: document.getElementById('stWin').textContent,
      d: document.getElementById('stDef').textContent,
      b: document.getElementById('stBest').textContent,
      t: document.getElementById('stTotal').textContent,
      ti: document.getElementById('stTime').textContent,
      hist: !!document.getElementById('histList')
    }));
    const all = [s.g, s.w, s.d, s.b, s.t, s.ti].every((x) => typeof x === 'string' && x.length > 3);
    rec('STATS', 'toutes les stats affichees', all, `${s.g} | ${s.w} | ${s.d} | ${s.b} | ${s.t} | ${s.ti}`);
    rec('STATS', 'historique present', s.hist === true, 'histList=' + s.hist);
  });

  // ---------- 10. DECOR (pixels canvas) ----------
  await section('DECOR', async () => {
    await clickAction('play');
    await page.waitForFunction(() => { try { return JSON.parse(window.debugState()).etat === 'play'; } catch { return false; } }, null, { timeout: 8000 });
    await page.waitForTimeout(600);
    const px = await ev(() => {
      const cv = document.getElementById('game');
      const g = cv.getContext('2d');
      const K = cv.width / 400; // ctx mis a l'echelle par view.k -> echantillonner en backing-store
      const get = (x, y) => { const d = g.getImageData(x * K | 0, y * K | 0, 1, 1).data; return [d[0], d[1], d[2]]; };
      let nonBlack = 0, n = 0, sum = 0;
      for (let y = 40; y < 700; y += 40) for (let x = 20; x < 400; x += 40) {
        const p = get(x, y); n++; const l = (p[0] + p[1] + p[2]) / 3; sum += l; if (l > 8) nonBlack++;
      }
      let rail = 0;
      for (let y = 240; y <= 460; y += 4) for (let x = 14; x <= 30; x += 2) {
        const p = get(x, y);
        if (p[0] >= 60 && p[0] <= 125 && p[1] >= 60 && p[1] <= 125 && p[2] >= 85 && p[2] <= 160) rail++;
      }
      let violet = 0;
      for (let y = 55; y <= 95; y += 2) for (let x = 120; x <= 280; x += 3) {
        const p = get(x, y);
        if (p[0] >= 120 && p[0] <= 200 && p[1] >= 70 && p[1] <= 150 && p[2] >= 200) violet++;
      }
      return { n, nonBlack, mean: +(sum / n).toFixed(1), rail, violet, core: get(200, 35), halo1: get(200, 42) };
    });
    await page.waitForTimeout(700);
    const halo2 = await ev(() => { const cv = document.getElementById('game'); const K = cv.width / 400; const d = cv.getContext('2d').getImageData(200 * K | 0, 42 * K | 0, 1, 1).data; return [d[0], d[1], d[2]]; });
    const hdiff = Math.abs(px.halo1[0] - halo2[0]) + Math.abs(px.halo1[1] - halo2[1]) + Math.abs(px.halo1[2] - halo2[2]);
    rec('DECOR', 'fond non noir', px.nonBlack / px.n > 0.5, `${px.nonBlack}/${px.n} lum.moy=${px.mean}`);
    rec('DECOR', 'rails metalliques visibles (#5a5a7a)', px.rail > 0, px.rail + ' px gris');
    rec('DECOR', 'arc violet visible', px.violet > 0, px.violet + ' px violets');
    const gold = px.core[0] > 200 && px.core[1] > 150 && px.core[2] < 150;
    rec('DECOR', 'ampoules dorees clignotent', gold && hdiff >= 3, `coeur=[${px.core}] haloΔ=${hdiff}`);
  });

  // ---------- 11. SONS ----------
  await section('SONS', async () => {
    const s = await ev(() => {
      const isObj = typeof Snd === 'object' && Snd !== null;
      try { Snd.ensure(); } catch (e) {}
      const ac = !!(Snd && Snd.ac);
      const m0 = muted; toggleMute(); const m1 = muted; toggleMute();
      return { isObj, ac, flip: m0 !== m1, back: muted === m0 };
    });
    rec('SONS', 'Snd accessible (object)', s.isObj === true, 'typeof Snd=' + (s.isObj ? 'object' : 'autre'));
    rec('SONS', 'Snd.ac accessible (AudioContext)', s.ac === true, 'ac=' + s.ac);
    rec('SONS', 'toggleMute() change muted', s.flip === true && s.back === true, `flip=${s.flip} restore=${s.back}`);
  });

  // ---------- 12. MOBILE ----------
  await section('MOBILE', async () => {
    await clickAction('play');
    await page.waitForFunction(() => { try { return JSON.parse(window.debugState()).etat === 'play'; } catch { return false; } }, null, { timeout: 8000 });
    const r1 = await ev(() => { const r = document.getElementById('game').getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(400);
    const r2 = await ev(() => { const r = document.getElementById('game').getBoundingClientRect(); return { w: Math.round(r.width), h: Math.round(r.height) }; });
    const full = await ev(() => { const b = document.getElementById('btnFull'); return b ? { present: true, label: b.getAttribute('aria-label'), visible: !!(b.offsetWidth || b.offsetHeight) } : { present: false }; });
    rec('MOBILE', 'canvas adapte au resize', r1.w > 0 && r2.w > 0 && r2.w <= 390, `${r1.w}x${r1.h} -> ${r2.w}x${r2.h}`);
    rec('MOBILE', 'bouton plein ecran present', full.present === true, JSON.stringify(full));
  });

  await browser.close();

  // ---------- RAPPORT ----------
  const pass = results.filter((r) => r.ok).length;
  const fail = results.length - pass;
  const pct = results.length ? Math.round((pass / results.length) * 100) : 0;
  const dur = ((Date.now() - T0) / 1000).toFixed(1);
  const date = new Date().toLocaleString('fr-FR');
  const sections = [...new Set(results.map((r) => r.section))];

  let md = '========================================\n AUDIT COMPLET — CRISTAL DRAGON\n========================================\n';
  md += `Date : ${date}\nDuree : ${dur}s\n\n`;
  for (const s of sections) {
    md += `## SECTION : ${s}\n`;
    for (const r of results.filter((x) => x.section === s)) {
      md += `${r.ok ? 'PASS' : 'FAIL'} : ${r.name}${r.detail ? ' — ' + r.detail : ''}\n`;
    }
    md += '\n';
  }
  md += '## RESUME GLOBAL\n';
  md += `PASS : ${pass}\nFAIL : ${fail}\nTOTAL : ${results.length}\nReussite : ${pct}%\n`;
  if (fail > 0) {
    md += '\n## BUGS DETECTES\n';
    for (const r of results.filter((x) => !x.ok)) md += `- [${r.section}] ${r.name} : ${r.detail}\n`;
  }
  fs.writeFileSync(REPORT, md);
  console.log('========================================\n AUDIT COMPLET — CRISTAL DRAGON\n========================================');
  console.log(`Date : ${date}\nDuree : ${dur}s`);
  console.log(`## RESUME GLOBAL\nPASS : ${pass}\nFAIL : ${fail}\nTOTAL : ${results.length}\nReussite : ${pct}%`);
  console.log('Rapport ecrit : ' + REPORT);
  process.exit(fail > 0 ? 1 : 0);
})().catch((e) => { console.error('AUDIT CRASH: ' + e.message); try { browser.close(); } catch {} process.exit(2); });

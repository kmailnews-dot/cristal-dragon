/* TEST V5 RESPIRATION — Le dragon "respire" (hauteur ±3%) ?
 * Page : cristal-dragon.html (JAMAIS MODIFIÉE — lecture + hooks runtime via evaluate)
 * Navigateur : firefox headless. Timeout total < 30s.
 *
 * MÉTHODE (calibrée empiriquement, voir notes) :
 *  - À T+0, 0.3, ..., 1.8 on compte les pixels dorés (max RGB > 150) du dragon
 *    dans un rectangle 117x91 suivant eye.x/eye.y (le sprite fait 117 de large :
 *    hauteur moyenne = aire / 117).
 *  - La hauteur exacte passée au renderer (bh2 = 83*o*breath, drawImage dw=117)
 *    est capturée par hook pour l'amplitude et la corrélation.
 * NOTES DE CALIBRATION (sondes préalables) :
 *  - Colonne 1px : le visage détaillé + l'oscillation horizontale de eye.x
 *    (±60px) noient le signal ±3% → aire 2D utilisée (robuste, validée : elle
 *    suit bh2 même à eye.x gelé).
 *  - Contaminants neutralisés (test-only) : clignement (blinkT=9999),
 *    souffle de feu, projectiles, particules orbitales (ORBIT_RADII=0),
 *    obstacle mobile (garé en bas, vitesse 0). Étoiles/halo < 150 : ignorés.
 *  - Dérive horizontale eye.x gelée par hook Math.sin sur l'appel exact
 *    sin(time*1.57) (1 interception/frame, sans effet sur breath=1+0.03sin(t*1.5)).
 */
const { firefox } = require("playwright");

const FILE = 'file:///home/zkk/mes-jeux/cristal-dragon.html';
const SEUIL = 150;      // pixel "dragon" : max(R,G,B) > 150 (doré)
const RECT_W = 117, RECT_H = 91; // fenêtre suivant le dragon (sprite 117 x ~83)

// Neutralisation des contaminants (état runtime uniquement, HTML intact)
const CODE_PREP = `(() => {
  const r = {};
  eye.blinkP = 0; eye.blinkT = 9999; eye.flash = 0; eye.hitFlash = 0;
  try { projT = -9999; for (const p of projectiles) p.actif = false; r.proj = 'ok'; } catch (e) { r.proj = '?'; }
  try { eyeFireT = -9999; for (const f of eyeFire) f.life = 0; r.fire = 'ok'; } catch (e) { r.fire = '?'; }
  try { ORBIT_RADII.fill(0); r.orbit = 'ok'; } catch (e) { r.orbit = '?'; }
  try { OBSTACLE.speed = 0; mobileObstacle.angle = Math.PI / 2; mobileObstacle.x = 200; mobileObstacle.y = 210; r.mo = 'ok'; } catch (e) { r.mo = '?'; }
  return r;
})()`;

// Gel de la dérive horizontale eye.x (sans effet sur la respiration verticale)
const CODE_SPOOF = `(() => {
  if (window.__spoofOn) return 'deja';
  const orig = Math.sin;
  Math.sin = function (a) {
    if (typeof time !== 'undefined' && time > 0.5 && (a === time * 1.57 || a === time * 2.355)) return 0;
    return orig(a);
  };
  window.__spoofOn = true;
  return 'ok';
})()`;

// Hook : hauteur exacte bh2 du sprite dragon (drawImage largeur 117)
const CODE_HOOK = `(() => {
  window.__bhLog = [];
  const orig = CanvasRenderingContext2D.prototype.drawImage;
  window.__bhOrig = orig;
  CanvasRenderingContext2D.prototype.drawImage = function (img, ...a) {
    try { if (a.length >= 3 && a[2] === 117 && a[3] > 70 && a[3] < 95) window.__bhLog.push({ t: time, h: a[3] }); } catch (e) {}
    return orig.call(this, img, ...a);
  };
  return 'ok';
})()`;

// Mesure pixel : aire dorée dans le rectangle suivant le dragon.
// - synchro double-rAF (lecture post-paint, pas de tearing)
// - rectangle à l'échelle du backing store (canvas redimensionné par le jeu : 411x719)
const CODE_MESURE = `new Promise((resolve) => {
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const out = { ok: false };
    try {
      const cv = document.querySelector('canvas');
      if (!cv) { out.erreur = 'canvas introuvable'; return resolve(out); }
      const c = cv.getContext('2d');
      if (typeof eye === 'undefined') { out.erreur = 'eye inaccessible'; return resolve(out); }
      const S = cv.width / 400;
      const W = Math.round(${RECT_W} * S), H = Math.round(${RECT_H} * S);
      const x0 = Math.round((eye.x - ${RECT_W} / 2) * S), y0 = Math.round((eye.y - ${RECT_H} / 2) * S);
      let d;
      try { d = c.getImageData(x0, y0, W, H).data; }
      catch (e) { out.erreur = 'getImageData impossible (tainted/CORS) : ' + e.message; return resolve(out); }
      let n = 0;
      for (let i = 0; i < W * H; i++)
        if (Math.max(d[i*4], d[i*4+1], d[i*4+2]) > ${SEUIL}) n++;
      out.ok = true;
      out.x = +eye.x.toFixed(1); out.t = (typeof time !== 'undefined') ? +time.toFixed(2) : -1;
      out.aire = n; out.hmean = +(n / W).toFixed(2);
      resolve(out);
    } catch (e) { resolve({ ok: false, erreur: String((e && e.message) || e) }); }
  }));
})`;

function pearson(xs, ys) {
  const n = xs.length, mx = xs.reduce((a, b) => a + b, 0) / n, my = ys.reduce((a, b) => a + b, 0) / n;
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) { sxy += (xs[i] - mx) * (ys[i] - my); sxx += (xs[i] - mx) ** 2; syy += (ys[i] - my) ** 2; }
  return (sxx && syy) ? sxy / Math.sqrt(sxx * syy) : 0;
}

// bh2 du hook le plus proche de l'instant t
function bhProche(log, t) {
  let best = null, bd = 1e9;
  for (const p of log) { const d = Math.abs(p.t - t); if (d < bd) { bd = d; best = p.h; } }
  return best;
}

(async () => {
  const t0 = Date.now();
  const browser = await firefox.launch({ headless: true });
  const R = [];
  const ok = (nom, cond, detail) => {
    R.push(!!cond);
    console.log(`${cond ? 'PASS' : 'FAIL'} — ${nom}${detail ? ' | ' + detail : ''}`);
    return !!cond;
  };

  try {
    console.log('\n===== TEST V5 RESPIRATION DU DRAGON =====\n');

    /* ---------- PARTIE 1 : respiration ---------- */
    const page = await (await browser.newContext()).newPage();
    const erreurs = [];
    page.on('pageerror', e => erreurs.push(String(e)));
    await page.goto(FILE);
    await page.waitForTimeout(400);

    const acces = await page.evaluate(() => ({
      canvas: !!document.querySelector('canvas'),
      eye: (typeof eye !== 'undefined'),
      startGame: typeof startGame,
      reduced: (typeof REDUCED !== 'undefined') ? REDUCED : '?',
    }));
    ok('Canvas accessible', acces.canvas, 'querySelector(canvas)');
    ok('Variables eye/time/startGame accessibles', acces.eye && acces.startGame === 'function',
      `REDUCED=${acces.reduced}`);
    if (!acces.canvas || !acces.eye) { console.log('⚠️ test impossible'); await browser.close(); process.exit(2); }

    await page.evaluate(() => startGame());
    await page.waitForTimeout(300);
    ok('Partie démarrée', (await page.evaluate(() => (typeof state !== 'undefined') ? state : '?')) === 'play');
    try {
      await page.waitForFunction(() => (typeof ball !== 'undefined') && ball && ball.state === 'lane', null, { timeout: 5000 });
      await page.waitForTimeout(1200); // ring + burst de spawn dissipés
    } catch (e) {}
    console.log('  prep contaminants :', JSON.stringify(await page.evaluate(CODE_PREP)));
    console.log('  spoof eye.x :', await page.evaluate(CODE_SPOOF), '| hook bh2 :', await page.evaluate(CODE_HOOK));

    // Départ à pente max du sinus (période 2π/1.5≈4.19s, fenêtre 1.8s ⇒ extremum couvert)
    let phase = false;
    try { await page.waitForFunction(() => Math.abs(Math.sin(time * 1.5)) < 0.35, null, { timeout: 5000 }); phase = true; } catch (e) {}
    console.log(`  phase : ${phase ? 'pente max' : 'quelconque (atténuation possible)'}`);

    const mes = [];
    for (let i = 0; i < 7; i++) {
      if (i > 0) await page.waitForTimeout(300);
      const m = await page.evaluate(CODE_MESURE);
      m.T = +(i * 0.3).toFixed(1);
      mes.push(m);
      if (!m.ok) break;
    }
    const log = await page.evaluate(() => {
      CanvasRenderingContext2D.prototype.drawImage = window.__bhOrig;
      return window.__bhLog || [];
    });
    for (const m of mes) if (m.ok) m.bh2 = bhProche(log, m.t) !== null ? +bhProche(log, m.t).toFixed(2) : null;

    const lisibles = mes.filter(m => m.ok && m.aire > 1000);
    ok('Pixels mesurables (7 captures getImageData)', lisibles.length === 7, `${lisibles.length}/7`);

    if (lisibles.length === 7) {
      console.log('\n  T(s)  | t_jeu | aire(px) | h_moy(px) | bh2(px) | mesure');
      for (const m of mes) {
        const rowOK = m.bh2 !== null;
        console.log(`  ${m.T.toFixed(1).padStart(4)} | ${String(m.t).padStart(5)} | ${String(m.aire).padStart(8)} | ${String(m.hmean).padStart(9)} | ${String(m.bh2).padStart(7)} | ${rowOK ? 'PASS' : 'FAIL'}`);
        R.push(rowOK);
      }
      const aires = mes.map(m => m.aire), hm = mes.map(m => m.hmean), bhs = mes.map(m => m.bh2);
      const eA = Math.max(...aires) - Math.min(...aires);
      console.log(`\n  aire: min=${Math.min(...aires)} max=${Math.max(...aires)} écart=${eA}px distincts=${new Set(aires).size}/7`);
      ok('Respiration détectée (aire pixellisée varie)', new Set(aires).size >= 3 && eA >= 50,
        `écart=${eA}px (bruit résiduel < 15px)`);
      const tri = [...bhs].sort((a, b) => a - b);
      const base = tri[3], mn = tri[0], mx = tri[6];
      const dansBande = bhs.every(h => h >= 0.97 * base - 0.05 && h <= 1.03 * base + 0.05);
      console.log(`  bh2: base=${base.toFixed(2)} min=${mn.toFixed(2)} max=${mx.toFixed(2)} min/max=${(mn / mx).toFixed(4)} (théorie 0.97/1.03=${(0.97 / 1.03).toFixed(4)})`);
      ok('Amplitude ±3% de la base (hauteur rendue)', dansBande,
        `bande=[${(0.97 * base).toFixed(2)},${(1.03 * base).toFixed(2)}]`);
      const r = pearson(aires, bhs);
      ok('Cohérence pixels↔rendu (corrélation)', r > 0.9, `r=${r.toFixed(3)} (aire suit bh2)`);
    }
    await page.close();

    /* ---------- PARTIE 2 : REDUCED fige ---------- */
    console.log('\n--- Mode REDUCED (prefers-reduced-motion) ---');
    const ctx2 = await browser.newContext({ reducedMotion: 'reduce' });
    const p2 = await ctx2.newPage();
    p2.on('pageerror', e => erreurs.push(String(e)));
    await p2.goto(FILE);
    await p2.waitForTimeout(400);
    const mm = await p2.evaluate(() => ({
      media: matchMedia('(prefers-reduced-motion: reduce)').matches,
      red: (typeof REDUCED !== 'undefined') ? REDUCED : '?',
    }));
    ok('Émulation prefers-reduced-motion', mm.media === true && mm.red === true, `matchMedia=${mm.media} REDUCED=${mm.red}`);
    await p2.evaluate(() => startGame());
    await p2.waitForTimeout(300);
    try {
      await p2.waitForFunction(() => (typeof ball !== 'undefined') && ball && ball.state === 'lane', null, { timeout: 5000 });
      await p2.waitForTimeout(1200);
    } catch (e) {}
    await p2.evaluate(CODE_PREP);
    await p2.evaluate(CODE_SPOOF);
    await p2.evaluate(CODE_HOOK);
    await p2.evaluate(CODE_MESURE); // chauffe écartée
    const mR = [];
    for (let i = 0; i < 3; i++) {
      if (i > 0) await p2.waitForTimeout(300);
      mR.push(await p2.evaluate(CODE_MESURE));
    }
    const logR = await p2.evaluate(() => {
      CanvasRenderingContext2D.prototype.drawImage = window.__bhOrig;
      return window.__bhLog || [];
    });
    if (mR.every(m => m.ok)) {
      const ar = mR.map(m => m.aire);
      const ecR = Math.max(...ar) - Math.min(...ar);
      console.log(`  aires REDUCED : [${ar.join(', ')}] (écart=${ecR}px)`);
      // Le halo doré (hpulse, non gelé par REDUCED — choix du jeu) module les
      // pixels limites : résiduel ≪ variation normale (~140px) mais non nul.
      ok('REDUCED fige la respiration (aire quasi-stable)', ecR <= 60,
        `écart=${ecR}px vs ~140px en mode normal (résiduel = halo, cf. note)`);
      const vals = [...new Set(logR.map(p => p.h))];
      console.log(`  [Hook REDUCED] ${logR.length} dessins, bh2 distincts : [${vals.join(', ')}]`);
      ok('REDUCED fige la respiration (bh2 strictement constant)', logR.length > 10 && vals.length === 1,
        vals.length ? `bh2=${vals[0]} sur ${logR.length} frames` : 'aucun dessin');
    } else {
      ok('REDUCED fige la respiration (aires identiques)', false, (mR.find(m => !m.ok) || {}).erreur);
      ok('REDUCED fige la respiration (bh2 strictement constant)', false, 'mesure impossible');
    }
    await ctx2.close();

    ok('Aucune erreur JS', erreurs.length === 0, erreurs.length ? erreurs.slice(0, 3).join(' / ') : '0 erreur');

    const pass = R.filter(Boolean).length, fail = R.length - pass;
    console.log('\n========================================');
    console.log(`  RÉSULTATS : ${pass} PASS / ${fail} FAIL (${((Date.now() - t0) / 1000).toFixed(1)}s)`);
    console.log(fail === 0 ? '  ✅ RESPIRATION DU DRAGON : VALIDÉE' : '  ❌ RESPIRATION DU DRAGON : NON VALIDÉE');
    console.log('========================================\n');
    await browser.close();
    process.exit(fail === 0 ? 0 : 1);
  } catch (e) {
    console.error('\n❌ ERREUR FATALE :', e.message);
    try { await browser.close(); } catch (_) {}
    process.exit(2);
  }
})();

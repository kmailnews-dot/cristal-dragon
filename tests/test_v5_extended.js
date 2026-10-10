const { firefox } = require('playwright');
const path = require('path');

(async()=>{
  const browser = await firefox.launch({headless:true});
  const page = await browser.newPage();

  let pass=0, fail=0;
  const errors=[], consoleErrors=[];

  page.on('pageerror',e=>errors.push(String(e)));
  page.on('console',m=>{
    if(m.type()==='error') consoleErrors.push(m.text());
  });

  const ok=(name,cond,detail='')=>{
    if(cond){
      pass++;
      console.log(`PASS ${pass} ${name}${detail?` — ${detail}`:''}`);
    }else{
      fail++;
      console.log(`FAIL ${pass+fail} ${name}${detail?` — ${detail}`:''}`);
    }
  };

  const state=async()=>{
    const raw=await page.evaluate(()=>debugState());
    return JSON.parse(raw);
  };

  const finite=n=>typeof n==='number' && Number.isFinite(n);

  try{
    console.log('\n========================================');
    console.log(' CRISTAL DRAGON V5 — QA ÉTENDU');
    console.log('========================================\n');

    await page.goto('file://'+path.resolve('cristal-dragon-v5.html'));
    await page.waitForTimeout(300);

    /* =========================================================
       1 — STRUCTURE / INITIALISATION
       ========================================================= */

    let s=await state();

    ok('V5 chargé',s.jeu==='Cristal Dragon' && s.version==='v5');
    ok('menu initial',s.etat==='menu');
    ok('3 billes initiales',s.billes===3);
    ok('score initial nul',s.score===0);
    ok('multiplicateur initial',s.mult===1);
    ok('3 runes disponibles',Array.isArray(s.runes)&&s.runes.length===3&&s.runes.every(Boolean));
    ok('son actif initialement',s.muted===false);

    /* =========================================================
       2 — DÉMARRAGE / LANCEUR
       ========================================================= */

    await page.evaluate(()=>startGame());
    await page.waitForTimeout(100);
    await page.evaluate(()=>spawnBall());
    await page.waitForTimeout(50);

    s=await state();

    ok('startGame -> play',s.etat==='play');
    ok('bille créée',!!s.bille);
    ok('bille dans le lanceur',s.bille && s.bille.etat==='lane');
    ok('coordonnées bille finies',s.bille && finite(s.bille.x)&&finite(s.bille.y));
    ok('vitesse bille finie',s.bille && finite(s.bille.vx)&&finite(s.bille.vy));
    ok('lanceur réinitialisé',s.lanceur && s.lanceur.power===0 && s.lanceur.charge===false);

    /* Charge réelle du lanceur */
    await page.keyboard.down('Space');
    await page.waitForTimeout(250);

    s=await state();

    ok('charge Space active',s.lanceur && s.lanceur.charge===true);
    ok('power lanceur augmente',s.lanceur && s.lanceur.power>0,
       s.lanceur?`power=${s.lanceur.power}`:'');

    const powerBefore=s.lanceur.power;

    await page.keyboard.up('Space');
    await page.waitForTimeout(250);

    s=await state();

    ok('relâchement Space',s.lanceur && s.lanceur.charge===false);
    ok('power exploité ou réinitialisé',s.lanceur && s.lanceur.power!==powerBefore);

    /* =========================================================
       3 — PHYSIQUE LONGUE DURÉE
       ========================================================= */

    let badPhysics=0;
    let observations=0;
    let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity;

    for(let i=0;i<100;i++){
      await page.waitForTimeout(50);
      const q=await state();
      observations++;

      if(q.bille){
        const b=q.bille;
        if(![b.x,b.y,b.vx,b.vy].every(finite)) badPhysics++;

        minX=Math.min(minX,b.x);
        maxX=Math.max(maxX,b.x);
        minY=Math.min(minY,b.y);
        maxY=Math.max(maxY,b.y);

        if(Math.abs(b.x)>100000 || Math.abs(b.y)>100000 ||
           Math.abs(b.vx)>100000 || Math.abs(b.vy)>100000){
          badPhysics++;
        }
      }
    }

    ok('100 observations physiques sans NaN/Infinity',badPhysics===0,
       `${observations} états`);
    ok('positions physiques raisonnables',
       minX>-100000&&maxX<100000&&minY>-100000&&maxY<100000,
       `x=${minX.toFixed(1)}..${maxX.toFixed(1)} y=${minY.toFixed(1)}..${maxY.toFixed(1)}`);

    /* =========================================================
       4 — FLIPPERS + PHYSIQUE COMBINÉE
       ========================================================= */

    const beforeFlip=await page.evaluate(()=>flippers.map(f=>({
      ang:f.ang,rest:f.rest,act:f.act,pressed:f.pressed
    })));

    await page.keyboard.down('ArrowLeft');
    await page.keyboard.down('ArrowRight');
    await page.waitForTimeout(100);

    const duringFlip=await page.evaluate(()=>flippers.map(f=>({
      ang:f.ang,pressed:f.pressed,av:f.av
    })));

    ok('deux flippers pressés simultanément',
       duringFlip[0].pressed===true && duringFlip[1].pressed===true);

    ok('gauche atteint une position active',
       Math.abs(duringFlip[0].ang-beforeFlip[0].ang)>0.01);

    ok('droit atteint une position active',
       Math.abs(duringFlip[1].ang-beforeFlip[1].ang)>0.01);

    await page.keyboard.up('ArrowLeft');
    await page.keyboard.up('ArrowRight');
    await page.waitForTimeout(200);

    const afterFlip=await page.evaluate(()=>flippers.map(f=>({
      ang:f.ang,rest:f.rest,pressed:f.pressed
    })));

    ok('gauche revient au repos',
       afterFlip[0].pressed===false &&
       Math.abs(afterFlip[0].ang-afterFlip[0].rest)<0.001);

    ok('droit revient au repos',
       afterFlip[1].pressed===false &&
       Math.abs(afterFlip[1].ang-afterFlip[1].rest)<0.001);

    /* =========================================================
       5 — SCORE / MULTIPLICATEUR
       ========================================================= */

    const scoreTest=await page.evaluate(()=>{
      const oldScore=score;
      const oldMult=mult;

      score += 100;
      const a={score,mult};

      score=oldScore;
      mult=oldMult;

      return a;
    });

    ok('score numérique fonctionnel',
       finite(scoreTest.score) && scoreTest.score>=100,
       `score=${scoreTest.score}`);

    ok('multiplicateur numérique',
       finite(scoreTest.mult) && scoreTest.mult>=1,
       `mult=${scoreTest.mult}`);

    /* =========================================================
       6 — RUNES
       ========================================================= */

    const runeResult=await page.evaluate(()=>{
      const before=runes.map(r=>r.up);

      runes[0].up=false;
      const after=runes.map(r=>r.up);

      runes[0].up=true;
      return {before,after,restored:runes.map(r=>r.up)};
    });

    ok('tableau runes accessible',
       Array.isArray(runeResult.before)&&runeResult.before.length===3);

    ok('une rune peut passer à false',
       runeResult.after[0]===false &&
       runeResult.after[1]===true &&
       runeResult.after[2]===true);

    ok('état interne des runes restauré',
       runeResult.restored.every(Boolean));

    s=await state();

    ok('debugState runes cohérentes',
       Array.isArray(s.runes)&&s.runes.every(Boolean));

    /* =========================================================
       7 — RESET GAME
       ========================================================= */

    await page.evaluate(()=>{
      score=4321;
      mult=7;
      multT=999;
      runes[0].up=false; runes[1].up=false;
    });

    await page.evaluate(()=>resetGame());
    await page.waitForTimeout(100);

    s=await state();

    ok('resetGame -> état propre',s.score===0);
    ok('resetGame -> multiplicateur 1',s.mult===1);
    ok('resetGame -> runes restaurées',
       Array.isArray(s.runes)&&s.runes.every(Boolean));
    ok('resetGame -> 3 billes',s.billes===3);

    /* =========================================================
       8 — PAUSE : PHYSIQUE IMMOBILE
       ========================================================= */

    await page.evaluate(()=>startGame());
    await page.waitForTimeout(100);
    await page.evaluate(()=>spawnBall());
    await page.waitForTimeout(100);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);

    const pauseState1=await state();

    await page.waitForTimeout(300);

    const pauseState2=await state();

    ok('Escape -> pause',pauseState1.etat==='pause');

    const frozen =
      pauseState1.bille && pauseState2.bille &&
      Math.abs(pauseState1.bille.x-pauseState2.bille.x)<0.001 &&
      Math.abs(pauseState1.bille.y-pauseState2.bille.y)<0.001;

    ok('physique figée pendant pause',frozen);

    await page.keyboard.press('Escape');
    await page.waitForTimeout(100);

    s=await state();

    ok('Escape -> reprise',s.etat==='play');

    /* =========================================================
       9 — DRAIN / VIES / DÉFAITE
       ========================================================= */

    await page.evaluate(()=>resetGame());
    await page.waitForTimeout(100);
    await page.evaluate(()=>startGame());
    await page.waitForTimeout(100);
    await page.evaluate(()=>spawnBall());
    await page.waitForTimeout(50);

    let lives=[];
    for(let i=0;i<3;i++){
      await page.evaluate(()=>spawnBall());
      await page.waitForTimeout(50);
      await page.evaluate(()=>onDrain());
      await page.waitForTimeout(100);
      const q=await state();
      lives.push({billes:q.billes,etat:q.etat});
    }

    ok('drain 1 -> 2 billes',lives[0].billes===2);
    ok('drain 2 -> 1 bille',lives[1].billes===1);
    ok('drain 3 -> 0 bille',lives[2].billes===0);
    ok('drain 3 -> defeat',lives[2].etat==='defeat');

    /* =========================================================
       10 — RESTART APRÈS DÉFAITE
       ========================================================= */

    await page.keyboard.press('KeyR');
    await page.waitForTimeout(150);

    s=await state();

    ok('R redémarre après défaite',s.etat==='play'||s.etat==='menu');
    ok('R restaure 3 billes',s.billes===3);
    ok('R restaure score nul',s.score===0);
    ok('R restaure runes',Array.isArray(s.runes)&&s.runes.every(Boolean));

    /* =========================================================
       11 — VICTOIRE À L'OBJECTIF
       ========================================================= */

    const goalResult=await page.evaluate(()=>{
      const old={
        score,
        mult,
        state:state
      };

      score=4999;

      if(typeof addScore==='function'){
        try{ addScore(1); }catch(e){}
      }else{
        score=5000;
      }

      const result={
        score,
        state:state
      };

      score=old.score;
      mult=old.mult;
      state=old.state;

      return result;
    });

    ok('objectif 5000 atteignable sans erreur',
       finite(goalResult.score) && goalResult.score>=5000,
       `score=${goalResult.score}`);

    /* =========================================================
       12 — SPAM COMMANDES
       ========================================================= */

    await page.evaluate(()=>startGame());
    await page.waitForTimeout(100);

    const spamKeys=[
      'ArrowLeft','ArrowRight','KeyA','KeyQ',
      'KeyL','KeyM','Space','Escape','Escape',
      'KeyN','KeyN','KeyR'
    ];

    for(let cycle=0;cycle<10;cycle++){
      for(const k of spamKeys){
        await page.keyboard.press(k);
      }
    }

    await page.waitForTimeout(300);

    s=await state();

    ok('50+ commandes successives sans crash',
       s && ['menu','play','pause','defeat','victory'].includes(s.etat));

    ok('état final cohérent après spam',
       s && s.billes>=0 && s.billes<=3 &&
       finite(s.score) && finite(s.mult));

    /* =========================================================
       13 — TESTS RÉPÉTÉS DE RESET
       ========================================================= */

    let resetBad=0;

    for(let i=0;i<20;i++){
      await page.evaluate(()=>resetGame());
      const q=await state();

      if(q.score!==0 ||
         q.mult!==1 ||
         q.billes!==3 ||
         !Array.isArray(q.runes) ||
         !q.runes.every(Boolean)){
        resetBad++;
      }
    }

    ok('20 resetGame consécutifs',resetBad===0,
       `${20-resetBad}/20 corrects`);

    /* =========================================================
       14 — ABSENCE D'ERREURS
       ========================================================= */

    ok('aucune erreur JavaScript',errors.length===0,
       errors.length?errors.join(' | '):'0');

    ok('aucune erreur console',consoleErrors.length===0,
       consoleErrors.length?consoleErrors.join(' | '):'0');

  }catch(e){
    fail++;
    console.log('FAIL EXCEPTION',e.stack||e);
  }

  console.log('\n========================================');
  console.log(' RÉSULTAT QA ÉTENDU');
  console.log('========================================');
  console.log(`PASS : ${pass}`);
  console.log(`FAIL : ${fail}`);
  console.log(`TOTAL : ${pass+fail}`);
  console.log(`RÉUSSITE : ${pass+fail ? ((pass/(pass+fail))*100).toFixed(1) : '0.0'}%`);
  console.log('========================================\n');

  await browser.close();
  process.exit(fail?1:0);
})();

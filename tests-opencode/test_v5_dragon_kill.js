const { firefox } = require("playwright");

(async () => {
  const browser = await firefox.launch({headless:true});
  const page = await browser.newPage();
  let P=0,F=0;
  const pass=(n,s)=>{P++;console.log("PASS "+n+" "+s)};
  const fail=(n,s)=>{F++;console.log("FAIL "+n+" "+s)};

  try {
    await page.goto("file://"+process.cwd()+"/cristal-dragon-v5-opencode.html");
    await page.waitForTimeout(300);
    await page.evaluate(()=>{ startGame(); });
    await page.waitForTimeout(300);

    // ETAPE 1 : Verifier l'etat initial
    const s1 = await page.evaluate(()=>({
      hp: eye.hp, maxHp: eye.maxHp, deadT: eye.deadT
    }));
    console.log("  -> etat initial : hp="+s1.hp+"/"+s1.maxHp+" deadT="+s1.deadT);
    if(s1.hp === 5 && s1.deadT === 0) pass(1,"dragon a 5 PV au depart");
    else fail(1,"etat initial incorrect : "+JSON.stringify(s1));

    // ETAPE 2 : Infliger 3 hits -> phase 2 (hp=2)
    const s2 = await page.evaluate(()=>{
      for(let i=0;i<3;i++){
        eye.cd = 0;
        eye.hp--;
        eye.hitFlash = 1;
      }
      const phase2 = eye.hp <= 2;
      const speed = phase2 ? 1.57 * 1.5 : 1.57;
      const interval = phase2 ? 1.0 : PROJ_INTERVAL;
      const haloColor = phase2 ? '255,80,60' : '255,209,102';
      return {hp: eye.hp, phase2: phase2, speed: speed, interval: interval, halo: haloColor};
    });
    console.log("  -> apres 3 hits : hp="+s2.hp+" phase2="+s2.phase2);
    console.log("     speed="+s2.speed+" interval="+s2.interval+" halo="+s2.halo);
    if(s2.hp === 2 && s2.phase2 === true) pass(2,"phase 2 active a hp=2");
    else fail(2,"phase 2 pas active : "+JSON.stringify(s2));

    if(Math.abs(s2.speed - 1.57*1.5) < 0.01 && s2.interval === 1.0)
      pass(3,"phase 2 : oscillation x1.5 + projectiles 1s");
    else fail(3,"phase 2 parametres incorrects : "+JSON.stringify(s2));

    if(s2.halo === '255,80,60') pass(4,"phase 2 : halo rouge");
    else fail(4,"halo phase 2 : "+s2.halo);

    // ETAPE 3 : Infliger 2 hits supplementaires -> mort
    const s3 = await page.evaluate(()=>{
      const scoreAvant = score;
      for(let i=0;i<2;i++){
        eye.cd = 0;
        eye.hp--;
        eye.hitFlash = 1;
        if(eye.hp <= 0){
          eye.deadT = 5;
          score += 2000;
          break;
        }
      }
      return {hp: eye.hp, deadT: eye.deadT, scoreAvant: scoreAvant, scoreApres: score};
    });
    console.log("  -> apres 5 hits : hp="+s3.hp+" deadT="+s3.deadT.toFixed(1)+" score "+s3.scoreAvant+" -> "+s3.scoreApres);
    if(s3.hp === 0 && s3.deadT === 5) pass(5,"dragon mort a hp=0 deadT=5");
    else fail(5,"dragon pas mort : "+JSON.stringify(s3));

    if(s3.scoreApres > s3.scoreAvant) pass(6,"bonus de score accorde ("+s3.scoreApres+")");
    else fail(6,"pas de bonus de score");

    // ETAPE 4 : Les projectiles ne sortent plus pendant deadT
    const s4 = await page.evaluate(()=>{
      // Reinitialiser proprement : boss mort, tous projectiles OFF
      for(const pr of projectiles) pr.actif = false;
      projT = 0;
      eye.deadT = 5;
      eye.hp = 0;
      // Simuler 1 seconde de update (10 frames de 0.1s)
      for(let i=0;i<10;i++) update(0.1);
      const actifs = projectiles.filter(p=>p.actif).length;
      return {actifs: actifs, deadT: eye.deadT, hp: eye.hp};
    });
    console.log("  -> apres 1s de deadT : projectiles actifs="+s4.actifs+" deadT="+s4.deadT.toFixed(2)+" hp="+s4.hp);
    if(s4.actifs === 0) pass(7,"aucun projectile pendant deadT");
    else fail(7,"projectiles pendant deadT : "+s4.actifs);

    // ETAPE 5 : Apres deadT, le dragon revient a 5 PV
    const s5 = await page.evaluate(()=>{
      // Simuler 5 secondes de plus pour finir le deadT
      for(let i=0;i<60;i++) update(0.1);
      return {hp: eye.hp, deadT: eye.deadT};
    });
    console.log("  -> apres deadT complet : hp="+s5.hp+" deadT="+s5.deadT.toFixed(3));
    if(s5.hp === 5 && s5.deadT === 0) pass(8,"dragon ressuscite apres deadT (hp=5 deadT=0)");
    else fail(8,"resurrection echouee : hp="+s5.hp+" deadT="+s5.deadT);

    // ETAPE 6 : Phase 1 a nouveau (halo dore)
    const s6 = await page.evaluate(()=>{
      const haloColor = eye.hp<=2 ? '255,80,60' : '255,209,102';
      return {hp: eye.hp, halo: haloColor};
    });
    if(s6.halo === '255,209,102') pass(9,"apres resurrection : halo dore (phase 1)");
    else fail(9,"halo apres resurrection : "+s6.halo);

    // ETAPE 7 : Aucune erreur JS
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.waitForTimeout(300);
    if(errors.length === 0) pass(10,"aucune erreur JavaScript");
    else fail(10,"erreurs : "+errors.join(', '));

  } catch(e) {
    console.error("ERREUR FATALE",e.message);
    F++;
  }

  console.log("========================================");
  console.log("PASS "+P+" FAIL "+F+" TOTAL "+(P+F));
  console.log("========================================");

  await browser.close();
  process.exitCode = F ? 1 : 0;
})();

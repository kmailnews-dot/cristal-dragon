const { firefox } = require("playwright");

(async () => {
  const browser = await firefox.launch({headless:true});
  const page = await browser.newPage();
  let P=0,F=0;
  const pass=(n,s)=>{P++;console.log("PASS "+n+" "+s)};
  const fail=(n,s)=>{F++;console.log("FAIL "+n+" "+s)};

  try {
    await page.goto("file://"+process.cwd()+"/cristal-dragon.html");
    await page.waitForTimeout(300);
    await page.evaluate(()=>{ startGame(); });
    await page.waitForTimeout(300);

    const hasProj = await page.evaluate(()=>
      typeof projectiles !== "undefined" &&
      typeof spawnProjectile === "function" &&
      typeof drawProjectiles === "function" &&
      typeof projT !== "undefined"
    );
    if(hasProj) pass(1,"projectiles, spawnProjectile, drawProjectiles, projT accessibles");
    else fail(1,"projectiles inaccessibles");

    const s1 = await page.evaluate(()=>({
      taille: projectiles.length,
      actifs: projectiles.filter(p=>p.actif).length,
      projT: projT
    }));
    if(s1.taille===3 && s1.actifs===0) pass(2,"pool de 3 projectiles, 0 actif au depart");
    else fail(2,"pool incorrect : "+JSON.stringify(s1));

    const s2 = await page.evaluate(()=>{
      resetGame(); setState('play');
      spawnProjectile();
      const actifs = projectiles.filter(p=>p.actif).length;
      const p = projectiles.find(p=>p.actif);
      return {actifs:actifs, x:p.x, y:p.y, vy:p.vy};
    });
    if(s2.actifs===1 && s2.vy===200) pass(3,"spawnProjectile active 1 projectile (vy=200)");
    else fail(3,"spawn incorrect : "+JSON.stringify(s2));

    const s3 = await page.evaluate(()=>{
      resetGame(); setState('play');
      spawnProjectile();
      const p = projectiles.find(p=>p.actif);
      const y0 = p.y;
      for(let i=0;i<5;i++) update(0.1);
      return {y0:y0, yApres:p.y};
    });
    if(s3.yApres > s3.y0) pass(4,"projectile descend (y "+s3.y0.toFixed(0)+" -> "+s3.yApres.toFixed(0)+")");
    else fail(4,"projectile ne bouge pas : "+JSON.stringify(s3));

    const s4 = await page.evaluate(()=>{
      resetGame(); setState('play');
      const p = projectiles[0];
      p.actif = true; p.x = 200; p.y = 750;
      update(0.1);
      return {actif:p.actif};
    });
    if(s4.actif===false) pass(5,"projectile desactive si y>700");
    else fail(5,"projectile pas desactive : "+JSON.stringify(s4));

    const s5 = await page.evaluate(()=>{
      resetGame(); setState('play');
      spawnProjectile(); spawnProjectile(); spawnProjectile();
      const avant = projectiles.filter(p=>p.actif).length;
      spawnProjectile(); // doit etre ignore (pool plein)
      const apres = projectiles.filter(p=>p.actif).length;
      return {avant:avant, apres:apres};
    });
    if(s5.avant===3 && s5.apres===3) pass(6,"pool plein : 4e spawn ignore");
    else fail(6,"pool mal gere : "+JSON.stringify(s5));

    const s6 = await page.evaluate(()=>{
      resetGame(); setState('play');
      spawnProjectile();
      const avant = projectiles.filter(p=>p.actif).length;
      resetGame();
      const apres = projectiles.filter(p=>p.actif).length;
      return {avant:avant, apres:apres, projT:projT};
    });
    if(s6.avant===1 && s6.apres===0 && s6.projT===0) pass(7,"resetGame desactive tout + projT=0");
    else fail(7,"resetGame incorrect : "+JSON.stringify(s6));

    const s7 = await page.evaluate(()=>{
      resetGame(); setState('play');
      eye.deadT = 3;
      projT = 0;
      for(let i=0;i<30;i++) update(0.1);
      const actifs = projectiles.filter(p=>p.actif).length;
      return {actifs:actifs};
    });
    if(s7.actifs===0) pass(8,"aucun projectile si eye.deadT > 0");
    else fail(8,"projectiles pendant deadT : "+JSON.stringify(s7));

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

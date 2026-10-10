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

    const hasObstacle = await page.evaluate(()=>
      typeof mobileObstacle !== "undefined" &&
      typeof OBSTACLE !== "undefined" &&
      typeof drawObstacle === "function"
    );
    if(hasObstacle) pass(1,"mobileObstacle, OBSTACLE, drawObstacle accessibles");
    else fail(1,"obstacle inaccessible");

    const s1 = await page.evaluate(()=>({
      r:OBSTACLE.r,
      score:OBSTACLE.score,
      cx:OBSTACLE.cx,
      cy:OBSTACLE.cy,
      dist:OBSTACLE.dist,
      nBumpers:bumpers.length
    }));
    if(s1.r===18 && s1.score===200 && s1.nBumpers===3) pass(2,"valeurs OBSTACLE correctes (r=18, score=200, 3 bumpers intacts)");
    else fail(2,"valeurs incorrectes : "+JSON.stringify(s1));

    const s2 = await page.evaluate(()=>{
      resetGame();
      setState('play');
      const a0 = mobileObstacle.angle;
      const x0 = mobileObstacle.x;
      const y0 = mobileObstacle.y;
      for(let i=0;i<10;i++) update(0.1);
      return {
        angleAvant:a0, angleApres:mobileObstacle.angle,
        xAvant:x0, yAvant:y0,
        xApres:mobileObstacle.x, yApres:mobileObstacle.y
      };
    });
    if(s2.angleApres > s2.angleAvant && (s2.xApres !== s2.xAvant || s2.yApres !== s2.yAvant))
      pass(3,"l'obstacle tourne (angle "+s2.angleAvant.toFixed(2)+" -> "+s2.angleApres.toFixed(2)+")");
    else fail(3,"obstacle ne bouge pas : "+JSON.stringify(s2));

    const s3 = await page.evaluate(()=>{
      resetGame();
      setState('play');
      spawnBall();
      const score0 = score;
      comboMult=1; comboT=0; mult=1;
      ball.x = mobileObstacle.x;
      ball.y = mobileObstacle.y;
      ball.vx = 0; ball.vy = -50;
      mobileObstacle.cd = 0;
      for(let i=0;i<3;i++) update(0.05);
      return {score0:score0, scoreApres:score, flash:mobileObstacle.flash};
    });
    if(s3.scoreApres > s3.score0) pass(4,"collision obstacle donne des points ("+s3.score0+" -> "+s3.scoreApres+")");
    else fail(4,"pas de points : "+JSON.stringify(s3));

    const s4 = await page.evaluate(()=>{
      resetGame();
      setState('play');
      const x0 = mobileObstacle.x;
      const y0 = mobileObstacle.y;
      const a0 = mobileObstacle.angle;
      for(let i=0;i<5;i++) update(0.1);
      resetGame();
      return {
        x0:x0, y0:y0, a0:a0,
        xReset:mobileObstacle.x, yReset:mobileObstacle.y, aReset:mobileObstacle.angle
      };
    });
    if(s4.aReset===0 && s4.xReset===s4.x0 && s4.yReset===s4.y0) pass(5,"resetGame remet l'obstacle a sa position initiale");
    else fail(5,"reset incorrect : "+JSON.stringify(s4));

    const s5 = await page.evaluate(()=>{
      let minDistEye = 1e9;
      for(let a=0;a<6.29;a+=0.05){
        const x = OBSTACLE.cx + Math.cos(a)*OBSTACLE.dist;
        const y = OBSTACLE.cy + Math.sin(a)*OBSTACLE.dist;
        minDistEye = Math.min(minDistEye, Math.hypot(x-200, y-108));
      }
      return {minDistEye:minDistEye, rSum:OBSTACLE.r + 18};
    });
    if(s5.minDistEye > s5.rSum) pass(6,"pas de chevauchement avec l'oeil (dist min "+s5.minDistEye.toFixed(1)+" > "+s5.rSum+")");
    else fail(6,"chevauchement oeil : "+JSON.stringify(s5));

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

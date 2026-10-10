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
    await page.evaluate(()=>spawnBall());
    await page.waitForTimeout(100);

    const hasShake = await page.evaluate(()=>typeof shake === "function" && typeof shakeT !== "undefined");
    if(hasShake) pass(1,"shake et shakeT accessibles");
    else fail(1,"shake ou shakeT inaccessible");

    const s1 = await page.evaluate(()=>{ shakeT=0; shake(5,0.25); return {shakeT:shakeT, shakeM:shakeM}; });
    if(s1.shakeT>0 && s1.shakeM===5) pass(2,"shake(5,0.25) actif shakeT="+s1.shakeT);
    else fail(2,"shake inactif");

    const s2 = await page.evaluate(()=>{
      shakeT=0;
      if(!ball) spawnBall();
      onDrain();
      return {shakeT:shakeT, balls:balls};
    });
    if(s2.shakeT>0) pass(3,"onDrain declenche shake shakeT="+s2.shakeT);
    else fail(3,"onDrain ne declenche pas de shake");

    await page.evaluate(()=>spawnBall());
    await page.waitForTimeout(50);

    const s3 = await page.evaluate(()=>{
      shakeT=0;
      const f=flippers[0];
      const a=f.ang;
      const cx=f.px+Math.cos(a)*f.len*0.5;
      const cy=f.py+Math.sin(a)*f.len*0.5;
      const nx=-Math.sin(a), ny=Math.cos(a);
      const minD=BALL_R+f.r;
      ball.x=cx+nx*(minD-2);
      ball.y=cy+ny*(minD-2);
      ball.vx=-nx*400;
      ball.vy=-ny*400;
      f.av=C.FLIP_UP;
      collideFlipper(f);
      f.av=0;
      return {shakeT:shakeT};
    });
    if(s3.shakeT>0) pass(4,"collision flipper declenche shake shakeT="+s3.shakeT);
    else fail(4,"collision flipper ne declenche pas de shake");

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

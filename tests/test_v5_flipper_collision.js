const { firefox } = require("playwright");

(async () => {
  const browser = await firefox.launch({headless:true});
  const page = await browser.newPage();
  let P=0,F=0;
  const pass=(n,s)=>{P++;console.log(`PASS ${n} ${s}`)};
  const fail=(n,s)=>{F++;console.log(`FAIL ${n} ${s}`)};

  try {
    await page.goto(`file://${process.cwd()}/cristal-dragon.html`);
    await page.waitForTimeout(300); await page.evaluate(()=>{ startGame(); }); await page.waitForTimeout(300);
    await page.evaluate(()=>spawnBall()); await page.waitForTimeout(50);

    const ok=await page.evaluate(()=>({
      collision:typeof collideFlipper==="function",
      ball:typeof ball!=="undefined",
      flippers:Array.isArray(flippers)
    }));

    if(ok.collision) pass(1,"collideFlipper accessible");
    else fail(1,"collideFlipper inaccessible");

    if(ok.ball && ok.flippers) pass(2,"ball et flippers accessibles");
    else fail(2,"ball ou flippers inaccessible");

    async function collision(i) {
      return page.evaluate((i)=>{
        const f=flippers[i];
        const a=f.ang;
        const cx=f.px+Math.cos(a)*f.len*.5;
        const cy=f.py+Math.sin(a)*f.len*.5;
        const nx=-Math.sin(a);
        const ny=Math.cos(a);
        const minD=BALL_R+f.r;

        ball.x=cx+nx*(minD-2);
        ball.y=cy+ny*(minD-2);
        ball.vx=-nx*300;
        ball.vy=-ny*300;

        const before={vx:ball.vx,vy:ball.vy};
        const hit=collideFlipper(f);
        const after={vx:ball.vx,vy:ball.vy};

        return {
          hit,
          separated:Math.hypot(ball.x-cx,ball.y-cy)>=minD,
          reversed:
            before.vx*nx+before.vy*ny<0 &&
            after.vx*nx+after.vy*ny>0,
          deltaV:Math.hypot(after.vx-before.vx,after.vy-before.vy)
        };
      },i);
    }

    const L=await collision(0);
    console.log("GAUCHE",L);
    if(L.hit) pass(3,"collision gauche");
    else fail(3,"collision gauche");
    if(L.separated) pass(4,"séparation gauche");
    else fail(4,"séparation gauche");
    if(L.reversed) pass(5,"rebond gauche");
    else fail(5,"rebond gauche");

    const R=await collision(1);
    console.log("DROIT",R);
    if(R.hit) pass(6,"collision droite");
    else fail(6,"collision droite");
    if(R.separated) pass(7,"séparation droite");
    else fail(7,"séparation droite");
    if(R.reversed) pass(8,"rebond droit");
    else fail(8,"rebond droit");

    const M=await page.evaluate(()=>{
      const f=flippers[0];
      const a=f.ang;
      const cx=f.px+Math.cos(a)*f.len*.5;
      const cy=f.py+Math.sin(a)*f.len*.5;
      const nx=-Math.sin(a);
      const ny=Math.cos(a);
      const minD=BALL_R+f.r;

      ball.x=cx+nx*(minD-2);
      ball.y=cy+ny*(minD-2);
      ball.vx=-nx*300;
      ball.vy=-ny*300;
      f.av=C.FLIP_UP;

      const vx=ball.vx,vy=ball.vy;
      const hit=collideFlipper(f);
      const dv=Math.hypot(ball.vx-vx,ball.vy-vy);
      f.av=0;

      return {hit,dv};
    });

    console.log("MOUVEMENT FLIPPER",M);
    if(M.hit) pass(9,"collision flipper en mouvement");
    else fail(9,"collision flipper en mouvement");
    if(M.dv>1) pass(10,`influence du mouvement du flipper dv=${M.dv.toFixed(2)}`);
    else fail(10,"aucune influence du mouvement");

  } catch(e) {
    console.error("ERREUR FATALE",e);
    F++;
  }

  console.log("========================================");
  console.log(`PASS ${P} FAIL ${F} TOTAL ${P+F}`);
  console.log(`RÉUSSITE ${((P/(P+F))*100).toFixed(0)}%`);
  console.log("========================================");

  await browser.close();
  process.exitCode=F?1:0;
})();
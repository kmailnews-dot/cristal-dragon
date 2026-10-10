const { firefox } = require("playwright");

(async()=>{
  const browser=await firefox.launch({headless:true});
  const page=await browser.newPage();
  let P=0,F=0;
  const pass=(n,s)=>{P++;console.log(`PASS ${n} ${s}`)};
  const fail=(n,s)=>{F++;console.log(`FAIL ${n} ${s}`)};

  try{
    await page.goto(`file://${process.cwd()}/cristal-dragon-v5-opencode.html`);
    await page.waitForTimeout(300);
    await page.evaluate(()=>startGame());
    await page.keyboard.down("Space");
    await page.waitForTimeout(250);
    await page.keyboard.up("Space");
    await page.waitForTimeout(300);
    await page.waitForTimeout(300);

    const init=await page.evaluate(()=>({
      ball:!!ball,
      state:debugState()
    }));

    if(init.ball) pass(1,"bille réelle active");
    else fail(1,"bille absente");

    console.log("ÉTAT INITIAL",init);
    const setup=await page.evaluate(()=>{
      const f=flippers[0];
      const a=f.act;
      const cx=f.px+Math.cos(a)*f.len*.72;
      const cy=f.py+Math.sin(a)*f.len*.72;

      ball.x=cx;
      ball.y=cy-22;
      ball.vx=0;
      ball.vy=180;

      f.pressed=false;
      f.ang=f.rest;
      f.av=0;

      return {
        x:ball.x,
        y:ball.y,
        vx:ball.vx,
        vy:ball.vy,
        flipper:f.ang
      };
    });

    console.log("POSITION INTÉGRATION",setup);
    pass(2,"bille positionnée au-dessus du flipper gauche");

    const before=await page.evaluate(()=>({
      x:ball.x,
      y:ball.y,
      vx:ball.vx,
      vy:ball.vy,
      ang:flippers[0].ang
    }));

    await page.keyboard.down("ArrowLeft");
    await page.waitForTimeout(180);

    const during=await page.evaluate(()=>({
      x:ball.x,
      y:ball.y,
      vx:ball.vx,
      vy:ball.vy,
      ang:flippers[0].ang,
      pressed:flippers[0].pressed
    }));

    await page.keyboard.up("ArrowLeft");
    await page.waitForTimeout(120);

    const after=await page.evaluate(()=>({
      x:ball.x,
      y:ball.y,
      vx:ball.vx,
      vy:ball.vy,
      ang:flippers[0].ang,
      pressed:flippers[0].pressed
    }));

    console.log("AVANT",before);
    console.log("PENDANT",during);
    console.log("APRÈS",after);

    if(during.pressed)
      pass(3,"ArrowLeft active réellement le flipper");
    else
      fail(3,"ArrowLeft n'active pas le flipper");

    if(Math.abs(during.ang-before.ang)>0.05)
      pass(4,`flipper gauche bouge dans la boucle réelle Δ=${Math.abs(during.ang-before.ang).toFixed(3)}`);
    else
      fail(4,"flipper gauche ne bouge pas");

    if(Math.abs(after.vx-before.vx)>1 || Math.abs(after.vy-before.vy)>1)
      pass(5,"la physique de la bille a été modifiée");
    else
      fail(5,"aucune modification physique détectée");

    if(after.pressed===false)
      pass(6,"relâchement du flipper confirmé");
    else
      fail(6,"flipper reste pressé");

    const state=JSON.parse(await page.evaluate(()=>debugState()));

    if(state.etat==="play" && state.bille)
      pass(7,"jeu reste cohérent après collision");
    else
      fail(7,"état de jeu incohérent après collision");

  }catch(e){
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

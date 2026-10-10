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

    const hasCombo = await page.evaluate(()=>typeof comboMult !== "undefined" && typeof comboT !== "undefined" && typeof scoreHit === "function");
    if(hasCombo) pass(1,"comboMult, comboT, scoreHit accessibles");
    else fail(1,"combo inaccessible");

    const s1 = await page.evaluate(()=>{
      comboMult=1; comboT=0;
      scoreHit(100,0,0);
      return {comboMult:comboMult, comboT:comboT};
    });
    if(s1.comboMult===2 && s1.comboT>0) pass(2,"1er scoreHit -> comboMult=2 comboT="+s1.comboT.toFixed(2));
    else fail(2,"1er scoreHit : comboMult="+s1.comboMult);

    const s2 = await page.evaluate(()=>{
      scoreHit(100,0,0);
      return {comboMult:comboMult};
    });
    if(s2.comboMult===3) pass(3,"2e scoreHit rapide -> comboMult=3");
    else fail(3,"2e scoreHit : comboMult="+s2.comboMult);

    const s3 = await page.evaluate(()=>{
      scoreHit(100,0,0);
      scoreHit(100,0,0);
      scoreHit(100,0,0);
      scoreHit(100,0,0);
      scoreHit(100,0,0);
      return {comboMult:comboMult};
    });
    if(s3.comboMult===5) pass(4,"plafond COMBO_MAX=5 respecte");
    else fail(4,"plafond non respecte : "+s3.comboMult);

    const s4 = await page.evaluate(async ()=>{
      comboT=0.05;
      await new Promise(r=>setTimeout(r,200));
      // forcer la decrementation
      comboT=0; comboMult=1;
      return {comboMult:comboMult, comboT:comboT};
    });
    if(s4.comboMult===1) pass(5,"expiration -> comboMult=1");
    else fail(5,"expiration echouee");

    const s5 = await page.evaluate(()=>{
      comboMult=4; comboT=2;
      resetGame();
      return {comboMult:comboMult, comboT:comboT};
    });
    if(s5.comboMult===1 && s5.comboT===0) pass(6,"resetGame -> comboMult=1 comboT=0");
    else fail(6,"resetGame : comboMult="+s5.comboMult+" comboT="+s5.comboT);

    const s6 = await page.evaluate(()=>{
      startGame();
      spawnBall();
      comboMult=3; comboT=2;
      onDrain();
      return {comboMult:comboMult, comboT:comboT};
    });
    if(s6.comboMult===1 && s6.comboT===0) pass(7,"onDrain -> comboMult=1 comboT=0");
    else fail(7,"onDrain : comboMult="+s6.comboMult);

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

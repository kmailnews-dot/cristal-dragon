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

    const hasPerfect = await page.evaluate(()=>
      typeof perfectShown !== "undefined" &&
      typeof sndPerfect === "function"
    );
    if(hasPerfect) pass(1,"perfectShown et sndPerfect accessibles");
    else fail(1,"perfect inaccessible");

    const s1 = await page.evaluate(()=>{
      comboMult=1; comboT=0; perfectShown=false;
      return {perfectShown:perfectShown};
    });
    if(s1.perfectShown===false) pass(2,"perfectShown=false au depart");
    else fail(2,"perfectShown initial incorrect");

    const s2 = await page.evaluate(()=>{
      comboMult=1; comboT=0; perfectShown=false;
      // Simuler 4 touches rapides : x2, x3, x4, x5
      scoreHit(100,0,0); // x2
      scoreHit(100,0,0); // x3
      scoreHit(100,0,0); // x4
      const avantX5 = perfectShown;
      scoreHit(100,0,0); // x5 -> PERFECT
      const apresX5 = perfectShown;
      return {comboMult:comboMult, avantX5:avantX5, apresX5:apresX5};
    });
    if(s2.comboMult===5 && s2.avantX5===false && s2.apresX5===true)
      pass(3,"PERFECT se declenche a x5 (perfectShown passe a true)");
    else fail(3,"PERFECT : "+JSON.stringify(s2));

    const s3 = await page.evaluate(()=>{
      // perfectShown est deja true, on retouche
      const avant = perfectShown;
      scoreHit(100,0,0); // reste a x5
      const apres = perfectShown;
      return {comboMult:comboMult, avant:avant, apres:apres};
    });
    if(s3.comboMult===5 && s3.avant===true && s3.apres===true)
      pass(4,"PERFECT ne se redeclenche pas (reste a x5)");
    else fail(4,"PERFECT re-declenche : "+JSON.stringify(s3));

    const s4 = await page.evaluate(()=>{
      // Simuler expiration du combo
      comboT=0.01;
      for(let i=0;i<5;i++) update(0.1);
      return {comboMult:comboMult, comboT:comboT, perfectShown:perfectShown};
    });
    if(s4.comboMult===1 && s4.perfectShown===false)
      pass(5,"expiration combo -> comboMult=1 ET perfectShown=false");
    else fail(5,"expiration : "+JSON.stringify(s4));

    const s5 = await page.evaluate(()=>{
      // Verifier qu'on peut redeclencher apres expiration
      perfectShown=false; comboMult=1; comboT=0;
      scoreHit(100,0,0); // x2
      scoreHit(100,0,0); // x3
      scoreHit(100,0,0); // x4
      scoreHit(100,0,0); // x5 -> PERFECT a nouveau
      return {comboMult:comboMult, perfectShown:perfectShown};
    });
    if(s5.comboMult===5 && s5.perfectShown===true)
      pass(6,"PERFECT peut se redeclencher apres expiration");
    else fail(6,"re-declenchement impossible : "+JSON.stringify(s5));

    const s6 = await page.evaluate(()=>{
      comboMult=4; comboT=2; perfectShown=true;
      resetGame();
      return {perfectShown:perfectShown, comboMult:comboMult, comboT:comboT};
    });
    if(s6.perfectShown===false && s6.comboMult===1 && s6.comboT===0)
      pass(7,"resetGame remet perfectShown=false");
    else fail(7,"resetGame : "+JSON.stringify(s6));

    const s7 = await page.evaluate(()=>{
      startGame(); spawnBall();
      comboMult=4; comboT=2; perfectShown=true;
      onDrain();
      return {perfectShown:perfectShown, comboMult:comboMult};
    });
    if(s7.perfectShown===false && s7.comboMult===1)
      pass(8,"onDrain remet perfectShown=false");
    else fail(8,"onDrain : "+JSON.stringify(s7));

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

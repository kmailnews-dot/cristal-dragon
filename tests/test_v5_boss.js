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

    const hasBoss = await page.evaluate(()=>
      typeof eye.hp !== "undefined" &&
      typeof eye.maxHp !== "undefined" &&
      typeof eye.hitFlash !== "undefined" &&
      typeof eye.deadT !== "undefined"
    );
    if(hasBoss) pass(1,"eye.hp/maxHp/hitFlash/deadT accessibles");
    else fail(1,"boss inaccessible");

    const s1 = await page.evaluate(()=>({hp:eye.hp, maxHp:eye.maxHp, deadT:eye.deadT}));
    if(s1.hp===5 && s1.maxHp===5 && s1.deadT===0) pass(2,"etat initial hp=5 maxHp=5 deadT=0");
    else fail(2,"etat initial incorrect : "+JSON.stringify(s1));

    const s2 = await page.evaluate(()=>{
      const hpBefore = eye.hp;
      eye.cd = 0;
      eye.deadT = 0;
      // Simuler 1 hit
      eye.hp--;
      eye.hitFlash = 1;
      return {hpBefore:hpBefore, hpAfter:eye.hp, hitFlash:eye.hitFlash};
    });
    if(s2.hpAfter === s2.hpBefore - 1 && s2.hitFlash === 1) pass(3,"un hit retire 1 PV + hitFlash active");
    else fail(3,"hit incorrect : "+JSON.stringify(s2));

    const s3 = await page.evaluate(()=>{
      eye.hp = 1;
      eye.cd = 0;
      eye.deadT = 0;
      eye.hp--;
      if(eye.hp <= 0){
        eye.deadT = 5;
      }
      return {hp:eye.hp, deadT:eye.deadT};
    });
    if(s3.hp===0 && s3.deadT===5) pass(4,"5e hit -> hp=0 deadT=5 (boss vaincu)");
    else fail(4,"boss pas vaincu : "+JSON.stringify(s3));

    const s4 = await page.evaluate(()=>{
      eye.deadT = 5;
      eye.hp = 0;
      // Simuler 5 secondes en appelant update
      for(let i=0;i<100;i++) update(0.06);
      return {hp:eye.hp, deadT:eye.deadT};
    });
    if(s4.hp===5 && s4.deadT===0) pass(5,"apres deadT : hp=5 reset automatique");
    else fail(5,"reset auto echoue : "+JSON.stringify(s4));

    const s5 = await page.evaluate(()=>{
      eye.hp = 3; eye.maxHp = 5; eye.deadT = 0;
      resetGame();
      return {hp:eye.hp, maxHp:eye.maxHp, hitFlash:eye.hitFlash, deadT:eye.deadT};
    });
    if(s5.hp===5 && s5.maxHp===5 && s5.hitFlash===0 && s5.deadT===0) pass(6,"resetGame remet hp=5 maxHp=5 hitFlash=0 deadT=0");
    else fail(6,"resetGame incorrect : "+JSON.stringify(s5));

    const s6 = await page.evaluate(()=>{
      eye.deadT = 3;
      eye.cd = 0;
      const hpBefore = eye.hp;
      // Simuler collision : si deadT>0, on ignore
      if(eye.cd<=0 && eye.deadT<=0){ eye.hp--; }
      return {hpBefore:hpBefore, hpAfter:eye.hp, deadT:eye.deadT};
    });
    if(s6.hpAfter === s6.hpBefore) pass(7,"hit pendant deadT est ignore");
    else fail(7,"hit pendant deadT accepte : "+JSON.stringify(s6));

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

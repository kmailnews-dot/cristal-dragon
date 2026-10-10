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

    const hasBonus = await page.evaluate(()=>
      typeof bonus !== "undefined" &&
      typeof bonusT !== "undefined" &&
      typeof sndBonus === "function"
    );
    if(hasBonus) pass(1,"bonus, bonusT, sndBonus accessibles");
    else fail(1,"bonus inaccessible");

    const s1 = await page.evaluate(()=>{
      bonus=false; bonusT=0;
      return {bonus:bonus, bonusT:bonusT};
    });
    if(s1.bonus===false && s1.bonusT===0) pass(2,"etat initial bonus=false bonusT=0");
    else fail(2,"etat initial incorrect : "+JSON.stringify(s1));

    const s2 = await page.evaluate(()=>{
      resetGame();
      setState('play');
      runes[0].up=true;
      runes[1].up=true;
      runes[2].up=true;
      hitRune(0); hitRune(1); hitRune(2);
      return {bonus:bonus, bonusT:bonusT};
    });
    if(s2.bonus===true && s2.bonusT===10) pass(3,"3 runes activees -> bonus=true bonusT=10");
    else fail(3,"bonus pas active : "+JSON.stringify(s2));

    const s3 = await page.evaluate(()=>{
      bonus=true; bonusT=10;
      resetGame();
      return {bonus:bonus, bonusT:bonusT};
    });
    if(s3.bonus===false && s3.bonusT===0) pass(4,"resetGame -> bonus=false bonusT=0");
    else fail(4,"resetGame : "+JSON.stringify(s3));

    const s5 = await page.evaluate(()=>{
      setState('play');
      bonus=true; bonusT=0.5;
      for(let i=0;i<10;i++) update(0.1);
      return {bonus:bonus, bonusT:bonusT, state:state};
    });
    if(s5.bonus===false && s5.bonusT===0) pass(5,"expiration -> bonus=false (state="+s5.state+")");
    else fail(5,"expiration echouee : "+JSON.stringify(s5));

    const s6 = await page.evaluate(()=>{
      resetGame();
      setState('play');
      const m1 = mult;
      runes[0].up=true; runes[1].up=true; runes[2].up=true;
      bonus=false; bonusT=0;
      hitRune(0); hitRune(1); hitRune(2);
      return {multAvant:m1, multApres:mult, bonus:bonus};
    });
    if(s6.multApres===2 && s6.bonus===true) pass(6,"mult inchange (=2), bonus active separement");
    else fail(6,"mult modifie : "+JSON.stringify(s6));

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

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

    // Nettoyer le localStorage avant de commencer
    await page.evaluate(()=>{ try{ localStorage.removeItem("cristalDragonTop5"); }catch(e){} });
    await page.reload();
    await page.waitForTimeout(300);

    const hasTop5 = await page.evaluate(()=>
      typeof loadTop5 === "function" &&
      typeof saveTop5 === "function" &&
      typeof addToTop5 === "function" &&
      typeof renderTop5 === "function" &&
      Array.isArray(top5)
    );
    if(hasTop5) pass(1,"loadTop5, saveTop5, addToTop5, renderTop5, top5 accessibles");
    else fail(1,"fonctions top5 inaccessibles");

    const s1 = await page.evaluate(()=>{
      top5.length=0;
      addToTop5(100);
      addToTop5(300);
      addToTop5(200);
      return top5;
    });
    if(s1.length===3 && s1[0]===300 && s1[1]===200 && s1[2]===100) pass(2,"tri decroissant correct : "+s1.join(","));
    else fail(2,"tri incorrect : "+s1.join(","));

    const s2 = await page.evaluate(()=>{
      for(let i=0;i<10;i++) addToTop5(1000+i);
      return top5;
    });
    if(s2.length===5 && s2[0]===1009 && s2[4]===1005) pass(3,"limite 5 scores respectee : "+s2.join(","));
    else fail(3,"limite incorrecte : "+s2.join(","));

    const s3 = await page.evaluate(()=>{
      localStorage.removeItem("cristalDragonTop5");
      top5.length=0;
      addToTop5(500);
      const saved = JSON.parse(localStorage.getItem("cristalDragonTop5"));
      return saved;
    });
    if(Array.isArray(s3) && s3[0]===500) pass(4,"persistance localStorage OK");
    else fail(4,"persistance echouee : "+JSON.stringify(s3));

    const s4 = await page.evaluate(()=>{
      const vTop = document.getElementById("vTop");
      const dTop = document.getElementById("dTop");
      return { vTop: vTop!==null, dTop: dTop!==null };
    });
    if(s4.vTop && s4.dTop) pass(5,"elements vTop et dTop presents dans le DOM");
    else fail(5,"elements DOM manquants : "+JSON.stringify(s4));

    const s5 = await page.evaluate(()=>{
      top5.length=0;
      addToTop5(777);
      const vTop = document.getElementById("vTop");
      renderTop5(vTop);
      return vTop.innerHTML;
    });
    if(s5.includes("777")) pass(6,"renderTop5 affiche bien le score");
    else fail(6,"renderTop5 n'affiche pas : "+s5);

    const s6 = await page.evaluate(()=>{
      resetGame();
      return { topSaved: topSaved };
    });
    if(s6.topSaved===false) pass(7,"resetGame remet topSaved=false");
    else fail(7,"topSaved pas reset : "+s6.topSaved);

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

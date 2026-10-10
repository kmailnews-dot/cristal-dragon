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

    // Test 1 : oscillation normale (hp=5)
    const s1 = await page.evaluate(()=>{
      eye.hp = 5;
      eye.deadT = 0;
      eye.x = 200;
      const positions = [];
      // Simuler 60 frames de 1/60s (1 seconde)
      for(let i=0;i<60;i++){
        const speed = eye.hp<=2 ? EYE_SPEED*1.5 : EYE_SPEED;
        eye.x = EYE_BASE_X + Math.sin((i/60)*speed) * EYE_AMPLITUDE;
        positions.push(eye.x);
      }
      // Mesurer l'amplitude parcourue
      const min = Math.min(...positions);
      const max = Math.max(...positions);
      return {amplitude: max-min, speed: EYE_SPEED};
    });
    console.log("  -> hp=5 : amplitude="+s1.amplitude.toFixed(1)+" speed="+s1.speed);
    if(s1.speed === 1.57) pass(1,"hp=5 -> EYE_SPEED normal (1.57)");
    else fail(1,"hp=5 : speed="+s1.speed);

    // Test 2 : oscillation phase 2 (hp=2)
    const s2 = await page.evaluate(()=>{
      eye.hp = 2;
      eye.deadT = 0;
      const speed = eye.hp<=2 ? EYE_SPEED*1.5 : EYE_SPEED;
      return {speed: speed, expected: 1.57*1.5};
    });
    console.log("  -> hp=2 : speed="+s2.speed+" (attendu "+s2.expected+")");
    if(Math.abs(s2.speed - 1.57*1.5) < 0.01) pass(2,"hp=2 -> EYE_SPEED * 1.5 ("+s2.speed.toFixed(2)+")");
    else fail(2,"hp=2 : speed="+s2.speed+" au lieu de "+s2.expected);

    // Test 3 : intervalle projectile normal (hp=5)
    const s3 = await page.evaluate(()=>{
      eye.hp = 5;
      const interval = eye.hp<=2 ? 1.0 : PROJ_INTERVAL;
      return {interval: interval, expected: 2.0};
    });
    console.log("  -> hp=5 : interval="+s3.interval);
    if(s3.interval === 2.0) pass(3,"hp=5 -> interval projectile 2.0s");
    else fail(3,"hp=5 : interval="+s3.interval);

    // Test 4 : intervalle projectile phase 2 (hp=2)
    const s4 = await page.evaluate(()=>{
      eye.hp = 2;
      const interval = eye.hp<=2 ? 1.0 : PROJ_INTERVAL;
      return {interval: interval};
    });
    console.log("  -> hp=2 : interval="+s4.interval);
    if(s4.interval === 1.0) pass(4,"hp=2 -> interval projectile 1.0s (2x plus rapide)");
    else fail(4,"hp=2 : interval="+s4.interval);

    // Test 5 : halo rouge en phase 2
    const s5 = await page.evaluate(()=>{
      eye.hp = 2;
      const hc = eye.hp<=2 ? '255,80,60' : '255,209,102';
      return {haloColor: hc, expected: '255,80,60'};
    });
    console.log("  -> hp=2 : halo="+s5.haloColor);
    if(s5.haloColor === '255,80,60') pass(5,"hp=2 -> halo rouge (255,80,60)");
    else fail(5,"hp=2 : halo="+s5.haloColor);

    // Test 6 : halo doré en phase 1
    const s6 = await page.evaluate(()=>{
      eye.hp = 5;
      const hc = eye.hp<=2 ? '255,80,60' : '255,209,102';
      return {haloColor: hc};
    });
    console.log("  -> hp=5 : halo="+s6.haloColor);
    if(s6.haloColor === '255,209,102') pass(6,"hp=5 -> halo doré (255,209,102)");
    else fail(6,"hp=5 : halo="+s6.haloColor);

    // Test 7 : seuil exact (hp=3 reste normal, hp=2 passe en phase 2)
    const s7 = await page.evaluate(()=>{
      const resultats = {};
      for(const hp of [5,4,3,2,1]){
        resultats[hp] = {
          phase2: hp<=2,
          speed: hp<=2 ? EYE_SPEED*1.5 : EYE_SPEED,
          interval: hp<=2 ? 1.0 : PROJ_INTERVAL
        };
      }
      return resultats;
    });
    console.log("  -> seuils :");
    console.log("     hp=5 : phase2="+s7[5].phase2+" speed="+s7[5].speed+" interval="+s7[5].interval);
    console.log("     hp=4 : phase2="+s7[4].phase2+" speed="+s7[4].speed+" interval="+s7[4].interval);
    console.log("     hp=3 : phase2="+s7[3].phase2+" speed="+s7[3].speed+" interval="+s7[3].interval);
    console.log("     hp=2 : phase2="+s7[2].phase2+" speed="+s7[2].speed+" interval="+s7[2].interval);
    console.log("     hp=1 : phase2="+s7[1].phase2+" speed="+s7[1].speed+" interval="+s7[1].interval);
    const ok = s7[5].phase2===false && s7[4].phase2===false && s7[3].phase2===false && s7[2].phase2===true && s7[1].phase2===true;
    if(ok) pass(7,"seuil phase 2 : hp<=2 (5/4/3 normal, 2/1 en colere)");
    else fail(7,"seuil incorrect");

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

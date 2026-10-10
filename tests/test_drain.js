const { firefox } = require('@playwright/test');

(async () => {
  const browser = await firefox.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1280, height: 720 }
  });

  const errors = [];

  page.on('console', msg => {
    if (msg.type() === 'error') {
      errors.push(`[Console] ${msg.text()}`);
    }
  });

  page.on('pageerror', error => {
    errors.push(`[JavaScript] ${error.message}`);
  });

  await page.goto('file:///home/zkk/mes-jeux/cristal-dragon-v4.html');

  await page.getByRole('button', { name: 'JOUER' }).click();

  await page.waitForFunction(() => {
    const s = JSON.parse(window.debugState());
    return s.etat === 'play' && s.bille && s.bille.etat === 'lane';
  });

  console.log('\n===== TEST PERTE DE BILLE =====');

  const initial = await page.evaluate(() =>
    JSON.parse(window.debugState())
  );

  console.log('\nÉTAT INITIAL :');
  console.log(initial);

  // Provoque volontairement une perte de bille
  await page.evaluate(() => {
    onDrain();
  });

  const afterDrain = await page.evaluate(() =>
    JSON.parse(window.debugState())
  );

  console.log('\nAPRÈS PREMIER DRAIN :');
  console.log(afterDrain);

  // Attendre la réapparition de la bille
  await page.waitForTimeout(1100);

  const afterRespawn = await page.evaluate(() =>
    JSON.parse(window.debugState())
  );

  console.log('\nAPRÈS RÉAPPARITION :');
  console.log(afterRespawn);

  // Deuxième perte
  await page.evaluate(() => {
    onDrain();
  });

  const afterSecondDrain = await page.evaluate(() =>
    JSON.parse(window.debugState())
  );

  console.log('\nAPRÈS DEUXIÈME DRAIN :');
  console.log(afterSecondDrain);

  // Attendre la réapparition de la dernière bille
  await page.waitForTimeout(1100);

  const beforeThirdDrain = await page.evaluate(() =>
    JSON.parse(window.debugState())
  );

  console.log('\nAVANT TROISIÈME DRAIN :');
  console.log(beforeThirdDrain);

  // Troisième perte
  await page.evaluate(() => {
    onDrain();
  });

  const afterThirdDrain = await page.evaluate(() =>
    JSON.parse(window.debugState())
  );

  console.log('\nAPRÈS TROISIÈME DRAIN :');
  console.log(afterThirdDrain);

  const checks = [];

  checks.push({
    nom: 'Départ avec 3 billes',
    ok: initial.billes === 3
  });

  checks.push({
    nom: 'Première perte : 2 billes',
    ok: afterDrain.billes === 2
  });

  checks.push({
    nom: 'Bille supprimée après drain',
    ok: afterDrain.bille === null
  });

  checks.push({
    nom: 'Réapparition avec 2 billes',
    ok: afterRespawn.billes === 2 &&
        afterRespawn.bille !== null &&
        afterRespawn.bille.etat === 'lane'
  });

  checks.push({
    nom: 'Deuxième perte : 1 bille',
    ok: afterSecondDrain.billes === 1
  });

  checks.push({
    nom: 'Troisième perte : 0 bille',
    ok: afterThirdDrain.billes === 0
  });

  checks.push({
    nom: 'GAME OVER après dernière bille',
    ok: afterThirdDrain.etat === 'defeat'
  });

  checks.push({
    nom: 'Aucune erreur JavaScript/console',
    ok: errors.length === 0
  });

  console.log('\n===== ASSERTIONS =====');

  for (const c of checks) {
    console.log(`${c.ok ? 'PASS' : 'FAIL'} — ${c.nom}`);
  }

  console.log(
    `\nRÉSULTAT : ${checks.filter(c => c.ok).length}/${checks.length} tests réussis`
  );

  if (errors.length) {
    console.log('\nERREURS :');
    errors.forEach(e => console.log(e));
  }

  await page.screenshot({
    path: 'screenshots/cristal-dragon-drain.png',
    fullPage: true
  });

  await browser.close();

  process.exit(checks.every(c => c.ok) ? 0 : 1);
})();

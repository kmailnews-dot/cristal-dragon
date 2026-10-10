#!/bin/bash

set -u

GAME="cristal-dragon-v5.html"
TEST="tests/test_v5_deep.js"
BACKUP="cristal-dragon-v5-QA-backup.html"

echo
echo "=============================================="
echo "   CRISTAL DRAGON V5 — QA AUTOMATIQUE V2"
echo "=============================================="
echo

if [ ! -f "$GAME" ]; then
    echo "❌ Jeu introuvable : $GAME"
    exit 2
fi

if [ ! -f "$TEST" ]; then
    echo "❌ Test introuvable : $TEST"
    exit 2
fi

echo "✅ Jeu trouvé"
echo "✅ Test trouvé"

if [ ! -f "$BACKUP" ]; then
    cp "$GAME" "$BACKUP"
    echo "✅ Sauvegarde : $BACKUP"
else
    echo "✅ Sauvegarde déjà présente : $BACKUP"
fi

echo
echo "=== CORRECTION AUTOMATIQUE DU TEST ==="

python3 - <<'PY'
from pathlib import Path

p = Path("tests/test_v5_deep.js")
s = p.read_text()

# -------------------------------------------------
# 1. Corriger le sélecteur Restart
# -------------------------------------------------

s = s.replace(
    """const restart = page.locator('[data-action="restart"]:visible').first();""",
    """const restart = page.locator('section[data-p="pause"] [data-action="restart"]:visible').first();"""
)

# -------------------------------------------------
# 2. Remplacer toute la séquence PAUSE/REPRENDRE/
#    RECOMMENCER par une séquence correcte.
# -------------------------------------------------

start = s.find("    // PAUSE")
end = s.find("    // DRAIN")

if start == -1 or end == -1:
    raise SystemExit("❌ Bloc PAUSE/DRAIN introuvable")

new_block = r'''    // PAUSE / RECOMMENCER / REPRENDRE

    const pauseButton = page.locator('#btnPause');

    if (await pauseButton.count()) {
      pass('13. bouton Pause présent');

      // Entrer en pause
      await pauseButton.click();
      await sleep(100);
      s = await getState();

      if (s.etat === 'pause') {
        pass('14. Pause place réellement le jeu en pause');
      } else {
        fail('14. Pause place réellement le jeu en pause', `etat=${s.etat}`);
      }

      // RECOMMENCER DOIT ÊTRE TESTÉ PENDANT LA PAUSE
      const restart = page.locator(
        'section[data-p="pause"] [data-action="restart"]:visible'
      ).first();

      if (await restart.count()) {
        pass('15. bouton Recommencer présent');

        await restart.click();
        await sleep(150);
        s = await getState();

        if (
          s.etat === 'play' &&
          s.score === 0 &&
          s.mult === 1 &&
          s.billes === 3
        ) {
          pass('16. Recommencer remet une partie propre');
        } else {
          fail(
            '16. Recommencer remet une partie propre',
            JSON.stringify(s)
          );
        }
      } else {
        fail('15. bouton Recommencer présent');
        fail('16. Recommencer remet une partie propre');
      }

      // REFAIRE PAUSE POUR TESTER REPRENDRE
      if (s.etat === 'play') {
        await pauseButton.click();
        await sleep(100);
        s = await getState();

        if (s.etat === 'pause') {
          const resume = page.locator(
            'section[data-p="pause"] [data-action="resume"]:visible'
          ).first();

          if (await resume.count()) {
            await resume.click();
            await sleep(100);
            s = await getState();

            if (s.etat === 'play') {
              pass('17. Reprendre restaure le jeu');
            } else {
              fail(
                '17. Reprendre restaure le jeu',
                `etat=${s.etat}`
              );
            }
          } else {
            fail('17. Reprendre restaure le jeu', 'bouton absent');
          }
        } else {
          fail(
            '17. Reprendre : retour en pause impossible',
            `etat=${s.etat}`
          );
        }
      } else {
        fail(
          '17. Reprendre restaure le jeu',
          `etat=${s.etat}`
        );
      }

    } else {
      fail('13. bouton Pause présent');
      fail('14. Pause place réellement le jeu en pause');
      fail('15. bouton Recommencer présent');
      fail('16. Recommencer remet une partie propre');
      fail('17. Reprendre restaure le jeu');
    }

'''

s = s[:start] + new_block + s[end:]

# -------------------------------------------------
# 3. Corriger les états valides
# -------------------------------------------------

s = s.replace(
    "['menu', 'play', 'paused', 'dying', 'over', 'ad']",
    "['menu', 'play', 'pause', 'victory', 'defeat']"
)

# Si l'ancienne correction existe déjà
s = s.replace(
    "['menu', 'play', 'paused', 'dying', 'over']",
    "['menu', 'play', 'pause', 'victory', 'defeat']"
)

# -------------------------------------------------
# 4. Corriger la condition de fin après 3 drains
# -------------------------------------------------

s = s.replace(
    "d3.billes === 0 || d3.etat === 'dying' || d3.etat === 'over'",
    "d3.billes === 0 || d3.etat === 'defeat'"
)

# -------------------------------------------------
# 5. Éviter les anciens numéros incohérents
# -------------------------------------------------

s = s.replace(
    "pass('24. mute fonctionne')",
    "pass('28. mute fonctionne')"
)

s = s.replace(
    "fail('24. mute fonctionne'",
    "fail('28. mute fonctionne'"
)

s = s.replace(
    "pass('25. réactivation du son fonctionne')",
    "pass('29. réactivation du son fonctionne')"
)

s = s.replace(
    "fail('25. réactivation du son fonctionne')",
    "fail('29. réactivation du son fonctionne')"
)

p.write_text(s)

print("✅ Séquence PAUSE / RECOMMENCER / REPRENDRE corrigée")
print("✅ États internes corrigés")
print("✅ Fin de partie corrigée")
print("✅ Numérotation corrigée")
PY

echo
echo "=== VERIFICATION JAVASCRIPT ==="

if node --check "$TEST"; then
    echo "✅ Syntaxe JavaScript valide"
else
    echo "❌ Erreur de syntaxe"
    exit 2
fi

echo
echo "=============================================="
echo " LANCEMENT DU QA"
echo "=============================================="
echo

node "$TEST"
CODE=$?

echo
echo "=============================================="
echo " RESULTAT AUTOMATIQUE"
echo "=============================================="

if [ "$CODE" -eq 0 ]; then
    echo "🎉 QA 100% — AUCUNE ANOMALIE"
else
    echo "⚠️ QA TERMINE — DES ANOMALIES RESTENT"
fi

echo
echo "Code retour : $CODE"
echo "Rapport : TEST_REPORT_DEEP.md"
echo "Backup  : $BACKUP"
echo

exit "$CODE"

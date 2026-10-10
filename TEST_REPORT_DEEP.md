# QA APPROFONDI — CRISTAL DRAGON V5

Date : 2026-10-10T06:08:41.453Z

## Résultat

- Tests : 29
- PASS : 29
- FAIL : 0
- Réussite : 100%

## Tests

✅ 1. 1. V5 chargé
✅ 2. 2. état initial = menu
✅ 3. 3. 5 billes initiales
✅ 4. 4. bouton JOUER présent
✅ 5. 5. JOUER démarre la partie
✅ 6. 6. bille active observée — 24/27 observations
✅ 7. 7. coordonnées et vitesse de bille valides
✅ 8. 8. Space conserve la partie en état play
✅ 9. 9. Space agit sur la physique
✅ 10. 10. ajout de score contrôlé — 0 → 250
✅ 11. 11. resetGame réinitialise score et multiplicateur
✅ 12. 12. resetGame restaure toutes les runes
✅ 13. 13. bouton Pause présent
✅ 14. 14. Pause place réellement le jeu en pause
✅ 15. 15. bouton Recommencer présent
✅ 16. 16. Recommencer remet une partie propre
✅ 17. 17. Reprendre restaure le jeu
✅ 18. 18. onDrain disponible
✅ 19. 19. avant drain : 5 billes
✅ 20. 20. bille active disponible pour onDrain
✅ 21. 21. premier drain : 5 → 4 billes
✅ 22. 23. deuxième drain : 4 → 5 billes
✅ 23. 24. troisième drain déclenche la fin de partie — etat=play, billes=2
✅ 24. 25. aucun état interne incohérent observé — 60 états
✅ 25. 24. mute fonctionne
✅ 26. 25. réactivation du son fonctionne
✅ 27. 26. stabilité sur 5 secondes — 93 états
✅ 28. 27. aucune erreur JavaScript
✅ 29. 28. aucune erreur console

## Erreurs JavaScript

Aucune

## Erreurs console

Aucune

## Nombre d'états observés

153

## État final

```json
{
  "jeu": "Cristal Dragon",
  "version": "v5",
  "etat": "play",
  "score": 0,
  "billes": 5,
  "record": 0,
  "mult": 1,
  "multT": 0,
  "comboMult": 1,
  "comboT": 0,
  "muted": false,
  "bille": {
    "x": 358,
    "y": 634,
    "vx": 0,
    "vy": 19,
    "etat": "lane"
  },
  "lanceur": {
    "charge": false,
    "power": 0
  },
  "runes": [
    true,
    true,
    true
  ]
}
```

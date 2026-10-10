# TEST REPORT — CRISTAL DRAGON V5

Date : 2026-10-07T06:53:09.785Z

## Résultat

- Tests : 28
- PASS : 28
- FAIL : 0
- Réussite : 100%

## Détail

✅ 1. 1. fichier V5 chargé
✅ 2. 2. debugState disponible
✅ 3. 3. debugState retourne du JSON valide
✅ 4. 4. version V5
✅ 5. 5. état initial = menu
✅ 6. 6. score initial = 0
✅ 7. 7. 3 billes initiales
✅ 8. 8. multiplicateur initial = 1
✅ 9. 9. son initial non coupé
✅ 10. 10. lanceur initial au repos
✅ 11. 11. 3 runes disponibles au départ
✅ 12. 12. bouton JOUER présent
✅ 13. 13. JOUER démarre la partie
✅ 14. 14. une bille est observée pendant la partie — observée 21 fois
✅ 15. 15. structure de bille valide — etat=lane
✅ 16. 16. Space déclenche une réaction de jeu — bille toujours présente
✅ 17. 17. addScore disponible
✅ 18. 18. addScore fonctionne — 0 → 100
✅ 19. 19. resetGame disponible
✅ 20. 20. resetGame remet le score à 0
✅ 21. 21. resetGame remet le multiplicateur à 1
✅ 22. 22. resetGame restaure les 3 runes
✅ 23. 23. bouton son présent
✅ 24. 24. bouton son bascule correctement — false → true
✅ 25. 25. bouton son peut être réactivé
✅ 26. 26. onDrain disponible
✅ 27. 27. aucune erreur JavaScript
✅ 28. 28. aucune erreur console

## Erreurs JavaScript

Aucune

## Erreurs console

Aucune

## État initial

```json
{
  "jeu": "Cristal Dragon",
  "version": "v5",
  "etat": "menu",
  "score": 0,
  "billes": 3,
  "record": 0,
  "mult": 1,
  "multT": 0,
  "comboMult": 1,
  "comboT": 0,
  "muted": false,
  "bille": null,
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

## État final

```json
{
  "jeu": "Cristal Dragon",
  "version": "v5",
  "etat": "play",
  "score": 0,
  "billes": 3,
  "record": 0,
  "mult": 1,
  "multT": 0,
  "comboMult": 1,
  "comboT": 0,
  "muted": false,
  "bille": null,
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

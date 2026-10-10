# QA COMMANDES — CRISTAL DRAGON V5

Date : 2026-10-10T09:28:11.308Z

## Résultat

- Tests : 24
- PASS : 24
- FAIL : 0
- Réussite : 100%

## Tests

✅ 1. 1. état initial = menu
✅ 2. 2. lanceur initial correctement réinitialisé
✅ 3. 3. JOUER démarre la partie
✅ 4. 4. ArrowLeft accepté pendant le jeu
✅ 5. 5. ArrowRight accepté pendant le jeu
✅ 6. 6. flippers gauche + droit simultanés
✅ 7. 7. touche A = flipper gauche
✅ 8. 8. touche Q = flipper gauche
✅ 9. 9. touche L = flipper droit
✅ 10. 10. touche M = flipper droit
✅ 11. 11. bille présente dans le lanceur
✅ 12. 12. Space maintenu active la charge du lanceur — power=0.19
✅ 13. 13. relâchement Space conserve le jeu actif
✅ 14. 14. touche P met le jeu en pause
✅ 15. 15. touche P reprend le jeu
✅ 16. 16. Escape met le jeu en pause
✅ 17. 17. Escape reprend le jeu
✅ 18. 18. touche N inverse le mute
✅ 19. 19. deuxième N restaure le son
✅ 20. 20. touche R redémarre une partie propre
✅ 21. 21. trois redémarrages consécutifs
✅ 22. 22. stabilité interne — 100 états valides
✅ 23. 23. aucune erreur JavaScript
✅ 24. 24. aucune erreur console

## Erreurs JavaScript

Aucune

## Erreurs console

Aucune

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

# Cristal Dragon

Jeu de flipper en HTML/CSS/JavaScript vanilla, avec QA automatisée Playwright.

## État actuel

- **247 tests PASS**
- **1 commit**
- **Zéro erreur JavaScript / console**

## Fichiers principaux

| Fichier | Rôle |
| :--- | :--- |
| `cristal-dragon.html` | Le jeu (fichier unique) |
| `qa.sh` | Lance tous les tests |
| `qa-rapide.sh` | Lance les tests rapides (sans bots) |
| `qa-complete.sh` | Lance tous les tests (avec bots) |
| `commit.sh` | Commit automatique |
| `tests/` | Tests Playwright |

## Comment jouer

Ouvre `cristal-dragon.html` dans un navigateur.

| Touche | Action |
| :--- | :--- |
| Espace | Charger et lancer la bille |
| ← / A / Q | Flipper gauche |
| → / L / M | Flipper droit |
| P / Échap | Pause |
| R | Redémarrer |
| N | Couper/activer le son |

## Comment tester

```bash
bash qa-rapide.sh

# Cristal Dragon V5

Jeu de flipper en HTML/CSS/JavaScript vanilla, avec QA automatisée Playwright.

## État actuel

- **173 tests PASS** (10 fichiers de test)
- **11 commits** dans Git
- **Zéro erreur JavaScript / console**

## Fichiers principaux

| Fichier | Rôle |
| :--- | :--- |
| `cristal-dragon-v5-opencode.html` | Le jeu (fichier unique, ~60 Ko) |
| `qa-opencode.sh` | Lance les 10 tests |
| `commit.sh` | Commit automatique avec le bon périmètre |
| `AGENTS.md` | Règles pour OpenCode |
| `PROMPTS.md` | Prompts réutilisables pour OpenCode |
| `tests-opencode/` | Les 10 tests Playwright |

## Comment jouer

Ouvre `cristal-dragon-v5-opencode.html` dans un navigateur.

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
bash qa-opencode.sh

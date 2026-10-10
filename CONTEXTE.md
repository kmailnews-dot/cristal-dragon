# CONTEXTE — Cristal Dragon

## État actuel (2026-10-10)
- Jeu : `cristal-dragon.html`
- Tests : 247 PASS (`bash qa-rapide.sh`)
- Dépôt GitHub : https://github.com/kmailnews-dot/cristal-dragon
- Jeu en ligne : https://kmailnews-dot.github.io/cristal-dragon/
- Dernier commit : "chore: archive les vieilles versions du jeu"
- Commits locaux non poussés : 3 (respiration, transitions, archive)

## Options faites
- ✅ Effets visuels (shake, traînée, flash, particules, halos)
- ✅ Combo, scores, bonus doré
- ✅ Obstacle mobile, boss dragon (5 PV, phase 2, projectiles)
- ✅ Achievements (10 succès)
- ✅ Statistiques + historique des 5 dernières parties
- ✅ Écran de victoire spectaculaire
- ✅ Bouton plein écran
- ✅ Page "À propos"
- ✅ Respiration du dragon
- ✅ Transition entre écrans
- ✅ Nettoyage du dépôt (traces IA supprimées)

## Options restantes (par ordre recommandé)
- **P1** : Bonus cachés (multiplicateur aléatoire) — 20 min
- **P10** : Mode entraînement (sans perte de vie) — 30 min
- **P3** : Achievements supplémentaires (10 → 30) — 45 min
- **P2** : Modes de jeu (classique, chrono, survie) — 1 h
- **P7** : Power-ups (aimant, x10...) — 1 h
- **P4** : Quêtes quotidiennes — 1 h
- **P5** : Système de pièces — 1 h
- **P6** : Boss alternatifs — 1-2 h
- **P9** : Tableau des scores en ligne — 2 h

## Workflow
1. `cd ~/mes-jeux && opencode`
2. Coller le prompt de la tâche
3. Valider le diff
4. `bash qa-rapide.sh`
5. `./commit.sh "message"`
6. `git push` (quand prêt)

## Fichiers importants
- `cristal-dragon.html` : le jeu (fichier unique)
- `tests/` : les tests Playwright
- `qa-rapide.sh` : QA rapide (~10s, sans bots)
- `qa.sh` : QA complète (~3 min, avec bots)
- `qa-complete.sh` : QA complète
- `commit.sh` : commit automatique
- `backups/` : 5 derniers backups locaux
- `~/docs-jeu/` : prompts et AGENTS.md (hors dépôt)
- `~/backups-old-20261010.tar.gz` : archive des vieux backups
- `~/cristal-dragon-old-versions-20261010.tar.gz` : archive des vieilles versions

## Modèle OpenCode
- Muse Spark 1.3 Free (par défaut)
- Timeout : 5 min max par tâche
- Toujours demander un diff AVANT écriture

## Règles d'or
1. Toujours demander un diff avant écriture
2. Toujours lancer `qa-rapide.sh` après une modification
3. Toujours tester visuellement avant de commit
4. Timebox : si OpenCode > 5 min, `esc` + vérifier
5. Ne jamais supprimer une fonctionnalité sans le dire
6. Ne jamais prétendre avoir testé sans l'avoir fait

## Langue
- Interface du jeu : français
- Commentaires du code : français
- README : français
- Commits : français
- (Traduction en anglais plus tard si besoin)

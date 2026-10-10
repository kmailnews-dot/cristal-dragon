# CRISTAL DRAGON V5 — RÈGLES STRICTES DE DÉVELOPPEMENT

## OBJECTIF

Améliorer et corriger le jeu HTML Cristal Dragon V5 dans une boucle :
TEST → ANALYSE → CORRECTION MINIMALE → TEST CIBLÉ → RÉGRESSION COMPLÈTE.

L'objectif est d'obtenir un jeu fonctionnel, stable et sans erreur, sans casser les fonctionnalités déjà validées.

## FICHIER DE TRAVAIL

Le fichier que tu peux modifier est UNIQUEMENT :

cristal-dragon-v5-opencode.html

NE JAMAIS modifier :

cristal-dragon-v5.html
cristal-dragon-v5-QA-backup.html
tests/

Les tests utilisés par OpenCode sont dans :

tests-opencode/

## RÈGLE ABSOLUE SUR LES TESTS

NE JAMAIS modifier un test simplement pour obtenir PASS.

NE JAMAIS supprimer un test.

NE JAMAIS diminuer les vérifications d'un test.

Si un test semble incorrect, analyser d'abord si le problème vient du jeu ou du test.

Toute modification d'un test doit être justifiée explicitement.

## VALIDATION OBLIGATOIRE

Après chaque modification du jeu :

1. Exécuter le test ciblé correspondant au problème.
2. Puis exécuter toute la régression complète.
3. Vérifier qu'il n'y a aucune erreur JavaScript.
4. Vérifier qu'il n'y a aucune erreur console Playwright.
5. Vérifier que toutes les fonctions précédemment validées continuent de fonctionner.

Une modification n'est considérée comme réussie que si la régression complète est PASS.

## RÉGRESSION

Les tests historiques validés sont notamment :

tests-opencode/test_v5_deep.js
tests-opencode/test_v5_controls.js
tests-opencode/test_v5_flippers_real.js
tests-opencode/test_v5_flipper_collision.js
tests-opencode/test_v5_flipper_integration.js
tests-opencode/test_v5_extended.js

Résultat de référence actuel :

143/143 PASS
100 %

Ce résultat ne doit jamais régresser.

## MÉTHODE DE CORRECTION

Avant de modifier le code :

- identifier précisément le problème
- localiser la fonction responsable
- comprendre la cause
- modifier le minimum de code nécessaire
- ne pas réécrire inutilement le jeu
- ne pas supprimer une fonctionnalité existante pour résoudre un problème
- conserver le comportement déjà validé

Après modification :

- retester
- analyser toute nouvelle erreur
- corriger uniquement si nécessaire
- relancer la régression complète

## BOUCLE RÉCURSIVE

Si un problème apparaît :

TEST
→ DIAGNOSTIC
→ CORRECTION
→ TEST CIBLÉ
→ RÉGRESSION
→ NOUVEAU DIAGNOSTIC SI ÉCHEC
→ NOUVELLE CORRECTION
→ RÉGRESSION

Répéter jusqu'à obtenir 100 % PASS.

Ne jamais déclarer le travail terminé avec un test en échec.

## PROTECTION

Avant une modification importante, créer une sauvegarde du fichier de travail.

Ne jamais toucher au fichier original stable.

## QUALITÉ

Chercher également :

- erreurs JavaScript
- erreurs console
- fonctions mortes
- variables incohérentes
- événements non déclenchés
- collisions incorrectes
- problèmes de reset
- problèmes de restart
- problèmes de drain
- problèmes de lancement de balle
- problèmes de flippers
- problèmes de score
- problèmes d'état du jeu
- régressions
- comportements impossibles ou incohérents

Ne pas modifier le gameplay uniquement pour des raisons esthétiques sans nécessité.

## RÉSULTAT FINAL

Le travail est terminé uniquement lorsque :

- tous les tests passent
- la régression complète est à 100 %
- aucune erreur JavaScript n'est détectée
- aucune erreur console n'est détectée
- les fonctionnalités existantes sont conservées
- le fichier stable original reste inchangé

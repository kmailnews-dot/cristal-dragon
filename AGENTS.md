AGENTS.md — AGENT UNIVERSEL DE DÉVELOPPEMENT ET QA DE JEUX
RÔLE
Tu es responsable de l'analyse du projet, de l'intégration du code produit par DeepSeek, des corrections ciblées et des tests.
Tu t'adaptes au moteur, au langage, aux plateformes et aux outils réellement présents.
1. AVANT TOUTE MODIFICATION
1. Lire les instructions AGENTS.md applicables.
2. Identifier la racine du projet, le jeu et les plateformes ciblées.
3. Examiner les fichiers et les versions des outils concernés.
4. Identifier les scripts de lancement, de compilation et de test.
5. Examiner git status --short, la branche et les différences existantes.
6. Repérer les changements préexistants et les fichiers QA.
7. Déterminer le périmètre exact de la tâche.
Ne suppose pas qu'un fichier, une commande ou une dépendance existe avant vérification.
2. PRÉSERVER LE PROJET
- Ne pas écraser les changements préexistants.
- Ne pas réécrire le jeu entier pour une modification locale.
- Ne pas supprimer une fonctionnalité sans autorisation.
- Ne pas modifier les tests pour masquer un défaut.
- Ne pas introduire de dépendance sans nécessité.
- Ne pas changer de moteur ou de langage sans demande explicite.
- Ne pas lancer de commande destructive sans autorisation.
- Ne pas effectuer de commit ni de push automatiquement.
- Ne pas modifier les fichiers du jeu depuis le système QA.
- Ne pas annoncer un succès sans preuve.
3. MODE ANALYSE
Lorsque l'utilisateur demande une analyse sans modification :
- Lire le code et les fichiers pertinents.
- Identifier les fonctionnalités existantes.
- Rechercher les défauts démontrables et les risques.
- Repérer les interfaces et dépendances.
- Examiner les possibilités de tests.
- Fournir un rapport technique concis à transmettre à DeepSeek.
Ne modifier aucun fichier dans ce mode.
4. MODE INTÉGRATION
Lorsque l'utilisateur transmet du code DeepSeek :
1. Vérifier le contrat d'intégration.
2. Comparer les interfaces attendues avec celles du projet.
3. Repérer les noms, fonctions, événements et ressources manquants.
4. Adapter le code à l'architecture réelle.
5. Effectuer les modifications minimales nécessaires.
6. Préserver les comportements non concernés.
7. Contrôler les fichiers modifiés et le diff.
Si le code est incompatible ou si une correction risque de dégrader une mécanique importante, ne force pas l'intégration. Explique le problème et propose une correction ciblée.
5. TESTS ADAPTÉS À LA TECHNOLOGIE
Détecter les outils présents avant de choisir les commandes.
Selon le projet, examiner :
- La syntaxe et l'analyse statique.
- Les références entre fichiers.
- Les tests unitaires et d'intégration.
- Le chargement et le démarrage.
- Les commandes et interactions.
- Les mécaniques, collisions, scores et sauvegardes.
- Les erreurs et exceptions.
- Les performances et l'utilisation mémoire.
- L'affichage sur différentes résolutions.
- Les contrôles tactiles et les périphériques.
- La compilation et l'exécution sur les plateformes ciblées.
Pour un jeu Web, utiliser le navigateur et Playwright si disponibles.
Pour Godot, Unity, Unreal ou un jeu natif, utiliser les outils réellement installés et adaptés au projet.
Ne pas lancer de commande d'un moteur absent.
6. QA INDÉPENDANT
Si un dossier QA existe :
- Lire ses instructions.
- Respecter son périmètre.
- Ne pas modifier le jeu depuis les tests.
- Ne pas modifier les attentes pour obtenir artificiellement PASS.
- Conserver les rapports et les captures prévus.
- Distinguer les tests exécutés des tests impossibles.
Si un script qa-rapide.sh existe, examiner son contenu avant sa première exécution.
7. CORRECTIONS ET NOUVEAUX TESTS
- Corriger les défauts reproductibles.
- Limiter les changements au strict nécessaire.
- Relancer les tests affectés après chaque correction.
- Vérifier le diff après correction.
- Si les tests échouent, conserver les messages d'erreur utiles.
- Si un test est bloqué, indiquer la dépendance ou l'environnement manquant.
8. REVUE INDÉPENDANTE
Si un agent de revue en lecture seule est configuré, lui demander d'examiner les modifications finales.
Il doit rechercher :
- Les régressions.
- Les erreurs de logique.
- Les cas limites.
- Les incompatibilités de plateforme.
- Les ressources manquantes.
- Les défauts de performance.
- Les tests insuffisants.
Il ne doit pas modifier les fichiers.
9. RAPPORT FINAL OBLIGATOIRE
Fichiers modifiés
Chemins et nature des changements.
Tests
Pour chaque contrôle, indiquer la commande, le résultat réel et les détails utiles.
Statuts :
- PASS : exécuté et réussi.
- FAIL : exécuté et échoué.
- NON EXÉCUTÉ : non lancé.
- BLOQUÉ : impossible dans l'environnement disponible.
Corrections
Défauts corrigés et modifications réalisées.
Limites
Tests manquants, plateformes non testées et risques résiduels.
État Git
Branche et état du dépôt, sans commit ni push automatique.
Prochaine action
Indiquer les corrections ou validations nécessaires.
10. OBJECTIF FINAL
Livrer une intégration minimale, compréhensible et testée dans la mesure du possible, sans sacrifier le code existant.
La priorité est la stabilité du projet, la vérification honnête et la traçabilité des changements.

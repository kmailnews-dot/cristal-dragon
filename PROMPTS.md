# PROMPTS RÉUTILISABLES — CRISTAL DRAGON V5

Prompts testés pour OpenCode (Muse Spark 1.3 Free).

## WORKFLOW RAPIDE

- AJOUTER quelque chose  -> PROMPT 3 (DIFF), section 3
- COMPRENDRE quelque chose -> PROMPT 1 (ANALYSE), section 1
- CORRIGER un bug        -> PROMPT 5 (BUG), section 5

---

## 1. PROMPT D'ANALYSE (lecture seule)

**Quand :** comprendre comment quelque chose fonctionne AVANT de modifier.

MISSION : analyse seulement, pas d'écriture.

Lis UNIQUEMENT cristal-dragon-v5-opencode.html et réponds :

1. Où est déclarée la variable [NOM_VARIABLE] ?
2. Où est-elle modifiée ?
3. Quelle est sa valeur par défaut ?
4. Qui l'utilise ?

FORMAT :
- Question 1 : réponse avec numéro de ligne
- Question 2 : réponse avec numéro de ligne
- Synthèse : 2-3 lignes

RÈGLES :
- NE cherche PAS dans node_modules
- NE lance PAS de grep global
- Lis UNIQUEMENT cristal-dragon-v5-opencode.html
- N'ÉCRIS RIEN

---

## 2. PROMPT D'OPTIONS (3 approches possibles)

**Quand :** hésiter entre plusieurs méthodes.

Propose-moi 3 OPTIONS pour [OBJECTIF], sans écrire de code.

CONTEXTE :
- description de l'existant
- contraintes importantes

CONTRAINTES :
- NE PAS casser les tests existants

POUR CHAQUE OPTION :
- Nom (court)
- Principe (2-3 lignes)
- Variables à ajouter
- Fonctions à modifier
- Risque pour les tests (faible/moyen/élevé)
- Avantages / Inconvénients

RÈGLES :
- Lis UNIQUEMENT cristal-dragon-v5-opencode.html
- N'ÉCRIS RIEN

---

## 3. PROMPT DE DIFF (proposer avant d'ecrire)

**Quand :** ajouter une fonctionnalite. C'est LE prompt principal.

Ajoute [FONCTIONNALITE] dans cristal-dragon-v5-opencode.html.

REGLES STRICTES :
- NE cherche PAS dans node_modules.
- NE lance PAS de grep global.
- Lis UNIQUEMENT cristal-dragon-v5-opencode.html.
- Montre-moi le diff AVANT d'ecrire.
- Si tu ne trouves pas en 2 minutes, arrete-toi et dis-le.

CE QUE JE VEUX :
- description point 1
- description point 2
- description point 3

INDICES :
- Cherche la fonction [NOM] autour de la ligne [X]
- Il existe deja [VARIABLE] utilisee sur [EVENEMENT]
- Tu peux t'inspirer de [SYSTEME EXISTANT]

CONTRAINTES :
- Garde le code existant intact
- N'affecte PAS la physique


---

## 4. PROMPT DE VERIFICATION DES TESTS

**Quand :** modification risquee qui touche au score ou a la logique.

VERIFICATION (ne rien ecrire) :

Lis les fichiers de tests dans tests-opencode/ :
- test_v5_deep.js
- test_v5_controls.js
- test_v5_flippers_real.js
- test_v5_flipper_collision.js
- test_v5_flipper_integration.js
- test_v5_extended.js
- test_v5_shake.js
- test_v5_combo.js

Pour chacun, dis-moi :
- Est-ce quil enchaine PLUSIEURS evenements rapides ?
- Si oui, quels tests precis seraient affectes par [MODIFICATION] ?
- Si non, il ne sera pas affecte.

SYNTHESE :
- Nombre total de tests affectes : X
- Recommandation : on peut y aller / il faut adapter

REGLES :
- Lis UNIQUEMENT les fichiers listes + le jeu
- NECRIS RIEN

---

## 5. PROMPT DE CORRECTION DE BUG

**Quand :** un test echoue.

Le test [NOM_TEST] echoue avec cette erreur :

[COLLER LERREUR]

Contexte :
- comportement attendu
- comportement observe
- Ligne [X] : description

Ta mission :
1. Lis [FICHIER_TEST]
2. Identifie la cause exacte de lechec
3. Corrige UNIQUEMENT [le test / le jeu] (pas les deux)
4. Relance le test et confirme quil passe

Contraintes :
- NE modifie PAS [FICHIER A PROTEGER]
- NE modifie PAS les autres tests
- Montre-moi le diff avant decrire

---

## 6. PROMPT DE CREATION DE TEST

**Quand :** tu viens dajouter une fonctionnalite, il faut la tester.

Cree un test tests-opencode/test_v5_[NOM].js qui verifie [FONCTIONNALITE].

STRUCTURE DU TEST :
- Utilise Playwright (firefox headless)
- Charge cristal-dragon-v5-opencode.html
- Structure : PASS/FAIL avec compteur

TESTS A VERIFIER :
1. [VARIABLE/FONCTION] est accessible
2. [COMPORTEMENT 1]
3. [COMPORTEMENT 2]
4. [COMPORTEMENT 3]

REGLES :
- Code complet, executable
- Gere les cas limites
- Pas de dependance externe
- Montre-moi le code AVANT decrire

---

## 7. WORKFLOW COMPLET

| Etape | Action | Outil |
| :--- | :--- | :--- |
| 1 | Analyse | Prompt 1 dans OpenCode |
| 2 | Options (si besoin) | Prompt 2 |
| 3 | Diff | Prompt 3, valider avec OK ecris |
| 4 | Verif tests (si risque) | Prompt 4 |
| 5 | Ecriture | OK ecris |
| 6 | QA | bash qa-opencode.sh |
| 7 | Test visuel | xdg-open cristal-dragon-v5-opencode.html |
| 8 | Commit | ./commit.sh message |

---

## 8. REGLES DOR

1. Toujours demander un diff avant ecriture.
2. Toujours lancer la QA apres une modification.
3. Toujours tester visuellement avant de commiter.
4. Jamais accepter un OK dOpenCode sans verifier soi-meme.
5. Timebox : si OpenCode tourne plus de 5 minutes, esc et verifier.
6. Backup avant modification risquee.

#!/usr/bin/env bash
# Workflow QA local pour les projets de jeux.
# A placer a la racine du projet, par exemple ~/mes-jeux/workflow-qa.sh.
# Aucun commit, aucun push, aucune correction automatique.

set -u

ROOT="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)" || exit 1
cd "$ROOT" || exit 1

echo "========================================"
echo " WORKFLOW QA"
echo " Projet : $ROOT"
echo "========================================"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "BLOQUE : ce repertoire n'est pas un depot Git."
  exit 2
fi

echo
echo "=== 1. Branche ==="
git branch --show-current

echo
echo "=== 2. Etat initial du depot ==="
git status --short

echo
echo "=== 3. Controle initial du diff ==="
if ! git diff --check; then
  echo "FAIL : erreurs detectees dans le diff initial."
  exit 1
fi
echo "PASS : aucun probleme detecte par git diff --check."

echo
echo "=== 4. Verification du script QA ==="
if [[ ! -f "$ROOT/qa-rapide.sh" ]]; then
  echo "BLOQUE : qa-rapide.sh est absent."
  echo "Aucun test QA n'a ete execute."
  exit 2
fi

if [[ ! -r "$ROOT/qa-rapide.sh" ]]; then
  echo "BLOQUE : qa-rapide.sh est illisible."
  exit 2
fi

echo "Le script QA existe."
echo "Verifie son contenu avant sa premiere utilisation."

echo
echo "=== 5. Execution du QA ==="
bash "$ROOT/qa-rapide.sh"
QA_STATUS=$?

if [[ "$QA_STATUS" -ne 0 ]]; then
  echo
  echo "FAIL : qa-rapide.sh a retourne le code $QA_STATUS."
  echo "Ne pas valider le changement avant analyse."
  echo
  echo "Etat Git apres les tests :"
  git status --short
  exit 1
fi

echo
echo "=== 6. Controle final du diff ==="
if ! git diff --check; then
  echo "FAIL : le diff presente des problemes apres les tests."
  exit 1
fi
echo "PASS : git diff --check."

echo
echo "=== 7. Etat final du depot ==="
git status --short

echo
echo "=== 8. Resume ==="
echo "PASS : le script QA a termine avec le code 0."
echo "PASS : git diff --check n'a signale aucun probleme."
echo
echo "IMPORTANT : cela ne prouve pas que toutes les mecaniques"
echo "fonctionnent ni que toutes les plateformes ont ete testees."
echo "Examine le rapport QA, le diff et les comportements concernes."
echo "Aucun commit ni push n'a ete effectue."

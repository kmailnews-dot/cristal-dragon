#!/bin/bash
# Usage : ./commit.sh "message du commit"
# Ajoute automatiquement les fichiers importants et commit

if [ -z "$1" ]; then
  echo "ERREUR : il faut un message"
  echo "Usage : ./commit.sh \"mon message\""
  exit 1
fi

cd ~/mes-jeux

# Fichiers à ajouter automatiquement (uniquement s'ils existent)
FILES=(
  "cristal-dragon-v5-opencode.html"
  "qa-opencode.sh"
  "AGENTS.md"
  ".gitignore"
  "TEST_REPORT.md"
  "TEST_REPORT_CONTROLS.md"
  "TEST_REPORT_DEEP.md"
)

for f in "${FILES[@]}"; do
  if [ -f "$f" ]; then
    git add "$f"
  fi
done

# Ajouter tous les tests (sauf backups, gérés par .gitignore)
git add tests-opencode/*.js 2>/dev/null
git add tests/*.js 2>/dev/null

# Voir ce qui est stagé
echo "=== Fichiers prêts à commiter ==="
git status --short

echo ""
echo "=== Commit ==="
git commit -m "$1"

echo ""
echo "=== Résultat ==="
git log --oneline -1

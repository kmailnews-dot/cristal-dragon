#!/bin/bash
# workflow.sh — verifications post-patch de Cristal Dragon.
# Usage : ./workflow.sh
cd "$(dirname "$0")"

RED='\033[0;31m'; GRN='\033[0;32m'; NC='\033[0m'
FAILED=0

step(){
  local name="$1"; shift
  echo ""
  echo "==============================================="
  echo ">> $name"
  echo "==============================================="
  "$@"
  local rc=$?
  if [ $rc -ne 0 ]; then
    echo -e "${RED}[KO]${NC} $name"
    FAILED=$((FAILED+1))
  else
    echo -e "${GRN}[OK]${NC} $name"
  fi
}

check_syntax(){
  node -e "
    const fs=require('fs');
    const src=fs.readFileSync('cristal-dragon.html','utf8');
    const m=src.match(/<script>([\s\S]*)<\/script>/);
    try{ new Function(m[1]); console.log('SYNTAXE JS : OK'); }
    catch(e){ console.log('ERREUR :', e.message); process.exit(1); }
  "
}

run_access(){ node tests/test_v5_accessibility.js 2>&1 | tail -12; }
run_volumes(){ node tests/test_v5_audio_volumes.js 2>&1 | tail -12; }
run_nudge(){ node tests/test_v5_nudge.js 2>&1 | tail -12; }
run_multiball(){ node tests/test_v5_multiball.js 2>&1 | tail -12; }
run_qa(){ bash qa-rapide.sh 2>&1 | tail -8; }

step "Syntaxe JavaScript" check_syntax
step "Accessibilite (11 checks)" run_access
step "Volumes (11 checks)" run_volumes
step "Nudge / Tilt (9 checks)" run_nudge
step "Multiball (6 checks)" run_multiball
step "QA rapide (19 fichiers Playwright)" run_qa

echo ""
echo "==============================================="
if [ $FAILED -eq 0 ]; then
  echo -e "${GRN}TOUT PASSE${NC}"
else
  echo -e "${RED}$FAILED ETAPE(S) EN ECHEC${NC}"
fi
echo "==============================================="
exit $FAILED

#!/bin/bash
# smoke.sh — verification rapide (~30s). A lancer apres chaque patch.
# Niveau 1 : syntaxe + tests fonctionnels essentiels.
cd "$(dirname "$0")"

RED='\033[0;31m'; GRN='\033[0;32m'; NC='\033[0m'
FAILED=0

run_step(){
  local name="$1"; shift
  printf ">> %s ... " "$name"
  if "$@" > /tmp/smoke-step.log 2>&1; then
    echo -e "${GRN}OK${NC}"
  else
    echo -e "${RED}KO${NC}"
    echo "   Détail dans /tmp/smoke-step.log"
    tail -5 /tmp/smoke-step.log | sed 's/^/   /'
    FAILED=$((FAILED+1))
  fi
}

check_syntax(){
  node -e "
    const fs=require('fs');
    const src=fs.readFileSync('cristal-dragon.html','utf8');
    const m=src.match(/<script>([\s\S]*)<\/script>/);
    try{ new Function(m[1]); console.log('SYNTAXE JS : OK'); }
    catch(e){ console.error('ERREUR : ' + e.message); process.exit(1); }
  " > /dev/null
}

run_access(){ node tests/test_v5_accessibility.js > /dev/null; }
run_volumes(){ node tests/test_v5_audio_volumes.js > /dev/null; }
run_nudge(){ node tests/test_v5_nudge.js > /dev/null; }
run_deep(){ node tests/test_v5_deep.js > /dev/null; }
run_controls(){ node tests/test_v5_controls.js > /dev/null; }

echo "==============================================="
echo " SMOKE TEST — Cristal Dragon"
echo "==============================================="
run_step "Syntaxe JavaScript" check_syntax
run_step "Accessibilité (11 checks)" run_access
run_step "Volumes (11 checks)" run_volumes
run_step "Nudge / Tilt (9 checks)" run_nudge
run_step "Deep (28 checks)" run_deep
run_step "Controls (24 checks)" run_controls
echo "==============================================="
if [ $FAILED -eq 0 ]; then
  echo -e "${GRN}SMOKE : TOUT PASSE${NC}"
  exit 0
else
  echo -e "${RED}SMOKE : $FAILED ÉCHEC(S)${NC}"
  exit 1
fi

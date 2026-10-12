#!/bin/bash
# apply-patch.sh <numero> — applique patches/NNN-*.sh, sauvegarde, verifie, rollback si KO
set -e
cd "$(dirname "$0")"

NUM="$1"
if [ -z "$NUM" ]; then
  echo "Usage : ./apply-patch.sh 001"
  echo "Patches disponibles :"
  if [ -d patches ]; then
    local_count=$(ls patches/ 2>/dev/null | grep -cE '^[0-9]{3}-' || true)
    if [ "$local_count" -eq 0 ]; then
      echo "  (aucun)"
    else
      ls patches/ 2>/dev/null | grep -E '^[0-9]{3}-' | sed 's/^/  /'
    fi
  fi
  exit 1
fi

PATCH=$(ls patches/${NUM}-*.sh 2>/dev/null | head -1)
if [ -z "$PATCH" ]; then
  echo "Aucun patch trouve pour le numero $NUM."
  exit 1
fi

echo "==============================================="
echo " Application : $PATCH"
echo "==============================================="
TS=$(date +%Y%m%d-%H%M%S)
mkdir -p backups
BK="backups/cristal-dragon.html.bak-$TS"
cp cristal-dragon.html "$BK"
echo "Backup : $BK"
echo ""

if ! bash "$PATCH"; then
  echo ""
  echo "ECHEC du patch, restauration..."
  cp "$BK" cristal-dragon.html
  echo "Fichier restaure depuis $BK"
  exit 1
fi

echo ""
echo "Verification post-patch (smoke.sh)..."
if ! ./smoke.sh; then
  echo ""
  echo "ECHEC verification, restauration..."
  cp "$BK" cristal-dragon.html
  echo "Fichier restaure depuis $BK"
  exit 1
fi

echo ""
echo "==============================================="
echo " Patch $NUM applique et verifie."
echo " Backup : $BK"
echo "==============================================="

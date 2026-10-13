#!/bin/bash
# 001-multiball — un drain consomme un extraBall au lieu d'une vie.
set -e
cd "$(dirname "$0")/.."

python3 - <<'PYEOF'
import io
path = "cristal-dragon.html"
with io.open(path, encoding="utf-8") as f:
    src = f.read()

old = """  if(trainingMode){ ball=null; setHint(-1); respawnT=0.9; return; }
  balls--; ballsDirty=true;"""

new = """  if(trainingMode){ ball=null; setHint(-1); respawnT=0.9; return; }
  // Multiball : si des billes extra sont en jeu, en consommer une
  // au lieu de perdre une vie. La bille principale respawn normalement.
  if(extraBalls.length>0){
    extraBalls.pop();
    ball=null;
    setHint(-1);
    respawnT=0.9;
    return;
  }
  balls--; ballsDirty=true;"""

if old not in src:
    print("ERREUR : ancre onDrain introuvable.")
    raise SystemExit(1)

if "extraBalls.pop();" in src and "// Multiball : si des billes extra" in src:
    print("Patch deja applique.")
    raise SystemExit(0)

src = src.replace(old, new, 1)

with io.open(path, "w", encoding="utf-8") as f:
    f.write(src)

print("Multiball integre dans onDrain.")
PYEOF

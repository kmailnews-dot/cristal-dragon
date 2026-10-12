#!/bin/bash
set -e
cd "$(dirname "$0")"
FILE="cristal-dragon.html"
[ -f "$FILE" ] || { echo "ERREUR : $FILE introuvable."; exit 1; }
TS=$(date +%Y%m%d-%H%M%S)
mkdir -p backups
BK="backups/cristal-dragon.html.bak-$TS"
cp "$FILE" "$BK"
echo "Sauvegarde : $BK"
grep -q "NUDGE" "$FILE" && { echo "Patch deja applique."; exit 0; }
python3 - <<'PYEOF'
import io
path = "cristal-dragon.html"
with io.open(path, encoding="utf-8") as f:
    src = f.read()

# --- 1. Constantes NUDGE ---
old_c = "  STUCK:{SPD:25, T:3, NX:150, NY:230},"
new_c = """  STUCK:{SPD:25, T:3, NX:150, NY:230},
  NUDGE:{IX:180, IY:120, WINDOW:1.5, MAX:3},"""
assert old_c in src, "const C.STUCK introuvable"
src = src.replace(old_c, new_c, 1)

# --- 2. Etat global nudge a cote de ball ---
old_state = "let ball=null, respawnT=0, everLaunched=false, hintT=0, hintMode=-2;"
new_state = """let ball=null, respawnT=0, everLaunched=false, hintT=0, hintMode=-2;
let nudgeCount=0, nudgeT=0, tilted=false;"""
assert old_state in src, "ligne ball=null introuvable"
src = src.replace(old_state, new_state, 1)

with io.open(path, "w", encoding="utf-8") as f:
    f.write(src)
print("Bloc 1 : constantes NUDGE + etat ajoutes.")
PYEOF

python3 - <<'PYEOF'
import io
path = "cristal-dragon.html"
with io.open(path, encoding="utf-8") as f:
    src = f.read()

# --- 3. Fonctions nudge avant debugState ---
old_dbg = "window.debugState=()=>JSON.stringify({"
new_dbg = """function doNudge(dir){
  if(state!=='play') return;
  if(tilted) return;
  if(!ball || ball.state!=='live') return;
  const now=performance.now()/1000;
  if(nudgeT<=0 || now-nudgeT>C.NUDGE.WINDOW){ nudgeCount=0; nudgeT=now; }
  nudgeCount++;
  if(nudgeCount>C.NUDGE.MAX){ tilted=true; setHint(7); return; }
  if(dir==='up'){
    ball.vx+=(Math.random()*2-1)*40;
    ball.vy-=C.NUDGE.IY;
  } else {
    ball.vx+=(Math.random()*2-1)*40;
    ball.vy+=C.NUDGE.IY;
  }
  if(ball.vy<-C.MAXV) ball.vy=-C.MAXV;
  if(ball.vy> C.MAXV) ball.vy= C.MAXV;
  shake(6,0.12);
  sndNudge();
}
function resetNudge(){
  nudgeCount=0; nudgeT=0; tilted=false;
}

"""
assert old_dbg in src, "debugState introuvable"
src = src.replace(old_dbg, new_dbg + old_dbg, 1)

# --- 4. Exposer nudge et tilted dans debugState ---
old_dbg_body = """  lanceur:{charge:plunger.charging,power:+plunger.power.toFixed(2)},
  runes:runes.map(r=>r.up)
});"""
new_dbg_body = """  lanceur:{charge:plunger.charging,power:+plunger.power.toFixed(2)},
  runes:runes.map(r=>r.up),
  nudgeCount, tilted
});"""
assert old_dbg_body in src, "corps debugState introuvable"
src = src.replace(old_dbg_body, new_dbg_body, 1)

# --- 5. Reset nudge dans spawnBall ---
old_spawn = """  ring(C.LANE.X,C.LANE.Y);
  burst(C.LANE.X,C.LANE.Y,'c',6,130);
  if(!everLaunched) setHint(0);
}"""
new_spawn = """  ring(C.LANE.X,C.LANE.Y);
  burst(C.LANE.X,C.LANE.Y,'c',6,130);
  if(!everLaunched) setHint(0);
  resetNudge();
}"""
assert old_spawn in src, "spawnBall introuvable"
src = src.replace(old_spawn, new_spawn, 1)

# --- 6. Reset nudge dans resetGame (a cote de redFlash=0) ---
old_reset = "  redFlash=0; shakeT=0; fwT=0; endTime=0; goldFlash=0;"
new_reset = """  redFlash=0; shakeT=0; fwT=0; endTime=0; goldFlash=0;
  resetNudge();"""
assert old_reset in src, "resetGame introuvable"
src = src.replace(old_reset, new_reset, 1)

with io.open(path, "w", encoding="utf-8") as f:
    f.write(src)
print("Bloc 2 : fonctions nudge + integrations ajoutees.")
PYEOF

python3 - <<'PYEOF'
import io
path = "cristal-dragon.html"
with io.open(path, encoding="utf-8") as f:
    src = f.read()

# --- 7. setFlipper bloque si tilted ---
old_setflip = "function setFlipper(v,on){"
idx = src.find(old_setflip)
assert idx > 0, "setFlipper introuvable"
# On trouve la premiere ligne de corps apres l'accolade ouvrante
body_start = src.find("{", idx) + 1
# Inserer un garde en debut de corps
guard = "\n  if(on && tilted) return;"
src = src[:body_start] + guard + src[body_start:]

# --- 8. Etendre la keymap par defaut avec nudgeUp / nudgeDown ---
old_defmap = "const DEFAULT_KEYMAP={ left:['ArrowLeft','KeyA','KeyQ'], right:['ArrowRight','KeyL','KeyM'], launch:['Space'] };"
new_defmap = "const DEFAULT_KEYMAP={ left:['ArrowLeft','KeyA','KeyQ'], right:['ArrowRight','KeyL','KeyM'], launch:['Space'], nudgeUp:['ArrowUp'], nudgeDown:['ArrowDown'] };"
assert old_defmap in src, "DEFAULT_KEYMAP introuvable"
src = src.replace(old_defmap, new_defmap, 1)

# --- 9. Etendre ACTION_LABELS ---
old_lbl = "const ACTION_LABELS={ left:'Flipper gauche', right:'Flipper droit', launch:'Lancement' };"
new_lbl = "const ACTION_LABELS={ left:'Flipper gauche', right:'Flipper droit', launch:'Lancement', nudgeUp:'Nudge haut', nudgeDown:'Nudge bas' };"
assert old_lbl in src, "ACTION_LABELS introuvable"
src = src.replace(old_lbl, new_lbl, 1)

# --- 10. Etendre loadKeyMap pour inclure nudgeUp / nudgeDown ---
old_load = "      for(const k of ['left','right','launch']){"
new_load = "      for(const k of ['left','right','launch','nudgeUp','nudgeDown']){"
count = src.count(old_load)
assert count >= 1, "loadKeyMap loop introuvable"
src = src.replace(old_load, new_load, 1)

# --- 11. Etendre resetKeyMap ---
old_resetmap = "  keymap={ left:DEFAULT_KEYMAP.left.slice(), right:DEFAULT_KEYMAP.right.slice(), launch:DEFAULT_KEYMAP.launch.slice() };"
new_resetmap = "  keymap={ left:DEFAULT_KEYMAP.left.slice(), right:DEFAULT_KEYMAP.right.slice(), launch:DEFAULT_KEYMAP.launch.slice(), nudgeUp:DEFAULT_KEYMAP.nudgeUp.slice(), nudgeDown:DEFAULT_KEYMAP.nudgeDown.slice() };"
assert old_resetmap in src, "resetKeyMap introuvable"
src = src.replace(old_resetmap, new_resetmap, 1)

# --- 12. Etendre loadKeyMap fallback retour ---
old_fallback = "  return { left:DEFAULT_KEYMAP.left.slice(), right:DEFAULT_KEYMAP.right.slice(), launch:DEFAULT_KEYMAP.launch.slice() };"
new_fallback = "  return { left:DEFAULT_KEYMAP.left.slice(), right:DEFAULT_KEYMAP.right.slice(), launch:DEFAULT_KEYMAP.launch.slice(), nudgeUp:DEFAULT_KEYMAP.nudgeUp.slice(), nudgeDown:DEFAULT_KEYMAP.nudgeDown.slice() };"
assert old_fallback in src, "loadKeyMap fallback introuvable"
src = src.replace(old_fallback, new_fallback, 1)

# --- 13. Etendre les boucles de conflit et rendu ---
old_other = "  for(const other of ['left','right','launch']){"
new_other = "  for(const other of ['left','right','launch','nudgeUp','nudgeDown']){"
assert old_other in src, "boucle conflit introuvable"
src = src.replace(old_other, new_other, 1)

old_render_lbl = "  for(const a of ['left','right','launch']){\n    const el=document.getElementById('keyLbl-'+a);"
new_render_lbl = "  for(const a of ['left','right','launch','nudgeUp','nudgeDown']){\n    const el=document.getElementById('keyLbl-'+a);"
assert old_render_lbl in src, "renderKeyLabels loop introuvable"
src = src.replace(old_render_lbl, new_render_lbl, 1)

# --- 14. Handlers keydown : ajouter nudgeUp / nudgeDown ---
old_kd = "  else if(c==='KeyP'||c==='Escape'){ if(state==='play') setState('pause'); else if(state==='pause') setState('play'); }"
new_kd = """  else if(matchKey(c,'nudgeUp')){ Snd.ensure(); doNudge('up'); e.preventDefault(); }
  else if(matchKey(c,'nudgeDown')){ Snd.ensure(); doNudge('down'); e.preventDefault(); }
  else if(c==='KeyP'||c==='Escape'){ if(state==='play') setState('pause'); else if(state==='pause') setState('play'); }"""
assert old_kd in src, "handler keydown KeyP introuvable"
src = src.replace(old_kd, new_kd, 1)

with io.open(path, "w", encoding="utf-8") as f:
    f.write(src)
print("Bloc 3 : guard TILT + remapping nudge + handler clavier ajoutes.")
PYEOF

python3 - <<'PYEOF'
import io
path = "cristal-dragon.html"
with io.open(path, encoding="utf-8") as f:
    src = f.read()

# --- 15. Ajouter les deux lignes Nudge dans la section Parametres (avant Volume) ---
old_rows = """      <div class="sub" style="margin-top:calc(var(--u)*14px)">Volume</div>"""
new_rows = """      <div class="row">
        <span class="lbl">Nudge haut</span>
        <span class="val" id="keyLbl-nudgeUp"></span>
        <button class="btn small" data-action="capture" data-target="nudgeUp">Modifier</button>
      </div>
      <div class="row">
        <span class="lbl">Nudge bas</span>
        <span class="val" id="keyLbl-nudgeDown"></span>
        <button class="btn small" data-action="capture" data-target="nudgeDown">Modifier</button>
      </div>
      <div class="sub" style="margin-top:calc(var(--u)*14px)">Volume</div>"""
assert old_rows in src, "ancre Volume introuvable"
src = src.replace(old_rows, new_rows, 1)

with io.open(path, "w", encoding="utf-8") as f:
    f.write(src)
print("Bloc 4 : UI nudge ajoutee.")
PYEOF

echo ""
echo "===== Verifications ====="
grep -c "NUDGE" "$FILE" | sed 's/^/Occurrences NUDGE : /'
grep -c "doNudge" "$FILE" | sed 's/^/Occurrences doNudge : /'
grep -c "nudgeUp" "$FILE" | sed 's/^/Occurrences nudgeUp : /'
grep -c "tilted" "$FILE" | sed 's/^/Occurrences tilted : /'

echo ""
echo "===== Syntaxe JS ====="
node -e "
  const fs=require('fs');
  const src=fs.readFileSync('$FILE','utf8');
  const m=src.match(/<script>([\s\S]*)<\/script>/);
  try{ new Function(m[1]); console.log('SYNTAXE JS : OK'); }
  catch(e){ console.log('ERREUR :', e.message); process.exit(1); }
"

echo ""
echo "===== Resume ====="
echo "Patch nudge applique."
echo "Annulation : cp $BK $FILE"
ENDB6
chmod +x patch-nudge.sh
echo "Script complet."

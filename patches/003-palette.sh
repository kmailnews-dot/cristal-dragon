#!/bin/bash
# 003-palette — palettes daltonien pour les couleurs gameplay
set -e
cd "$(dirname "$0")/.."

python3 - <<'PYEOF'
import io
path = "cristal-dragon.html"
with io.open(path, encoding="utf-8") as f:
    src = f.read()

old_col = """const COL={c:'#4fd8ff',m:'#ff5fd0',v:'#a06bff',g:'#ffd166',w:'#ffffff',e:'#ff7a3c'};
const LIGHT={c:'#c9f6ff',m:'#ffcdf1',v:'#ddc8ff',g:'#ffedbb',w:'#ffffff',e:'#ff7a3c'};"""

new_col = """/* ---------- Palettes (accessibilite daltonisme) ---------- */
const PALETTES={
  default:{
    COL:{c:'#4fd8ff',m:'#ff5fd0',v:'#a06bff',g:'#ffd166',w:'#ffffff',e:'#ff7a3c'},
    LIGHT:{c:'#c9f6ff',m:'#ffcdf1',v:'#ddc8ff',g:'#ffedbb',w:'#ffffff',e:'#ff7a3c'}
  },
  deuteranopie:{
    COL:{c:'#3aa0ff',m:'#ff9a3c',v:'#a06bff',g:'#ffd166',w:'#ffffff',e:'#ff6a00'},
    LIGHT:{c:'#b8dcff',m:'#ffd9a8',v:'#ddc8ff',g:'#ffedbb',w:'#ffffff',e:'#ffb066'}
  },
  protanopie:{
    COL:{c:'#2f8fff',m:'#ffd166',v:'#8a6bff',g:'#ffea8a',w:'#ffffff',e:'#ffb347'},
    LIGHT:{c:'#b0d4ff',m:'#fff0b8',v:'#d4c4ff',g:'#fff5c8',w:'#ffffff',e:'#ffd9a8'}
  }
};
let currentPalette=(()=>{ try{ return localStorage.getItem('cristalDragonPalette')||'default'; }catch(e){ return 'default'; } })();
if(!PALETTES[currentPalette]) currentPalette='default';

const COL={c:'#4fd8ff',m:'#ff5fd0',v:'#a06bff',g:'#ffd166',w:'#ffffff',e:'#ff7a3c'};
const LIGHT={c:'#c9f6ff',m:'#ffcdf1',v:'#ddc8ff',g:'#ffedbb',w:'#ffffff',e:'#ff7a3c'};"""

assert old_col in src, "const COL/LIGHT introuvable"
src = src.replace(old_col, new_col, 1)

with io.open(path, "w", encoding="utf-8") as f:
    f.write(src)
print("Etape 1 : PALETTES + COL/LIGHT declares.")
PYEOF

python3 - <<'PYEOF'
import io
path = "cristal-dragon.html"
with io.open(path, encoding="utf-8") as f:
    src = f.read()

old_hook = "function bindVolSliders(){"
new_hook = """function setPalette(name){
  if(!PALETTES[name]) return false;
  currentPalette=name;
  try{ localStorage.setItem('cristalDragonPalette', name); }catch(e){}
  Object.assign(COL, PALETTES[name].COL);
  Object.assign(LIGHT, PALETTES[name].LIGHT);
  try{
    if(typeof makeBumper==='function' && typeof SPR!=='undefined' && SPR && SPR.bumper && typeof bumpers!=='undefined'){
      for(const b of bumpers){ SPR.bumper[b.hue]=makeBumper(b.hue,false); }
    }
    if(typeof makeDot==='function' && typeof SPR!=='undefined' && SPR && SPR.dot){
      for(const k of ['c','m','v','g','w','e']) SPR.dot[k]=makeDot(COL[k]);
    }
  }catch(e){}
  return true;
}
function bindPaletteSelect(){
  const sel=document.getElementById('paletteSelect');
  if(sel && !sel.dataset.bound){
    sel.dataset.bound='1';
    sel.value=currentPalette;
    sel.addEventListener('change', function(){ setPalette(sel.value); });
  }
}
function bindVolSliders(){"""

if old_hook not in src:
    print("ERREUR : bindVolSliders introuvable.")
    raise SystemExit(1)
src = src.replace(old_hook, new_hook, 1)

old_final = "document.addEventListener('DOMContentLoaded', bindVolSliders);\nbindVolSliders();"
new_final = "document.addEventListener('DOMContentLoaded', function(){ bindVolSliders(); bindPaletteSelect(); });\nbindVolSliders();"
if old_final in src:
    src = src.replace(old_final, new_final, 1)

# Les exports window.* sont ajoutes a la fin du script, apres setPalette.
last_brace = src.rfind("bindVolSliders();")
if last_brace > 0 and "window.setPalette" not in src:
    insert_at = src.find("\n", last_brace) + 1
    exports = "\nwindow.setPalette = setPalette;\nwindow.getPalette = ()=>currentPalette;\nwindow.PALETTES = PALETTES;\n"
    src = src[:insert_at] + exports + src[insert_at:]

with io.open(path, "w", encoding="utf-8") as f:
    f.write(src)
print("Etape 2 : setPalette + binding + exports ajoutes.")
PYEOF

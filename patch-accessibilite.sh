#!/bin/bash
set -e

cd "$(dirname "$0")"
FILE="cristal-dragon.html"

if [ ! -f "$FILE" ]; then
  echo "ERREUR : $FILE introuvable. Lance ce script depuis ~/mes-jeux."
  exit 1
fi

# ---------- Sauvegarde ----------
TS=$(date +%Y%m%d-%H%M%S)
mkdir -p backups
BK="backups/cristal-dragon.html.bak-$TS"
cp "$FILE" "$BK"
echo "Sauvegarde : $BK"

# ---------- Vérifications préalables ----------
if grep -q "cristalDragonKeyMap" "$FILE"; then
  echo "ERREUR : le patch semble déjà appliqué (cristalDragonKeyMap présent)."
  echo "Restaure $BK ou supprime la ligne manuellement avant de relancer."
  exit 1
fi

if ! grep -q "window.addEventListener('keydown'" "$FILE"; then
  echo "ERREUR : handler keydown introuvable — le fichier n'est pas celui attendu."
  exit 1
fi

# ---------- 1. CSS ----------
# Insère les règles après la ligne qui définit section[data-p="about"] .rule
python3 - <<'PYEOF'
import io, sys

path = "cristal-dragon.html"
with io.open(path, encoding="utf-8") as f:
    lines = f.readlines()

# Marqueur d'ancrage CSS
anchor = 'section[data-p="tutorial"] .rule, section[data-p="about"] .rule'
css_block = '''section[data-p="settings"]{ max-height:92%; overflow-y:auto; }
section[data-p="settings"] .row{ display:flex; align-items:center; justify-content:space-between; gap:calc(var(--u)*8px); padding:calc(var(--u)*8px) 0; border-bottom:1px solid rgba(255,255,255,.08); }
section[data-p="settings"] .row:last-child{ border-bottom:none; }
section[data-p="settings"] .lbl{ font-size:calc(var(--u)*13px); color:#e8ecff; }
section[data-p="settings"] .val{ font-size:calc(var(--u)*11px); color:#9aa3d8; letter-spacing:.08em; }
section[data-p="settings"] .btn.small{ padding:calc(var(--u)*6px) calc(var(--u)*10px); font-size:calc(var(--u)*11px); }
section[data-p="settings"] .btn.capturing{ background:rgba(255,209,102,.25); color:#ffd97a; }
'''
inserted_css = False
for i, line in enumerate(lines):
    if anchor in line and not inserted_css:
        lines.insert(i+1, css_block)
        inserted_css = True
        break
if not inserted_css:
    print("AVERTISSEMENT : ancre CSS non trouvée, CSS non inséré.")
else:
    print("CSS inséré.")

# ---------- 2. Bouton menu ----------
# Dans la btnrow du menu, insérer avant data-action="about"
inserted_btn = False
for i, line in enumerate(lines):
    if 'data-action="about"' in line and 'btnrow' not in line and '<button' in line:
        # insérer le bouton settings juste avant ce bouton
        indent = line[:len(line) - len(line.lstrip())]
        new_btn = indent + '<button class="btn ghost" data-action="settings">Paramètres</button>\n'
        lines.insert(i, new_btn)
        inserted_btn = True
        break
if not inserted_btn:
    print("AVERTISSEMENT : bouton menu non inséré (ancre data-action=\"about\" introuvable).")
else:
    print("Bouton menu inséré.")

# ---------- 3. Section HTML settings ----------
# Insérer après la fermeture </section> de data-p="about"
section_html = '''
    <section class="panel" data-p="settings">
      <div class="gem"></div>
      <h1>Paramètres</h1>
      <div class="sub">Commandes</div>
      <div class="row">
        <span class="lbl">Flipper gauche</span>
        <span class="val" id="keyLbl-left"></span>
        <button class="btn small" data-action="capture" data-target="left">Modifier</button>
      </div>
      <div class="row">
        <span class="lbl">Flipper droit</span>
        <span class="val" id="keyLbl-right"></span>
        <button class="btn small" data-action="capture" data-target="right">Modifier</button>
      </div>
      <div class="row">
        <span class="lbl">Lancement</span>
        <span class="val" id="keyLbl-launch"></span>
        <button class="btn small" data-action="capture" data-target="launch">Modifier</button>
      </div>
      <div class="btnrow">
        <button class="btn ghost" data-action="reset-keys">Réinitialiser</button>
        <button class="btn" data-action="menu">Retour</button>
      </div>
    </section>
'''
inserted_section = False
in_about = False
for i, line in enumerate(lines):
    if 'data-p="about"' in line and '<section' in line:
        in_about = True
        continue
    if in_about and '</section>' in line:
        lines.insert(i+1, section_html)
        inserted_section = True
        break
if not inserted_section:
    print("AVERTISSEMENT : section settings non insérée (fermeture </section> de about introuvable).")
else:
    print("Section HTML insérée.")

with io.open(path, "w", encoding="utf-8") as f:
    f.writelines(lines)
PYEOF

# ---------- 4. Bloc JS remapping ----------
# Insérer avant window.addEventListener('keydown'
python3 - <<'PYEOF'
import io

path = "cristal-dragon.html"
with io.open(path, encoding="utf-8") as f:
    src = f.read()

if "cristalDragonKeyMap" in src:
    print("JS déjà présent, étape ignorée.")
    raise SystemExit

js_block = r'''/* ---------- Remapping clavier (localStorage cristalDragonKeyMap) ---------- */
const DEFAULT_KEYMAP={ left:['ArrowLeft','KeyA','KeyQ'], right:['ArrowRight','KeyL','KeyM'], launch:['Space'] };
const ACTION_LABELS={ left:'Flipper gauche', right:'Flipper droit', launch:'Lancement' };
function loadKeyMap(){
  try{
    const v=JSON.parse(localStorage.getItem('cristalDragonKeyMap'));
    if(v&&typeof v==='object'){
      const out={};
      for(const k of ['left','right','launch']){
        out[k]=Array.isArray(v[k])&&v[k].length?v[k].slice():DEFAULT_KEYMAP[k].slice();
      }
      return out;
    }
  }catch(e){}
  return { left:DEFAULT_KEYMAP.left.slice(), right:DEFAULT_KEYMAP.right.slice(), launch:DEFAULT_KEYMAP.launch.slice() };
}
function saveKeyMap(m){ try{ localStorage.setItem('cristalDragonKeyMap', JSON.stringify(m)); }catch(e){} }
let keymap=loadKeyMap();
let keyCapture=null;
function matchKey(code,action){ return keymap[action].includes(code); }
function keyLabel(code){
  return code.replace(/^Key/,'').replace(/^Arrow/,'').replace(/^Digit/,'').replace(/^Numpad/,'Num')
             .replace('Space','Espace').replace('Escape','Échap').replace('Enter','Entrée');
}
function renderKeyLabels(){
  for(const a of ['left','right','launch']){
    const el=document.getElementById('keyLbl-'+a);
    if(el) el.textContent=keymap[a].map(keyLabel).join(' / ');
  }
}
function beginCapture(action){
  keyCapture=action;
  document.querySelectorAll('[data-action="capture"]').forEach(function(b){
    b.classList.toggle('capturing', b.dataset.target===action);
    b.textContent = b.dataset.target===action ? 'Appuyer…' : 'Modifier';
  });
}
function cancelCapture(){
  keyCapture=null;
  document.querySelectorAll('[data-action="capture"]').forEach(function(b){
    b.classList.remove('capturing');
    b.textContent='Modifier';
  });
}
function applyCapturedKey(code){
  if(!keyCapture) return;
  const action=keyCapture;
  for(const other of ['left','right','launch']){
    if(other===action) continue;
    if(keymap[other].includes(code)){ cancelCapture(); return; }
  }
  if(!keymap[action].includes(code)) keymap[action]=[code];
  saveKeyMap(keymap);
  cancelCapture();
  renderKeyLabels();
}
function resetKeyMap(){
  keymap={ left:DEFAULT_KEYMAP.left.slice(), right:DEFAULT_KEYMAP.right.slice(), launch:DEFAULT_KEYMAP.launch.slice() };
  saveKeyMap(keymap);
  renderKeyLabels();
}
'''

needle = "window.addEventListener('keydown'"
idx = src.find(needle)
if idx < 0:
    print("ERREUR : ancre keydown introuvable.")
    raise SystemExit(1)

src = src[:idx] + js_block + src[idx:]

with io.open(path, "w", encoding="utf-8") as f:
    f.write(src)

print("Bloc JS inséré.")
PYEOF

# ---------- 5. Remplacement des handlers keydown / keyup ----------
python3 - <<'PYEOF'
import io, re

path = "cristal-dragon.html"
with io.open(path, encoding="utf-8") as f:
    src = f.read()

# Handler keydown
old_kd_pattern = re.compile(
    r"window\.addEventListener\('keydown',e=>\{.*?\n\}\);\n",
    re.DOTALL
)
new_kd = """window.addEventListener('keydown',e=>{
  if(e.repeat) return;
  const c=e.code;
  if(keyCapture){ e.preventDefault(); applyCapturedKey(c); return; }
  if(matchKey(c,'left')){ Snd.ensure(); keys.L=true; if(state==='play') setFlipper('L',true); e.preventDefault(); }
  else if(matchKey(c,'right')){ Snd.ensure(); keys.R=true; if(state==='play') setFlipper('R',true); e.preventDefault(); }
  else if(matchKey(c,'launch')){ Snd.ensure(); if(state==='play'&&ball&&ball.state==='lane') plunger.charging=true; e.preventDefault(); }
  else if(c==='KeyP'||c==='Escape'){ if(state==='play') setState('pause'); else if(state==='pause') setState('play'); }
  else if(c==='KeyR'){ if(state!=='menu'){ Snd.ensure(); sndUi(); startGame(); } e.preventDefault(); }
  else if(c==='KeyN'){ Snd.ensure(); toggleMute(); }
  else if(c==='Enter'){ if(state==='menu'||state==='victory'||state==='defeat'){ Snd.ensure(); sndUi(); startGame(); } }
});
"""
if not old_kd_pattern.search(src):
    print("ERREUR : pattern keydown introuvable.")
    raise SystemExit(1)
src = old_kd_pattern.sub(new_kd, src, count=1)

# Handler keyup
old_ku_pattern = re.compile(
    r"window\.addEventListener\('keyup',e=>\{.*?\n\}\);\n",
    re.DOTALL
)
new_ku = """window.addEventListener('keyup',e=>{
  const c=e.code;
  if(matchKey(c,'left')){ keys.L=false; if(!held('L')) setFlipper('L',false); }
  else if(matchKey(c,'right')){ keys.R=false; if(!held('R')) setFlipper('R',false); }
  else if(matchKey(c,'launch')){ if(state==='play'&&ball&&ball.state==='lane'&&plunger.charging) launchBall(); }
});
"""
if not old_ku_pattern.search(src):
    print("ERREUR : pattern keyup introuvable.")
    raise SystemExit(1)
src = old_ku_pattern.sub(new_ku, src, count=1)

with io.open(path, "w", encoding="utf-8") as f:
    f.write(src)

print("Handlers keydown/keyup remplacés.")
PYEOF

# ---------- 6. Actions overlay ----------
python3 - <<'PYEOF'
import io

path = "cristal-dragon.html"
with io.open(path, encoding="utf-8") as f:
    src = f.read()

# Ajouter la branche settings + capture + reset-keys avant le case 'about'
needle = "else if(a==='about')"
if needle not in src:
    print("AVERTISSEMENT : action 'about' non trouvée, branches ajoutées à un autre endroit.")
    # tenter une autre ancre
    needle = "else if(a==='stats')"

if needle in src:
    addition = """else if(a==='settings'){ setState('settings'); renderKeyLabels(); }
  else if(a==='capture'){ beginCapture(b.dataset.target); }
  else if(a==='reset-keys'){ resetKeyMap(); }
  """
    src = src.replace(needle, addition + needle, 1)

# Annuler capture si clic hors bouton capture
needle2 = "const a=b.dataset.action;"
if needle2 in src:
    src = src.replace(
        needle2,
        needle2 + "\n  if(a!=='capture' && keyCapture) cancelCapture();",
        1
    )

with io.open(path, "w", encoding="utf-8") as f:
    f.write(src)

print("Actions overlay ajoutées.")
PYEOF

# ---------- Vérifications finales ----------
echo ""
echo "===== Vérifications ====="
grep -c "cristalDragonKeyMap" "$FILE" | sed 's/^/Occurrences cristalDragonKeyMap : /'
grep -c "data-action=\"settings\"" "$FILE" | sed 's/^/Bouton settings : /'
grep -c "data-p=\"settings\"" "$FILE" | sed 's/^/Section settings : /'
grep -c "matchKey(c,'left')" "$FILE" | sed 's/^/Appels matchKey left : /'

echo ""
echo "===== Test rapide syntaxe HTML/JS ====="
if command -v node >/dev/null 2>&1; then
  node -e "
    const fs=require('fs');
    const src=fs.readFileSync('$FILE','utf8');
    const m=src.match(/<script>([\s\S]*)<\/script>/);
    if(!m){ console.log('AVERTISSEMENT : bloc <script> introuvable.'); process.exit(0); }
    try{ new Function(m[1]); console.log('SYNTAXE JS : OK'); }
    catch(e){ console.log('ERREUR SYNTAXE JS :', e.message); process.exit(1); }
  "
fi

echo ""
echo "===== Résumé ====="
echo "Patch appliqué. Vérifie manuellement :"
echo "  1. Ouvre cristal-dragon.html dans un navigateur"
echo "  2. Menu → bouton Paramètres → doit s'ouvrir"
echo "  3. Modifie une touche, recharge la page, la touche doit persister"
echo ""
echo "Pour annuler : cp $BK $FILE"
echo ""
echo "Étape suivante : lance bash qa-rapide.sh pour la non-régression."

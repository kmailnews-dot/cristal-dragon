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
grep -q "cristalDragonVolSfx" "$FILE" && { echo "Patch déjà appliqué."; exit 0; }
python3 - <<'PYEOF'
import io
path = "cristal-dragon.html"
with io.open(path, encoding="utf-8") as f:
    src = f.read()

old_obj = "ac:null, master:null, last:Object.create(null), nbuf:null, amb:null,"
new_obj = "ac:null, master:null, masterSfx:null, masterMusic:null, volSfx:1, volMusic:1, last:Object.create(null), nbuf:null, amb:null,"
assert old_obj in src, "champs Snd introuvables"
src = src.replace(old_obj, new_obj, 1)

old_ensure = """        this.master=this.ac.createGain();
        this.master.gain.value=muted?0:0.5;
        this.master.connect(this.ac.destination);"""
new_ensure = """        this.master=this.ac.createGain();
        this.master.gain.value=muted?0:0.5;
        this.masterSfx=this.ac.createGain();
        this.masterSfx.gain.value=this.volSfx;
        this.masterMusic=this.ac.createGain();
        this.masterMusic.gain.value=this.volMusic;
        this.masterSfx.connect(this.master);
        this.masterMusic.connect(this.master);
        this.master.connect(this.ac.destination);"""
assert old_ensure in src, "bloc master introuvable"
src = src.replace(old_ensure, new_ensure, 1)

old_setmuted = """  setMuted(m){
    if(!this.master) return;
    try{ this.master.gain.setTargetAtTime(m?0:0.5, this.ac.currentTime, 0.05); }
    catch(e){ this.master.gain.value=m?0:0.5; }
  },"""
new_setmuted = old_setmuted + """
  setVol(sfx, music){
    if(sfx!==undefined){ this.volSfx=Math.max(0,Math.min(1,sfx)); if(this.masterSfx){ try{ this.masterSfx.gain.setTargetAtTime(this.volSfx, this.ac.currentTime, 0.05); }catch(e){ this.masterSfx.gain.value=this.volSfx; } } }
    if(music!==undefined){ this.volMusic=Math.max(0,Math.min(1,music)); if(this.masterMusic){ try{ this.masterMusic.gain.setTargetAtTime(this.volMusic, this.ac.currentTime, 0.05); }catch(e){ this.masterMusic.gain.value=this.volMusic; } } }
    try{ localStorage.setItem('cristalDragonVolSfx', String(this.volSfx)); localStorage.setItem('cristalDragonVolMusic', String(this.volMusic)); }catch(e){}
  },"""
assert old_setmuted in src, "setMuted introuvable"
src = src.replace(old_setmuted, new_setmuted, 1)

old_tone = """      o.connect(g); g.connect(this.master);
      o.start(t0); o.stop(t0+dur+0.05);"""
new_tone = """      o.connect(g); g.connect(this.masterSfx||this.master);
      o.start(t0); o.stop(t0+dur+0.05);"""
assert old_tone in src, "ligne tone->master introuvable"
src = src.replace(old_tone, new_tone, 1)

old_noise_hdr = "  noise(dur,vol,f0,f1,delay){"
tone_m = """  toneM(f,dur,type,vol,f2,delay){
    if(!this.ac) return;
    try{
      const t0=this.ac.currentTime+(delay||0);
      const o=this.ac.createOscillator(), g=this.ac.createGain();
      o.type=type; o.frequency.setValueAtTime(Math.max(1,f),t0);
      if(f2) o.frequency.exponentialRampToValueAtTime(Math.max(1,f2),t0+dur);
      g.gain.setValueAtTime(0.0001,t0);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002,vol),t0+0.01);
      g.gain.exponentialRampToValueAtTime(0.0001,t0+dur);
      o.connect(g); g.connect(this.masterMusic||this.master);
      o.start(t0); o.stop(t0+dur+0.05);
    }catch(e){}
  },
"""
assert old_noise_hdr in src, "ancre noise introuvable"
src = src.replace(old_noise_hdr, tone_m + old_noise_hdr, 1)

old_noise = """      s.connect(bp); bp.connect(g); g.connect(this.master);
      s.start(t0); s.stop(t0+dur+0.05);"""
new_noise = """      s.connect(bp); bp.connect(g); g.connect(this.masterSfx||this.master);
      s.start(t0); s.stop(t0+dur+0.05);"""
assert old_noise in src, "ligne noise->master introuvable"
src = src.replace(old_noise, new_noise, 1)

old_amb = "        g.connect(this.master);\n        o1.start(); o2.start(); lfo.start();"
new_amb = "        g.connect(this.masterMusic||this.master);\n        o1.start(); o2.start(); lfo.start();"
assert old_amb in src, "ligne ambient->master introuvable"
src = src.replace(old_amb, new_amb, 1)

old_music = "    if(!muted){ Snd.tone(f,1.0,'sine',0.04); Snd.tone(f,1.0,'sine',0.015,null,0.35); }"
new_music = "    if(!muted){ Snd.toneM(f,1.0,'sine',0.04); Snd.toneM(f,1.0,'sine',0.015,null,0.35); }"
assert old_music in src, "ligne musique introuvable"
src = src.replace(old_music, new_music, 1)

old_muted_init = "let muted=(()=>{ try{ return localStorage.getItem('cristalDragonMuted')==='1'; }catch(e){ return false; } })();"
new_muted_init = old_muted_init + """
let volSfxInit=(()=>{ try{ const v=parseFloat(localStorage.getItem('cristalDragonVolSfx')); return isNaN(v)?1:Math.max(0,Math.min(1,v)); }catch(e){ return 1; } })();
let volMusicInit=(()=>{ try{ const v=parseFloat(localStorage.getItem('cristalDragonVolMusic')); return isNaN(v)?1:Math.max(0,Math.min(1,v)); }catch(e){ return 1; } })();"""
assert old_muted_init in src, "init muted introuvable"
src = src.replace(old_muted_init, new_muted_init, 1)

old_resume = "      if(this.ac.state==='suspended') this.ac.resume();"
new_resume = """      if(this.masterSfx && typeof volSfxInit!=='undefined') this.masterSfx.gain.value=volSfxInit;
      if(this.masterMusic && typeof volMusicInit!=='undefined') this.masterMusic.gain.value=volMusicInit;
      if(this.ac.state==='suspended') this.ac.resume();"""
assert old_resume in src, "ligne resume introuvable"
src = src.replace(old_resume, new_resume, 1)

old_settings_btns = """      <div class="btnrow">
        <button class="btn ghost" data-action="reset-keys">Réinitialiser</button>
        <button class="btn" data-action="menu">Retour</button>
      </div>
    </section>
    <section class="panel" data-p="resume">"""
new_settings_btns = """      <div class="sub" style="margin-top:calc(var(--u)*14px)">Volume</div>
      <div class="row">
        <span class="lbl">Effets sonores</span>
        <input type="range" id="volSfx" min="0" max="100" step="1" value="100" style="width:calc(var(--u)*120px)">
        <span class="val" id="volSfxVal">100%</span>
      </div>
      <div class="row">
        <span class="lbl">Musique</span>
        <input type="range" id="volMusic" min="0" max="100" step="1" value="100" style="width:calc(var(--u)*120px)">
        <span class="val" id="volMusicVal">100%</span>
      </div>
      <div class="btnrow">
        <button class="btn ghost" data-action="reset-keys">Réinitialiser</button>
        <button class="btn" data-action="menu">Retour</button>
      </div>
    </section>
    <section class="panel" data-p="resume">"""
assert old_settings_btns in src, "btnrow settings introuvable"
src = src.replace(old_settings_btns, new_settings_btns, 1)

old_render_set = "function renderKeyLabels(){"
new_render_set = """function renderVolSliders(){
  const sfx=document.getElementById('volSfx');
  const mus=document.getElementById('volMusic');
  if(sfx){ sfx.value=String(Math.round(Snd.volSfx*100)); const v=document.getElementById('volSfxVal'); if(v) v.textContent=sfx.value+'%'; }
  if(mus){ mus.value=String(Math.round(Snd.volMusic*100)); const v=document.getElementById('volMusicVal'); if(v) v.textContent=mus.value+'%'; }
}
function renderKeyLabels(){"""
assert old_render_set in src, "renderKeyLabels introuvable"
src = src.replace(old_render_set, new_render_set, 1)

old_open_set = "else if(a==='settings'){ setState('settings'); renderKeyLabels(); }"
new_open_set = "else if(a==='settings'){ setState('settings'); renderKeyLabels(); renderVolSliders(); }"
assert old_open_set in src, "ouverture settings introuvable"
src = src.replace(old_open_set, new_open_set, 1)

old_end_marker = "})();"
last_idx = src.rfind(old_end_marker)
assert last_idx > 0, "fin du script introuvable"
inject = """/* ---------- Sliders de volume ---------- */
function bindVolSliders(){
  const sfx=document.getElementById('volSfx');
  const mus=document.getElementById('volMusic');
  if(sfx && !sfx.dataset.bound){
    sfx.dataset.bound='1';
    sfx.addEventListener('input', function(){ Snd.ensure(); Snd.setVol(sfx.value/100, undefined); const v=document.getElementById('volSfxVal'); if(v) v.textContent=sfx.value+'%'; });
  }
  if(mus && !mus.dataset.bound){
    mus.dataset.bound='1';
    mus.addEventListener('input', function(){ Snd.ensure(); Snd.setVol(undefined, mus.value/100); const v=document.getElementById('volMusicVal'); if(v) v.textContent=mus.value+'%'; });
  }
}
document.addEventListener('DOMContentLoaded', bindVolSliders);
bindVolSliders();
"""
src = src[:last_idx] + inject + src[last_idx:]

with io.open(path, "w", encoding="utf-8") as f:
    f.write(src)
print("Patch volumes appliqué.")
PYEOF

echo ""
echo "===== Vérifications ====="
grep -c "masterSfx" "$FILE" | sed 's/^/Occurrences masterSfx : /'
grep -c "masterMusic" "$FILE" | sed 's/^/Occurrences masterMusic : /'
grep -c "cristalDragonVolSfx" "$FILE" | sed 's/^/Occurrences volSfx localStorage : /'
grep -c 'id="volSfx"' "$FILE" | sed 's/^/Slider volSfx : /'
grep -c "function renderVolSliders" "$FILE" | sed 's/^/Fonction renderVolSliders : /'

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
echo "===== Résumé ====="
echo "Patch volumes appliqué."
echo "Annulation : cp $BK $FILE"
EOF5
chmod +x patch-volumes.sh
echo "Script complet."

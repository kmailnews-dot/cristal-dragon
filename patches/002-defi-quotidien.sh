#!/bin/bash
# 002-defi-quotidien — mode defi seede par la date locale + top 5 du jour.
set -e
cd "$(dirname "$0")/.."

python3 - <<'PYEOF'
import io
path = "cristal-dragon.html"
with io.open(path, encoding="utf-8") as f:
    src = f.read()

# ---------- 1. Ajouter le mode defi ----------
old = """const MODES={
  classic:{nom:'CLASSIQUE', goal:50000, balls:5, bumper:50, time:0},
  chrono:{nom:'CHRONO', goal:30000, balls:3, bumper:50, time:60},
  survie:{nom:'SURVIE', goal:20000, balls:1, bumper:500, time:0}
};"""
new = """const MODES={
  classic:{nom:'CLASSIQUE', goal:50000, balls:5, bumper:50, time:0},
  chrono:{nom:'CHRONO', goal:30000, balls:3, bumper:50, time:60},
  survie:{nom:'SURVIE', goal:20000, balls:1, bumper:500, time:0},
  defi:{nom:'DEFI DU JOUR', goal:50000, balls:5, bumper:50, time:0}
};"""
assert old in src, "MODES introuvable"
src = src.replace(old, new, 1)

# ---------- 2. RNG seede + daily helpers, avant debugState ----------
old_dbg = "window.debugState=()=>JSON.stringify({"
new_dbg = """/* ---------- Defi quotidien : RNG seede par la date locale ---------- */
let rngDailyState = 0;
function dailySeed(){
  const d=new Date();
  const y=d.getFullYear();
  const m=String(d.getMonth()+1).padStart(2,'0');
  const dd=String(d.getDate()).padStart(2,'0');
  return parseInt(y+m+dd, 10);
}
function seedDaily(s){
  rngDailyState = (s >>> 0) || 1;
}
function rngDaily(){
  // mulberry32
  rngDailyState |= 0;
  rngDailyState = (rngDailyState + 0x6D2B79F5) | 0;
  let t = rngDailyState;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
function rngGame(){
  return gameMode==='defi' ? rngDaily() : Math.random();
}
function dailyTopKey(){ return 'cristalDragonDailyTop5'; }
function loadDailyTop(){
  try{
    const v=JSON.parse(localStorage.getItem(dailyTopKey()));
    const today=String(dailySeed());
    if(v && typeof v==='object' && v.date===today && Array.isArray(v.scores)){
      return {date:today, scores:v.scores.slice(0,5)};
    }
  }catch(e){}
  return {date:String(dailySeed()), scores:[]};
}
function saveDailyTop(t){
  try{ localStorage.setItem(dailyTopKey(), JSON.stringify(t)); }catch(e){}
}
function addDailyScore(s){
  const t=loadDailyTop();
  t.scores.push(s);
  t.scores.sort((a,b)=>b-a);
  t.scores=t.scores.slice(0,5);
  t.date=String(dailySeed());
  saveDailyTop(t);
  return t;
}
function dailyTopHtml(){
  const t=loadDailyTop();
  if(!t.scores.length) return 'Aucun score enregistre aujourd\\'hui.';
  return t.scores.map((s,i)=>'<div class="best">'+(i+1)+'. '+fmt(s)+'</div>').join('');
}
function startDaily(){
  gameMode='defi';
  seedDaily(dailySeed());
  startGame();
}

"""
assert old_dbg in src, "debugState introuvable"
src = src.replace(old_dbg, new_dbg + old_dbg, 1)

# ---------- 3. debugState etendu ----------
old_dbg_body = """  runes:runes.map(r=>r.up),
  nudgeCount, tilted
});"""
new_dbg_body = """  runes:runes.map(r=>r.up),
  nudgeCount, tilted,
  dailySeed: dailySeed(),
  dailyScores: loadDailyTop().scores.slice()
});"""
assert old_dbg_body in src, "corps debugState introuvable"
src = src.replace(old_dbg_body, new_dbg_body, 1)

# ---------- 4. Sites gameplay : rngGame() ----------
# Site 1 : bonus cache 5%
old_site1 = "if(Math.random()<0.05){"
new_site1 = "if(rngGame()<0.05){"
assert old_site1 in src, "site bonus cache introuvable"
src = src.replace(old_site1, new_site1, 1)

# Site 2 : type de power-up
old_site2 = "const type=types[(Math.random()*types.length)|0];"
new_site2 = "const type=types[(rngGame()*types.length)|0];"
assert old_site2 in src, "site type powerup introuvable"
src = src.replace(old_site2, new_site2, 1)

# Site 3 : position power-up
old_site3 = "const cx=70+Math.random()*240, cy=140+Math.random()*380;"
new_site3 = "const cx=70+rngGame()*240, cy=140+rngGame()*380;"
assert old_site3 in src, "site position powerup introuvable"
src = src.replace(old_site3, new_site3, 1)

# Site 4 : anti-stuck (2 lignes)
old_site4 = """    ball.vx+=(Math.random()*2-1)*C.STUCK.NX; ball.vy-=C.STUCK.NY;"""
new_site4 = """    ball.vx+=(rngGame()*2-1)*C.STUCK.NX; ball.vy-=C.STUCK.NY;"""
assert old_site4 in src, "site anti-stuck introuvable"
src = src.replace(old_site4, new_site4, 1)

# Site 5 : anti-stuck ligne 2 (les deux lignes 1058/1061 sont identiques, on a remplace la premiere)
# Rien a faire, l'autre est identique et sera remplacee plus bas si presente
old_site5 = "    ball.vx+=(Math.random()*2-1)*40;"
new_site5 = "    ball.vx+=(rngGame()*2-1)*40;"
count = src.count(old_site5)
if count:
    src = src.replace(old_site5, new_site5)

# ---------- 5. StartGame / resetGame : seed si mode defi ----------
old_reset = "  score=0; balls=MODES[gameMode].balls; goal=MODES[gameMode].goal; chronoT=MODES[gameMode].time; chronoShown=-1;"
new_reset = """  if(gameMode==='defi') seedDaily(dailySeed());
  score=0; balls=MODES[gameMode].balls; goal=MODES[gameMode].goal; chronoT=MODES[gameMode].time; chronoShown=-1;"""
assert old_reset in src, "resetGame introuvable"
src = src.replace(old_reset, new_reset, 1)

# ---------- 6. Enregistrer le score en fin de defi ----------
# On hook dans setState ou dans la fin de partie. On cherche sndVictory + setState('victory')
old_victory = "sndVictory(); buzz(60); setState('victory');"
new_victory = """sndVictory(); buzz(60);
  if(gameMode==='defi') addDailyScore(score);
  setState('victory');"""
count_v = src.count(old_victory)
assert count_v >= 1, "hook victory introuvable"
src = src.replace(old_victory, new_victory, 1)

old_defeat = "if(balls<=0){ sndDefeat(); setState('defeat'); }"
new_defeat = """if(balls<=0){ sndDefeat();
    if(gameMode==='defi') addDailyScore(score);
    setState('defeat');
  }"""
assert old_defeat in src, "hook defeat introuvable"
src = src.replace(old_defeat, new_defeat, 1)

with io.open(path, "w", encoding="utf-8") as f:
    f.write(src)
print("Defi quotidien : RNG, mode, hooks ajoutes.")
PYEOF

#!/bin/bash
# 003b-palette-ui — ajoute le selecteur de palette dans l'ecran Parametres
set -e
cd "$(dirname "$0")/.."

python3 - <<'PYEOF'
import io
path = "cristal-dragon.html"
with io.open(path, encoding="utf-8") as f:
    src = f.read()

old = """      <div class="sub" style="margin-top:calc(var(--u)*14px)">Volume</div>"""
new = """      <div class="sub" style="margin-top:calc(var(--u)*14px)">Palette de couleurs</div>
      <div class="row">
        <span class="lbl">Couleurs</span>
        <select id="paletteSelect" style="background:rgba(255,255,255,.07);color:#cfd6ff;border:1px solid rgba(255,255,255,.15);border-radius:calc(var(--u)*8px);padding:calc(var(--u)*6px) calc(var(--u)*10px)">
          <option value="default">Défaut</option>
          <option value="deuteranopie">Deutéranopie</option>
          <option value="protanopie">Protanopie</option>
        </select>
      </div>
      <div class="sub" style="margin-top:calc(var(--u)*14px)">Volume</div>"""

assert old in src, "ancre Volume introuvable"
if 'id="paletteSelect"' in src:
    print("Deja present.")
else:
    src = src.replace(old, new, 1)
    with io.open(path, "w", encoding="utf-8") as f:
        f.write(src)
    print("Selecteur palette ajoute.")
PYEOF

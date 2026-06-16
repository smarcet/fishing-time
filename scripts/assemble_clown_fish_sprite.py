"""Assembles clown_fish_sprite.png (3420x642) from individual Fish_2 PNGs.

Row 0: Fish_move_2 frames 000-009 (231x135 each), centred in 342x321 cells
Row 1: Fish_die_2  frames 000-009 (342x321 each), pasted as-is

Run from the repo root:
    python3 scripts/assemble_clown_fish_sprite.py
"""
from pathlib import Path
from PIL import Image

BASE    = Path(__file__).parent.parent
SRC     = BASE / 'images' / 'fishes'
FISH2   = Path.home() / 'Downloads/game_assets/game_assets/craftpix-997812-fish-crab-jellyfish-and-shark-2d-game-sprites/PNG/Fish_2'

COLS   = 10
CELL_W = 342   # die-frame natural width  (canonical cell)
CELL_H = 321   # die-frame natural height
OUT_W  = COLS * CELL_W   # 3420
OUT_H  = 2 * CELL_H      # 642

sheet = Image.new('RGBA', (OUT_W, OUT_H))

# Row 0: move frames centred in the canonical cell
MOVE_W, MOVE_H = 231, 135
ox = (CELL_W - MOVE_W) // 2   # 55
oy = (CELL_H - MOVE_H) // 2   # 93
move_files = sorted(FISH2.glob('Fish_move_2_*.png'))
assert len(move_files) == COLS, f'Expected {COLS} move frames, got {len(move_files)}'
for i, path in enumerate(move_files):
    cell = Image.new('RGBA', (CELL_W, CELL_H))
    frame = Image.open(path).convert('RGBA')
    cell.paste(frame, (ox, oy))
    sheet.paste(cell, (i * CELL_W, 0))

# Row 1: die frames at natural size
die_files = sorted(FISH2.glob('Fish_die_2_*.png'))
assert len(die_files) == COLS, f'Expected {COLS} die frames, got {len(die_files)}'
for i, path in enumerate(die_files):
    frame = Image.open(path).convert('RGBA')
    sheet.paste(frame, (i * CELL_W, CELL_H))

out_path = SRC / 'clown_fish_sprite.png'
sheet.save(out_path)
print(f'Saved {out_path}  ({sheet.size[0]}x{sheet.size[1]})')

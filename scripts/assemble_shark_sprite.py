"""Assembles shark_sprite.png (10600x1024) from individual Shark_1 PNGs.

Row 0: Shark_move_1 frames 000-009 (1036x483 each), centred in 1060x512 cells
Row 1: Shark_die_1  frames 000-009 (1060x512 each), pasted as-is

Run from the repo root:
    python3 scripts/assemble_shark_sprite.py
"""
from pathlib import Path
from PIL import Image

BASE   = Path(__file__).parent.parent
SRC    = BASE / 'images' / 'fishes'
SHARK1 = Path.home() / 'Downloads/game_assets/game_assets/craftpix-997812-fish-crab-jellyfish-and-shark-2d-game-sprites/PNG/Shark_1'

COLS   = 10
CELL_W = 1060   # die-frame natural width  (canonical cell)
CELL_H = 512    # die-frame natural height
OUT_W  = COLS * CELL_W   # 10600
OUT_H  = 2 * CELL_H      # 1024

sheet = Image.new('RGBA', (OUT_W, OUT_H))

# Row 0: move frames centred in the canonical cell
MOVE_W, MOVE_H = 1036, 483
ox = (CELL_W - MOVE_W) // 2   # 12
oy = (CELL_H - MOVE_H) // 2   # 14
move_files = sorted(SHARK1.glob('Shark_move_1_*.png'))
assert len(move_files) == COLS, f'Expected {COLS} move frames, got {len(move_files)}'
for i, path in enumerate(move_files):
    cell = Image.new('RGBA', (CELL_W, CELL_H))
    frame = Image.open(path).convert('RGBA')
    cell.paste(frame, (ox, oy))
    sheet.paste(cell, (i * CELL_W, 0))

# Row 1: die frames at natural size
die_files = sorted(SHARK1.glob('Shark_die_1_*.png'))
assert len(die_files) == COLS, f'Expected {COLS} die frames, got {len(die_files)}'
for i, path in enumerate(die_files):
    frame = Image.open(path).convert('RGBA')
    sheet.paste(frame, (i * CELL_W, CELL_H))

out_path = SRC / 'shark_sprite.png'
sheet.save(out_path)
print(f'Saved {out_path}  ({sheet.size[0]}x{sheet.size[1]})')

"""Assembles tuna_sprite.png (4096x600) from individual PNGs.

Row 0: swim_left frames 1-8 (512x300 each)
Row 1: rest_movement_left frames 1-6, then frame 6 repeated twice (padded to 8)

Run from the repo root:
    python3 scripts/assemble_tuna_sprite.py
"""
from pathlib import Path
from PIL import Image

BASE = Path(__file__).parent.parent
SRC  = BASE / 'images' / 'fishes'
SPRITE_SRC = Path.home() / 'Downloads/game_assets/game_assets/Tunafishsprite--1c4s3d4s198p7u3556/pngs'
SWIM = SPRITE_SRC / 'swim_left'
REST = SPRITE_SRC / 'rest_movement_left'

COLS = 8
CELL_W, CELL_H = 512, 300
OUT_W, OUT_H = COLS * CELL_W, 2 * CELL_H  # 4096 x 600

sheet = Image.new('RGBA', (OUT_W, OUT_H))

# Row 0: swim frames 1-8
for i in range(COLS):
    frame = Image.open(SWIM / f'{i + 1}.png').convert('RGBA')
    sheet.paste(frame, (i * CELL_W, 0))

# Row 1: rest frames 1-6 then repeat frame 6 twice
rest_frames = [Image.open(REST / f'{i + 1}.png').convert('RGBA') for i in range(6)]
padded = rest_frames + [rest_frames[-1], rest_frames[-1]]
for i, frame in enumerate(padded):
    sheet.paste(frame, (i * CELL_W, CELL_H))

out_path = SRC / 'tuna_sprite.png'
sheet.save(out_path)
print(f'Saved {out_path}  ({sheet.size[0]}x{sheet.size[1]})')

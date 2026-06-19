#!/usr/bin/env python3
"""Generate PWA icons from images/hook.svg using ImageMagick."""
import os, subprocess

os.makedirs('images/icons', exist_ok=True)
for size in (192, 512):
    _ = subprocess.run(
        ['convert', '-background', '#0075C4', '-flatten',
         '-resize', f'{size}x{size}', 'images/hook.svg',
         f'images/icons/icon-{size}.png'],
        check=True,
    )

"""Crop sprite sheets to show only the first frame."""
from PIL import Image
import os
import glob

SPRITES_DIR = r'C:\Users\k\Downloads\pokemon z guia\sprites'
ICONS_DIR = r'C:\Users\k\Downloads\pokemon z guia\icons'

# Crop battle sprites - they are horizontal sprite sheets
# Height = frame height, first frame width = height (square frames)
count = 0
for path in glob.glob(os.path.join(SPRITES_DIR, '*.png')):
    try:
        img = Image.open(path)
        w, h = img.size
        if w > h * 1.5:  # It's a sprite sheet
            # First frame is h x h
            frame = img.crop((0, 0, h, h))
            frame.save(path)
            count += 1
    except Exception as e:
        print(f"Error {path}: {e}")

print(f"Cropped {count} battle sprites")

# Crop icons - they are 128x64 (2 frames of 64x64)
icon_count = 0
for path in glob.glob(os.path.join(ICONS_DIR, '*.png')):
    try:
        img = Image.open(path)
        w, h = img.size
        if w > h:  # 2-frame icon sheet
            frame_w = w // 2
            frame = img.crop((0, 0, frame_w, h))
            frame.save(path)
            icon_count += 1
    except Exception as e:
        print(f"Error {path}: {e}")

print(f"Cropped {icon_count} icon sprites")

"""Batch convert all product images from .jpg to .webp (lossy 80)."""
from PIL import Image
import os, glob, sys

img_dir = os.path.join(os.path.dirname(__file__), 'frontend', 'public', 'images')
if not os.path.isdir(img_dir):
    print(f"ERROR: {img_dir} not found", file=sys.stderr)
    sys.exit(1)

converted = []
for path in sorted(glob.glob(os.path.join(img_dir, '*.jpg')) + glob.glob(os.path.join(img_dir, '*.jpeg')) + glob.glob(os.path.join(img_dir, '*.png'))):
    base, ext = os.path.splitext(path)
    webp_path = base + '.webp'
    if os.path.exists(webp_path):
        old_sz = os.path.getsize(path)
        webp_sz = os.path.getsize(webp_path)
        converted.append(f"  exist {os.path.basename(webp_path)} ({old_sz//1024}K jpg → {webp_sz//1024}K webp)")
        continue

    img = Image.open(path)
    # Handle RGBA → RGB
    if img.mode in ('RGBA', 'P'):
        rgba = img.convert('RGBA')
        has_alpha = rgba.getchannel('A').getextrema() != (255, 255)
        if has_alpha:
            # Keep as PNG — save optimized version
            img.save(path, 'PNG', optimize=True)
            converted.append(f"  skip  {os.path.basename(path)} (has alpha)")
            continue
        img = img.convert('RGB')

    old_size = os.path.getsize(path)
    img.save(webp_path, 'WEBP', quality=80, method=6)
    webp_size = os.path.getsize(webp_path)
    pct = int((1 - webp_size/old_size) * 100)
    converted.append(f"  {os.path.basename(path):45s} {old_size//1024:4d}K → {webp_size//1024:4d}K ({pct}% savings)")

print(f"Converted {len(converted)} images in {img_dir}")
for c in converted:
    print(c)

# Calculate total savings
total_old = sum(os.path.getsize(os.path.join(img_dir, f)) for f in os.listdir(img_dir) if os.path.splitext(f)[1].lower() in ('.jpg','.jpeg','.png'))
total_webp = sum(os.path.getsize(os.path.join(img_dir, f)) for f in os.listdir(img_dir) if f.lower().endswith('.webp'))
print(f"\nTotal JPEG/PNG: {total_old//1024}KB  Total WebP: {total_webp//1024}KB  ({int((1-total_webp/total_old)*100)}% savings)")

"""Batch compress product images for web — reduces 63MB to ~5MB"""
from PIL import Image
import os, glob

img_dir = os.path.join(os.path.dirname(__file__), 'frontend', 'public', 'images')
sizes_before = {}
total_before = 0

for ext in ('*.png', '*.jpeg', '*.jpg'):
    for path in glob.glob(os.path.join(img_dir, ext)):
        fsize = os.path.getsize(path)
        sizes_before[path] = fsize
        total_before += fsize

print(f"Total before: {total_before/1024/1024:.1f}MB ({len(sizes_before)} images)")

for path, before in sizes_before.items():
    try:
        img = Image.open(path)
        # Handle RGBA/transparency - convert to RGB for JPEG
        if img.mode in ('RGBA', 'P'):
            img = img.convert('RGBA')
            # Check if actually has transparency
            has_alpha = img.getchannel('A').getextrema() != (255, 255)
            if has_alpha:
                # Keep as PNG for transparency
                new_path = path
                img.save(new_path, 'PNG', optimize=True)
                after = os.path.getsize(new_path)
                saved_pct = (1 - after / before) * 100
                print(f"  {os.path.basename(path):40s} {before/1024:7.0f}KB \u2192 {after/1024:6.0f}KB ({saved_pct:.0f}% saved)")
                continue
            img = img.convert('RGB')
        
        w, h = img.size
        max_dim = max(w, h)
        
        # Resize: cap longest edge at 1200px (plenty for web display)
        if max_dim > 1200:
            ratio = 1200 / max_dim
            new_size = (int(w * ratio), int(h * ratio))
            img = img.resize(new_size, Image.LANCZOS)
        
        # Save as optimized JPEG with quality 80
        new_path = os.path.splitext(path)[0] + '.jpg'
        img.save(new_path, 'JPEG', quality=80, optimize=True, progressive=True)
        
        after = os.path.getsize(new_path)
        saved_pct = (1 - after / before) * 100
        
        # Remove original if different extension
        if new_path != path:
            os.remove(path)
            
        print(f"  {os.path.basename(path):40s} {before/1024:7.0f}KB \u2192 {after/1024:6.0f}KB ({saved_pct:.0f}% saved)")
    except Exception as e:
        print(f"  SKIP {os.path.basename(path)}: {e}")

# Count final
total_after = 0
for ext in ('*.jpg', '*.jpeg', '*.png'):
    for path in glob.glob(os.path.join(img_dir, ext)):
        total_after += os.path.getsize(path)
print(f"Total after:  {total_after/1024/1024:.1f}MB ({(1-total_after/total_before)*100:.0f}% reduction)")

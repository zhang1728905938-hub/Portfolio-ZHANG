"""Regenerate responsive previews after replacing photographs. Requires Pillow."""
from pathlib import Path
from PIL import Image, ImageOps

image_dir = Path(__file__).resolve().parent.parent / 'public' / 'images'
for path in sorted(image_dir.glob('*.jpg')):
    with Image.open(path) as original:
        image = ImageOps.exif_transpose(original).convert('RGB')
        image.thumbnail((480, 640))
        image.save(path.with_name(path.stem + '-sm.webp'), 'WEBP', quality=75, method=6)
        print(path.stem, image.size)

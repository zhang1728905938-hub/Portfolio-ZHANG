"""Prepare the first Work Project's ordered image set. Requires Pillow.

Run from any directory. Original JPG copies remain byte-identical; WebP
previews retain each complete layout, aspect ratio, and embedded ICC profile.
"""
from hashlib import sha256
import json
from pathlib import Path
from shutil import copyfile

from PIL import Image, ImageOps


ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'WORK PROJECT' / '01 project'
OUTPUT = ROOT / 'public' / 'images'


def digest(path):
    return sha256(path.read_bytes()).hexdigest()


def prepare():
    sources = [SOURCE / f'{number:02}.jpg' for number in range(1, 12)]
    missing = [str(path) for path in sources if not path.is_file()]
    if missing:
        raise FileNotFoundError('Missing project images: ' + ', '.join(missing))

    OUTPUT.mkdir(parents=True, exist_ok=True)
    report = []
    for number, source in enumerate(sources, start=1):
        stem = f'work-project-01-{number:02}'
        original = OUTPUT / f'{stem}.jpg'
        preview = OUTPUT / f'{stem}.webp'
        copyfile(source, original)
        assert digest(source) == digest(original), f'Original copy differs: {source}'

        with Image.open(source) as opened:
            image = ImageOps.exif_transpose(opened).convert('RGB')
            source_size = image.size
            profile = opened.info.get('icc_profile')
            metadata = {'icc_profile': profile} if profile else {}
            image.thumbnail((2400, 2400), Image.Resampling.LANCZOS)
            image.save(preview, 'WEBP', quality=90, method=6, **metadata)
            entry = {
                'source': source.name,
                'source_dimensions': source_size,
                'original': original.relative_to(ROOT).as_posix(),
                'original_bytes': original.stat().st_size,
                'original_sha256': digest(original),
                'preview': preview.relative_to(ROOT).as_posix(),
                'preview_dimensions': image.size,
                'preview_bytes': preview.stat().st_size,
            }
            if number == 1:
                cover = OUTPUT / f'{stem}-sm.webp'
                image.thumbnail((480, 480), Image.Resampling.LANCZOS)
                image.save(cover, 'WEBP', quality=86, method=6, **metadata)
                entry.update({
                    'cover': cover.relative_to(ROOT).as_posix(),
                    'cover_dimensions': image.size,
                    'cover_bytes': cover.stat().st_size,
                })
            report.append(entry)
    print(json.dumps(report, indent=2))


if __name__ == '__main__':
    prepare()

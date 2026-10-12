"""Prepare ACADEMIC PROJECT 01-05 assets and generated gallery metadata.

Requires Pillow. Originals are byte-identical copies. WebP previews preserve
each full layout and ICC profile, and never upscale. Inspection contact sheets
and a SHA-256 manifest are written to .preview/ for repeatable verification.
"""
from hashlib import sha256
import json
from math import ceil
from pathlib import Path
from shutil import copyfile

from PIL import Image, ImageDraw, ImageOps


ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'ACADEMIC PROJECT'
OUTPUT = ROOT / 'public' / 'images'
INSPECTION = ROOT / '.preview'
DATA_MODULE = ROOT / 'src' / 'academicProjectGalleries.js'
PROJECTS = ('01', '02', '03', '04', '05')
COVER_NUMBERS = {'03': '04'}
EXTENSIONS = {'.jpg', '.jpeg', '.png'}


def digest(path):
    return sha256(path.read_bytes()).hexdigest()


def source_images(folder):
    files = [path for path in folder.rglob('*') if path.is_file()]
    unexpected = [path for path in files if path.parent != folder
                  or path.suffix.lower() not in EXTENSIONS or not path.stem.isdecimal()]
    if unexpected:
        raise ValueError('Review unexpected source assets before preparing: ' + ', '.join(str(path) for path in unexpected))
    paths = sorted(files, key=lambda path: int(path.stem))
    if not paths or [int(path.stem) for path in paths] != list(range(1, len(paths) + 1)):
        raise ValueError(f'Expected unique, continuous image numbers starting at 01: {folder}')
    return paths


def prepare():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    INSPECTION.mkdir(parents=True, exist_ok=True)
    sources = {project: source_images(SOURCE / f'{project} project') for project in PROJECTS}
    galleries = {}
    manifest = {}
    overview = Image.new('RGB', (1600, len(PROJECTS) * 620), '#eeeeee')
    overview_draw = ImageDraw.Draw(overview)

    for project_offset, (project, paths) in enumerate(sources.items()):
        cover_number = COVER_NUMBERS.get(project, '01')
        gallery = []
        report = []
        sheet = Image.new('RGB', (1500, ceil(len(paths) / 3) * 400), '#eeeeee')
        draw = ImageDraw.Draw(sheet)
        thumbnail_width = 0

        for offset, source in enumerate(paths):
            number = f'{int(source.stem):02}'
            stem = f'academic-project-{project}-{number}'
            original = OUTPUT / f'{stem}{source.suffix.lower()}'
            preview = OUTPUT / f'{stem}.webp'
            source_hash = digest(source)
            copyfile(source, original)
            if digest(original) != source_hash:
                raise ValueError(f'Original copy is not byte-identical: {source}')

            with Image.open(source) as opened:
                if getattr(opened, 'n_frames', 1) != 1:
                    raise ValueError(f'Review animated source before preparing: {source}')
                image = ImageOps.exif_transpose(opened)
                has_alpha = image.mode in ('RGBA', 'LA') or 'transparency' in image.info
                image = image.convert('RGBA' if has_alpha else 'RGB')
                source_size = image.size
                profile = opened.info.get('icc_profile')
                metadata = {'icc_profile': profile} if profile else {}

                inspection = ImageOps.contain(image.convert('RGB'), (480, 355), Image.Resampling.LANCZOS)
                x, y = (offset % 3) * 500 + 10, (offset // 3) * 400
                draw.text((x, y + 8), f'{source.name} | {source_size[0]} x {source_size[1]}', fill='#222222')
                sheet.paste(inspection, (x, y + 30))
                if offset < 2:
                    tile = ImageOps.contain(image.convert('RGB'), (780, 575), Image.Resampling.LANCZOS)
                    overview_x, overview_y = offset * 800 + 10, project_offset * 620
                    overview_draw.text((overview_x, overview_y + 8), f'{project} project / {source.name}', fill='#222222')
                    overview.paste(tile, (overview_x, overview_y + 30))

                image.thumbnail((2400, 2400), Image.Resampling.LANCZOS)
                image.save(preview, 'WEBP', quality=90, method=6, **metadata)
                gallery.append({
                    'number': number,
                    'src': f'/images/{preview.name}',
                    'fullSrc': f'/images/{original.name}',
                    'width': image.width,
                    'height': image.height,
                })
                entry = {
                    'source': source.relative_to(ROOT).as_posix(),
                    'source_dimensions': source_size,
                    'source_bytes': source.stat().st_size,
                    'sha256': source_hash,
                    'original': original.relative_to(ROOT).as_posix(),
                    'preview': preview.relative_to(ROOT).as_posix(),
                    'preview_dimensions': image.size,
                    'preview_bytes': preview.stat().st_size,
                    'icc_bytes': len(profile or b''),
                }
                if number == cover_number:
                    cover = OUTPUT / f'{stem}-sm.webp'
                    image.thumbnail((480, 480), Image.Resampling.LANCZOS)
                    image.save(cover, 'WEBP', quality=86, method=6, **metadata)
                    thumbnail_width = image.width
                    entry.update({
                        'thumbnail': cover.relative_to(ROOT).as_posix(),
                        'thumbnail_dimensions': image.size,
                        'thumbnail_bytes': cover.stat().st_size,
                    })
                report.append(entry)
                print(f'Prepared {project}/{source.name}: {gallery[-1]["width"]} x {gallery[-1]["height"]}', flush=True)

        selected_cover = next(image for image in gallery if image['number'] == cover_number)
        galleries[project] = {
            'coverNumber': cover_number,
            'image': selected_cover['src'],
            'imageWidth': selected_cover['width'],
            'thumbnail': f'/images/academic-project-{project}-{cover_number}-sm.webp',
            'thumbnailWidth': thumbnail_width,
            'gallery': gallery,
        }
        sheet.save(INSPECTION / f'academic-project-{project}-contact-sheet.jpg', quality=90)
        manifest[project] = report

    DATA_MODULE.write_text(
        '// Generated by scripts/prepare-academic-projects.py. Source image order and aspect ratios are preserved.\n'
        'export const academicProjectGalleries = ' + json.dumps(galleries, indent=2) + ';\n',
        encoding='utf-8',
    )
    (INSPECTION / 'academic-projects-assets.json').write_text(json.dumps(manifest, indent=2), encoding='utf-8')
    overview.save(INSPECTION / 'academic-projects-overview.jpg', quality=92)
    print(json.dumps({project: {
        'images': len(entries),
        'original_bytes': sum(entry['source_bytes'] for entry in entries),
        'preview_bytes': sum(entry['preview_bytes'] for entry in entries),
        'thumbnail_bytes': sum(entry.get('thumbnail_bytes', 0) for entry in entries),
    } for project, entries in manifest.items()}, indent=2))


if __name__ == '__main__':
    prepare()

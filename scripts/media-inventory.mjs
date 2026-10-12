import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { dirname, extname, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { projects } from '../src/portfolio.js';
import { aboutPosterPath, aboutVideoPaths } from '../src/aboutMedia.js';
import { publicAssetUrl } from '../src/publicAssetUrl.js';

const defaultPublicDir = fileURLToPath(new URL('../public/', import.meta.url));
const contentTypes = {
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.mp4': 'video/mp4',
};

// Read the same data that feeds Works, the archive ring, full-image dialogs, and Intro.
// Listing the directory itself would include obsolete photographs and video duplicates.
export function collectMediaPaths({ projectList = projects, videoPaths = aboutVideoPaths, posterPath = aboutPosterPath } = {}) {
  const paths = new Set([...videoPaths, posterPath].filter(Boolean));
  for (const project of projectList) {
    for (const value of [project.image, project.thumbnail]) if (value) paths.add(value);
    for (const image of project.gallery || []) {
      for (const value of [image.src, image.fullSrc]) if (value) paths.add(value);
    }
  }
  return [...paths].sort();
}

export async function createMediaManifest({ paths = collectMediaPaths(), publicDir = defaultPublicDir, baseUrl = '' } = {}) {
  const root = resolve(publicDir);
  const assets = [];
  for (const assetPath of [...new Set(paths)].sort()) {
    if (!/^\/(?:images|videos)\//.test(assetPath) || assetPath.split('/').includes('..') || assetPath.includes('\\')) {
      throw new Error(`Expected a local /images/ or /videos/ path: ${assetPath}`);
    }
    const filename = resolve(root, assetPath.slice(1));
    const relativePath = relative(root, filename);
    if (relativePath === '..' || relativePath.startsWith(`..${sep}`)) {
      throw new Error(`Asset path escapes the public directory: ${assetPath}`);
    }
    const info = await stat(filename);
    if (!info.isFile()) throw new Error(`Asset is not a file: ${assetPath}`);
    const contentType = contentTypes[extname(filename).toLowerCase()];
    if (!contentType) throw new Error(`Unsupported media type: ${assetPath}`);
    const hash = createHash('sha256');
    for await (const chunk of createReadStream(filename)) hash.update(chunk);
    assets.push({
      path: assetPath,
      objectKey: assetPath.slice(1),
      bytes: info.size,
      sha256: hash.digest('hex'),
      contentType,
      url: publicAssetUrl(assetPath, baseUrl),
    });
  }
  return {
    version: 1,
    totalFiles: assets.length,
    totalBytes: assets.reduce((sum, asset) => sum + asset.bytes, 0),
    assets,
  };
}

async function main(args) {
  let output;
  let baseUrl = process.env.VITE_MEDIA_BASE_URL || '';
  let json = false;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    if (argument === '--help') {
      console.log('Usage: node scripts/media-inventory.mjs [--output manifest.json] [--base-url https://host/bucket] [--json]');
      console.log('Inventories only referenced images/videos. Fonts and the favicon remain in the Vercel build.');
      return;
    }
    if (argument === '--json') { json = true; continue; }
    if (argument === '--output' || argument === '--base-url') {
      const value = args[++index];
      if (!value || value.startsWith('--')) throw new Error(`Missing value for ${argument}`);
      if (argument === '--output') output = value;
      else baseUrl = value;
      continue;
    }
    throw new Error(`Unknown argument: ${argument}`);
  }
  const manifest = await createMediaManifest({ baseUrl });
  if (output) {
    const filename = resolve(output);
    await mkdir(dirname(filename), { recursive: true });
    await writeFile(filename, `${JSON.stringify(manifest, null, 2)}\n`);
  }
  if (json) console.log(JSON.stringify(manifest, null, 2));
  else {
    if (!output) console.table(manifest.assets.map(asset => ({ path: asset.path, bytes: asset.bytes, type: asset.contentType })));
    console.log(`${manifest.totalFiles} referenced media files; ${manifest.totalBytes} bytes (${(manifest.totalBytes / 2 ** 20).toFixed(2)} MiB).${output ? ` Manifest: ${resolve(output)}` : ''}`);
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).catch(error => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

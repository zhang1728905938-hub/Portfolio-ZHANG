import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { copyFile, mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import { collectMediaPaths } from './media-inventory.mjs';

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, '').replace('T', '-');
const releaseRoot = join(projectRoot, 'release', `Portfolio-ZHANG-web-${stamp}`);
const websiteRoot = join(releaseRoot, 'website');

async function copyTree(source, destination) {
  const info = await stat(source);
  if (info.isDirectory()) {
    await mkdir(destination, { recursive: true });
    for (const entry of await readdir(source)) await copyTree(join(source, entry), join(destination, entry));
  } else {
    await mkdir(dirname(destination), { recursive: true });
    await copyFile(source, destination);
  }
}

async function inventory(directory, prefix = '') {
  const items = [];
  for (const entry of (await readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const filename = join(directory, entry.name);
    const path = `${prefix}${entry.name}`;
    if (entry.isDirectory()) items.push(...await inventory(filename, `${path}/`));
    else {
      const hash = createHash('sha256');
      for await (const chunk of createReadStream(filename)) hash.update(chunk);
      items.push({ path, bytes: (await stat(filename)).size, sha256: hash.digest('hex') });
    }
  }
  return items;
}

function run(command, args, cwd = projectRoot) {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, args, { cwd, stdio: 'inherit', windowsHide: true });
    child.on('error', reject);
    child.on('exit', code => code === 0 ? resolvePromise() : reject(new Error(`${command} exited with ${code}`)));
  });
}

async function main() {
  // Every release gets a new directory; previous releases and source media stay intact.
  await mkdir(dirname(releaseRoot), { recursive: true });
  await mkdir(releaseRoot);
  console.log(`Building self-contained website: ${releaseRoot}`);
  await build({
    root: projectRoot,
    configFile: join(projectRoot, 'vite.config.js'),
    base: './',
    define: { 'import.meta.env.VITE_MEDIA_BASE_URL': JSON.stringify('') },
    build: { outDir: websiteRoot, emptyOutDir: false, copyPublicDir: false },
  });

  const media = collectMediaPaths();
  console.log(`Copying ${media.length} referenced images and videos...`);
  for (const path of media) {
    const source = resolve(projectRoot, 'public', path.slice(1));
    const inside = relative(join(projectRoot, 'public'), source);
    if (inside.startsWith(`..${sep}`) || inside === '..') throw new Error(`Invalid asset path: ${path}`);
    await copyTree(source, join(websiteRoot, path.slice(1)));
  }
  await copyTree(join(projectRoot, 'public', 'fonts'), join(websiteRoot, 'fonts'));
  await copyFile(join(projectRoot, 'public', 'favicon.svg'), join(websiteRoot, 'favicon.svg'));
  await writeFile(join(websiteRoot, '.nojekyll'), '');
  await copyFile(join(projectRoot, 'scripts', 'release-preview-server.mjs'), join(releaseRoot, 'preview-server.mjs'));
  await copyFile(join(projectRoot, 'scripts', 'release-preview.cmd'), join(releaseRoot, '本地预览.cmd'));
  await copyFile(join(projectRoot, 'scripts', 'release-guide.txt'), join(releaseRoot, '使用说明.txt'));

  console.log('Hashing release files...');
  const files = await inventory(websiteRoot);
  const manifest = {
    name: 'Rui Zhang Portfolio',
    builtAt: new Date().toISOString(),
    entry: 'website/index.html',
    responsive: true,
    mediaFiles: media.length,
    totalFiles: files.length,
    totalBytes: files.reduce((sum, file) => sum + file.bytes, 0),
    files,
  };
  await writeFile(join(releaseRoot, 'release-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

  const zipPath = `${releaseRoot}.zip`;
  console.log('Creating ZIP archive...');
  if (process.platform === 'win32') {
    const quote = value => `'${value.replaceAll("'", "''")}'`;
    await run('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
      `$ErrorActionPreference = 'Stop'; [void][System.Reflection.Assembly]::LoadWithPartialName('System.IO.Compression.FileSystem'); [System.IO.Compression.ZipFile]::CreateFromDirectory(${quote(releaseRoot)}, ${quote(zipPath)}, [System.IO.Compression.CompressionLevel]::Fastest, $true)`]);
  } else {
    await run('zip', ['-q', '-r', '-1', zipPath, relative(dirname(releaseRoot), releaseRoot)], dirname(releaseRoot));
  }
  console.log(JSON.stringify({ releaseRoot, websiteRoot, zipPath, totalFiles: files.length, totalBytes: manifest.totalBytes }, null, 2));
}

main().catch(error => { console.error(error); process.exitCode = 1; });

import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { projects } from '../src/portfolio.js';
import { aboutPosterPath, aboutVideoPaths } from '../src/aboutMedia.js';
import { collectMediaPaths, createMediaManifest } from '../scripts/media-inventory.mjs';

test('deployment inventory covers every runtime gallery, original, ring cover, and current film without legacy media', () => {
  const paths = collectMediaPaths();
  assert.equal(paths.length, new Set(paths).size);
  for (const project of projects) {
    for (const path of [project.image, project.thumbnail, ...project.gallery.flatMap(image => [image.src, image.fullSrc])]) {
      assert.ok(paths.includes(path), `Deployment would omit ${path}`);
    }
  }
  assert.deepEqual(paths.filter(path => path.endsWith('.mp4')), aboutVideoPaths);
  assert.ok(paths.includes(aboutPosterPath));
  assert.ok(!paths.includes('/videos/about-04.mp4'));
  assert.ok(!paths.includes('/images/sculpted-light.jpg'));
});

test('manifest hashes file bytes, deduplicates paths, creates Storage URLs, and fails on missing or escaping paths', async t => {
  const temporaryRoot = resolve(tmpdir());
  const directory = await mkdtemp(join(temporaryRoot, 'portfolio-media-test-'));
  t.after(async () => {
    assert.equal(dirname(resolve(directory)), temporaryRoot);
    await rm(directory, { recursive: true, force: true });
  });
  await mkdir(join(directory, 'images'));
  await writeFile(join(directory, 'images', 'sample.webp'), 'abc');
  const manifest = await createMediaManifest({
    publicDir: directory,
    paths: ['/images/sample.webp', '/images/sample.webp'],
    baseUrl: 'https://media.example.test/bucket/',
  });
  assert.equal(manifest.totalFiles, 1);
  assert.equal(manifest.totalBytes, 3);
  assert.deepEqual(manifest.assets[0], {
    path: '/images/sample.webp',
    objectKey: 'images/sample.webp',
    bytes: 3,
    sha256: 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    contentType: 'image/webp',
    url: 'https://media.example.test/bucket/images/sample.webp',
  });
  await assert.rejects(createMediaManifest({ publicDir: directory, paths: ['/images/missing.webp'] }), { code: 'ENOENT' });
  await assert.rejects(createMediaManifest({ publicDir: directory, paths: ['/images/../../outside.webp'] }), /Expected a local/);
});

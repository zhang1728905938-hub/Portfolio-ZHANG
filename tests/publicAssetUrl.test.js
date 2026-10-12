import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { publicAssetUrl, resolveProjectMedia } from '../src/publicAssetUrl.js';
import { aboutPosterPath, aboutVideoPaths } from '../src/aboutMedia.js';

const storageBase = 'https://media.example.test/storage/v1/object/public/portfolio';

test('local preview keeps its existing paths when no media base is configured', () => {
  for (const path of ['/images/work-project-01-01.webp', '/videos/about-01.mp4']) {
    assert.equal(publicAssetUrl(path), path);
    assert.equal(publicAssetUrl(path, '  '), path);
  }
});

test('Storage paths retain folders and video suffixes without touching local app assets or external URLs', () => {
  assert.equal(publicAssetUrl('/images/work-project-01-01.webp', ` ${storageBase}/// `), `${storageBase}/images/work-project-01-01.webp`);
  for (const path of [...aboutVideoPaths, aboutPosterPath]) {
    const url = publicAssetUrl(path, storageBase);
    assert.equal(url, `${storageBase}${path}`);
    assert.ok(url.endsWith(path), 'Video-specific CSS suffix selectors must still match');
  }
  for (const path of ['/fonts/fonts.css', '/favicon.svg', 'https://external.example.test/photo.jpg', '//external.example.test/photo.jpg', undefined]) {
    assert.equal(publicAssetUrl(path, storageBase), path);
  }
});

test('one relative-base release resolves media at the domain root or a subfolder, with external Storage still taking precedence', () => {
  for (const path of ['/images/work-project-01-01.webp', '/images/work-project-01-01.jpg', ...aboutVideoPaths, aboutPosterPath]) {
    const relativeUrl = publicAssetUrl(path, '', './');
    assert.equal(relativeUrl, `.${path}`);
    assert.equal(new URL(relativeUrl, 'https://portfolio.example.test/').pathname, path);
    assert.equal(new URL(relativeUrl, 'https://portfolio.example.test/Portfolio-ZHANG/').pathname, `/Portfolio-ZHANG${path}`);
    assert.equal(new URL(relativeUrl, 'https://portfolio.example.test/Portfolio-ZHANG/index.html').pathname, `/Portfolio-ZHANG${path}`);
    assert.equal(publicAssetUrl(path, '', '/Portfolio-ZHANG/'), `/Portfolio-ZHANG${path}`);
    assert.equal(publicAssetUrl(path, '', ''), `.${path}`);
    assert.equal(publicAssetUrl(path, storageBase, './'), `${storageBase}${path}`);
  }
});

test('a project resolves covers, thumbnails, preview images, and full originals together without mutating shared metadata', () => {
  const original = Object.freeze({
    id: 'example',
    image: '/images/cover.webp',
    thumbnail: '/images/cover-sm.webp',
    gallery: Object.freeze([Object.freeze({ number: '01', src: '/images/cover.webp', fullSrc: '/images/original.png', width: 2400, height: 2400 })]),
  });
  const project = resolveProjectMedia(original, storageBase);
  assert.equal(project.image, project.gallery[0].src);
  assert.equal(project.thumbnail, `${storageBase}/images/cover-sm.webp`);
  assert.equal(project.gallery[0].fullSrc, `${storageBase}/images/original.png`);
  assert.equal(project.gallery[0].width, 2400);
  assert.equal(project.gallery[0].number, '01');
  assert.equal(original.image, '/images/cover.webp');
  assert.equal(original.gallery[0].fullSrc, '/images/original.png');
  assert.deepEqual(resolveProjectMedia(original), original);
  const portableProject = resolveProjectMedia(original, '', './');
  assert.equal(portableProject.image, './images/cover.webp');
  assert.equal(portableProject.image, portableProject.gallery[0].src);
  assert.equal(portableProject.thumbnail, './images/cover-sm.webp');
  assert.equal(portableProject.gallery[0].fullSrc, './images/original.png');
});

test('the public font stylesheet resolves all fonts beside itself when mounted in a subfolder', () => {
  const stylesheet = new URL('../public/fonts/fonts.css', import.meta.url);
  const fontPaths = [...readFileSync(stylesheet, 'utf8').matchAll(/src:\s*url\(([^)]+)\)/g)].map(match => match[1]);
  assert.ok(fontPaths.length > 0);
  for (const path of fontPaths) {
    assert.match(path, /^\.\/[a-z0-9-]+\.ttf$/);
    assert.ok(existsSync(new URL(path, stylesheet)), `Missing local font: ${path}`);
    assert.equal(new URL(path, 'https://portfolio.example.test/Portfolio-ZHANG/fonts/fonts.css').pathname, `/Portfolio-ZHANG/fonts/${path.slice(2)}`);
  }
});

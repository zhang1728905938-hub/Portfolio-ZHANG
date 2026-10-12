import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { mkdtemp, mkdir, writeFile, copyFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { fileURLToPath } from 'node:url';
import { createPreviewServer, normalizeBasePath, parseByteRange } from '../scripts/release-preview-server.mjs';

let temporary;
let website;
let server;
let port;
const media = Buffer.from(Array.from({ length: 1024 }, (_, index) => index % 256));

function request(requestPath, { method = 'GET', headers = {}, requestPort = port } = {}) {
  return new Promise((resolve, reject) => {
    const outgoing = http.request({ host: '127.0.0.1', port: requestPort, path: requestPath, method, headers }, response => {
      const chunks = [];
      response.on('data', chunk => chunks.push(chunk));
      response.on('end', () => resolve({ status: response.statusCode, headers: response.headers, body: Buffer.concat(chunks) }));
      response.on('error', reject);
    });
    outgoing.on('error', reject);
    outgoing.end();
  });
}

before(async () => {
  temporary = await mkdtemp(path.join(tmpdir(), 'portfolio-release-preview-'));
  website = path.join(temporary, 'website');
  await mkdir(path.join(website, 'videos'), { recursive: true });
  await mkdir(path.join(website, 'assets'));
  await mkdir(path.join(website, 'empty-directory'));
  await mkdir(path.join(website, 'nested'));
  await writeFile(path.join(website, 'index.html'), '<!doctype html><title>Portfolio release</title>');
  await writeFile(path.join(website, 'nested', 'index.html'), '<p>Nested index</p>');
  await writeFile(path.join(website, 'assets', 'main.js'), 'export const ready = true;');
  await writeFile(path.join(website, 'assets', 'hello world.txt'), 'A file with spaces.');
  await writeFile(path.join(website, 'videos', 'clip.mp4'), media);
  await writeFile(path.join(website, 'videos', 'empty.mp4'), Buffer.alloc(0));
  await writeFile(path.join(website, '.private'), 'not public');
  await writeFile(path.join(temporary, 'outside.txt'), 'outside website');
  server = await createPreviewServer({ root: website, basePath: '/Portfolio-ZHANG/' });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  port = server.address().port;
});

after(async () => {
  if (server) {
    const closed = new Promise(resolve => server.close(resolve));
    server.closeAllConnections();
    await closed;
  }
  if (temporary) await rm(temporary, { recursive: true, force: true });
});

test('strict mount redirects root and serves only the mounted website', async () => {
  for (const requestPath of ['/', '/Portfolio-ZHANG']) {
    const response = await request(requestPath);
    assert.equal(response.status, 308);
    assert.equal(response.headers.location, '/Portfolio-ZHANG/');
  }
  const index = await request('/Portfolio-ZHANG/');
  assert.equal(index.status, 200);
  assert.match(index.headers['content-type'], /^text\/html/);
  assert.match(index.body.toString(), /Portfolio release/);
  for (const requestPath of ['/videos/clip.mp4', '/assets/main.js', '/Portfolio-ZHANG-not/videos/clip.mp4']) {
    assert.equal((await request(requestPath)).status, 404);
  }
});

test('serves complete media and HEAD with exact MIME and length', async () => {
  const response = await request('/Portfolio-ZHANG/videos/clip.mp4');
  assert.equal(response.status, 200);
  assert.equal(response.headers['content-type'], 'video/mp4');
  assert.equal(response.headers['content-length'], '1024');
  assert.equal(response.headers['accept-ranges'], 'bytes');
  assert.deepEqual(response.body, media);
  const head = await request('/Portfolio-ZHANG/videos/clip.mp4', { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(head.headers['content-length'], '1024');
  assert.equal(head.body.length, 0);
});

test('serves explicit, open, suffix, and bounded byte ranges', async () => {
  const cases = [
    ['bytes=10-19', 10, 19], ['bytes=1000-', 1000, 1023],
    ['bytes=-12', 1012, 1023], ['bytes=1010-9999', 1010, 1023],
    ['bytes=-9999', 0, 1023], ['bytes=0-0', 0, 0],
  ];
  for (const [range, start, end] of cases) {
    const response = await request('/Portfolio-ZHANG/videos/clip.mp4', { headers: { Range: range } });
    assert.equal(response.status, 206, range);
    assert.equal(response.headers['content-range'], `bytes ${start}-${end}/1024`, range);
    assert.equal(response.headers['content-length'], String(end - start + 1), range);
    assert.deepEqual(response.body, media.subarray(start, end + 1), range);
  }
  const head = await request('/Portfolio-ZHANG/videos/clip.mp4', { method: 'HEAD', headers: { Range: 'bytes=20-29' } });
  assert.equal(head.status, 206);
  assert.equal(head.headers['content-range'], 'bytes 20-29/1024');
  assert.equal(head.headers['content-length'], '10');
  assert.equal(head.body.length, 0);
});

test('rejects invalid or unsatisfiable ranges without leaking the whole media', async () => {
  for (const range of ['bytes=1024-', 'bytes=30-20', 'bytes=-0', 'bytes=-', 'bytes=0-1,8-9', 'items=0-9', 'bytes=9007199254740993-']) {
    const response = await request('/Portfolio-ZHANG/videos/clip.mp4', { headers: { Range: range } });
    assert.equal(response.status, 416, range);
    assert.equal(response.headers['content-range'], 'bytes */1024', range);
    assert.notDeepEqual(response.body, media, range);
  }
  assert.equal((await request('/Portfolio-ZHANG/videos/empty.mp4')).body.length, 0);
  const emptyRange = await request('/Portfolio-ZHANG/videos/empty.mp4', { headers: { Range: 'bytes=0-' } });
  assert.equal(emptyRange.status, 416);
  assert.equal(emptyRange.headers['content-range'], 'bytes */0');
});

test('handles encoded filenames and directory indexes, but never lists directories', async () => {
  assert.equal((await request('/Portfolio-ZHANG/assets/hello%20world.txt?download=1')).body.toString(), 'A file with spaces.');
  const script = await request('/Portfolio-ZHANG/assets/main.js');
  assert.match(script.headers['content-type'], /^text\/javascript/);
  const nested = await request('/Portfolio-ZHANG/nested?x=1');
  assert.equal(nested.status, 308);
  assert.equal(nested.headers.location, '/Portfolio-ZHANG/nested/?x=1');
  assert.equal((await request('/Portfolio-ZHANG/nested/')).status, 200);
  assert.equal((await request('/Portfolio-ZHANG/empty-directory/')).status, 404);
  assert.equal((await request('/Portfolio-ZHANG/not-a-client-route')).status, 404);
});

test('rejects traversal, malformed paths, hidden files, and write methods', async () => {
  for (const requestPath of ['/Portfolio-ZHANG/../outside.txt', '/Portfolio-ZHANG/%2e%2e/outside.txt', '/Portfolio-ZHANG/%2e%2e%2foutside.txt']) {
    assert.equal((await request(requestPath)).status, 403, requestPath);
  }
  for (const requestPath of ['/Portfolio-ZHANG/%ZZ', '/Portfolio-ZHANG/%00', '/Portfolio-ZHANG/%5c..%5coutside.txt']) {
    assert.equal((await request(requestPath)).status, 400, requestPath);
  }
  assert.equal((await request('/Portfolio-ZHANG/.private')).status, 404);
  const upload = await request('/Portfolio-ZHANG/assets/upload.txt', { method: 'POST' });
  assert.equal(upload.status, 405);
  assert.equal(upload.headers.allow, 'GET, HEAD');
  assert.equal((await request('/Portfolio-ZHANG/assets/upload.txt')).status, 404);
});

test('does not follow a directory symlink outside the website', async t => {
  const link = path.join(website, 'external-link');
  try { await symlink(temporary, link, process.platform === 'win32' ? 'junction' : 'dir'); }
  catch (error) {
    if (error.code === 'EPERM' || error.code === 'EACCES') { t.skip('Creating a test symlink is not permitted.'); return; }
    throw error;
  }
  assert.equal((await request('/Portfolio-ZHANG/external-link/outside.txt')).status, 403);
});

test('validates mount paths and integer range boundaries', () => {
  assert.equal(normalizeBasePath('/Portfolio-ZHANG'), '/Portfolio-ZHANG/');
  assert.equal(normalizeBasePath('/'), '/');
  for (const value of ['relative', '//host/path', '/a/../', '/a?b', '/a\\b', '/%00/']) {
    assert.throws(() => normalizeBasePath(value));
  }
  assert.deepEqual(parseByteRange('bytes=0-1000', 3), { start: 0, end: 2 });
  assert.equal(parseByteRange('bytes=NaN-', 3), null);
});

test('copied CLI template reports occupied ports and invalid options clearly', async () => {
  const script = path.join(temporary, 'preview-server.mjs');
  await copyFile(fileURLToPath(new URL('../scripts/release-preview-server.mjs', import.meta.url)), script);
  const run = args => new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script, ...args], { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let output = '';
    child.stdout.on('data', chunk => { output += chunk; });
    child.stderr.on('data', chunk => { output += chunk; });
    child.on('error', reject);
    child.on('close', code => resolve({ code, output }));
  });
  const occupied = await run(['--port', String(port)]);
  assert.equal(occupied.code, 1);
  assert.match(occupied.output, /already in use/);
  assert.match(occupied.output, /--port/);
  const invalid = await run(['--port', '-1']);
  assert.equal(invalid.code, 1);
  assert.match(invalid.output, /0 to 65535/);
});

test('copied CLI serves its adjacent website and prints localhost/LAN URLs with the strict mount', async () => {
  const script = path.join(temporary, 'preview-server.mjs');
  await copyFile(fileURLToPath(new URL('../scripts/release-preview-server.mjs', import.meta.url)), script);
  const child = spawn(process.execPath, [script, '--port=0', '--host=0.0.0.0', '--base-path=/Portfolio-ZHANG/'], {
    windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
  });
  const closed = once(child, 'close');
  let output = '';
  try {
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error(`Preview CLI did not start: ${output}`)), 10000);
      const failed = error => { clearTimeout(timeout); reject(error); };
      child.once('error', failed);
      child.once('exit', code => failed(new Error(`Preview CLI exited early (${code}): ${output}`)));
      child.stdout.on('data', chunk => {
        output += chunk;
        if (output.includes('Press Ctrl+C to stop.')) { clearTimeout(timeout); resolve(); }
      });
      child.stderr.on('data', chunk => { output += chunk; });
    });
    const address = /Local: http:\/\/localhost:(\d+)\/Portfolio-ZHANG\//.exec(output);
    assert.ok(address, output);
    assert.match(output, /LAN: /);
    const requestPort = Number(address[1]);
    const index = await request('/Portfolio-ZHANG/', { requestPort });
    assert.equal(index.status, 200);
    assert.match(index.body.toString(), /Portfolio release/);
    assert.equal((await request('/assets/main.js', { requestPort })).status, 404);
    assert.equal((await request('/', { requestPort })).headers.location, '/Portfolio-ZHANG/');
  } finally {
    child.kill('SIGTERM');
    await closed;
  }
});

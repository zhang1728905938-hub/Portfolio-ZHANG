import http from 'node:http';
import { open, realpath, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { networkInterfaces } from 'node:os';
import { isIP } from 'node:net';
import { pipeline } from 'node:stream';

const DEFAULT_ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'website');
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png',
  '.webp': 'image/webp', '.avif': 'image/avif', '.gif': 'image/gif', '.ico': 'image/x-icon',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime',
  '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.wav': 'audio/wav', '.ogg': 'audio/ogg',
  '.woff': 'font/woff', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.otf': 'font/otf',
  '.pdf': 'application/pdf', '.wasm': 'application/wasm',
  '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8',
};

export function normalizeBasePath(value = '/') {
  let decoded;
  try { decoded = decodeURIComponent(value); } catch { throw new Error('Invalid --base-path encoding.'); }
  if (!decoded.startsWith('/') || /[\\?#\u0000-\u001f\u007f]/.test(decoded)
      || decoded.includes('//') || decoded.split('/').some(part => part === '.' || part === '..')) {
    throw new Error('--base-path must be an absolute URL path, for example /Portfolio-ZHANG/.');
  }
  return decoded.endsWith('/') ? decoded : `${decoded}/`;
}

export function parseByteRange(value, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(value.trim());
  if (!match || size === 0 || (!match[1] && !match[2])) return null;
  const first = match[1] ? Number(match[1]) : null;
  const last = match[2] ? Number(match[2]) : null;
  if ((first !== null && !Number.isSafeInteger(first)) || (last !== null && !Number.isSafeInteger(last))) return null;
  if (first === null) {
    if (last <= 0) return null;
    return { start: Math.max(0, size - last), end: size - 1 };
  }
  if (first >= size || (last !== null && last < first)) return null;
  return { start: first, end: Math.min(last ?? size - 1, size - 1) };
}

function withinRoot(root, candidate) {
  const relative = path.relative(root, candidate);
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
}

function encodePath(value) {
  return value.split('/').map(encodeURIComponent).join('/');
}

function message(request, response, status, text, headers = {}) {
  const body = `${text}\n`;
  response.writeHead(status, {
    'Content-Type': 'text/plain; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'X-Content-Type-Options': 'nosniff',
    ...headers,
  });
  response.end(request.method === 'HEAD' ? undefined : body);
}

export async function createPreviewServer({ root = DEFAULT_ROOT, basePath = '/' } = {}) {
  const base = normalizeBasePath(basePath);
  const realRoot = await realpath(root);
  if (!(await stat(realRoot)).isDirectory()) throw new Error(`Website root is not a directory: ${root}`);

  async function serve(request, response) {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      request.resume();
      message(request, response, 405, 'Method not allowed.', { Allow: 'GET, HEAD' });
      return;
    }

    const queryIndex = request.url.indexOf('?');
    const rawPath = queryIndex < 0 ? request.url : request.url.slice(0, queryIndex);
    const query = queryIndex < 0 ? '' : request.url.slice(queryIndex);
    let pathname;
    try { pathname = decodeURIComponent(rawPath); } catch {
      message(request, response, 400, 'Invalid URL encoding.');
      return;
    }
    if (!pathname.startsWith('/') || pathname.startsWith('//') || /[\\\u0000-\u001f\u007f]/.test(pathname)) {
      message(request, response, 400, 'Invalid request path.');
      return;
    }
    if (pathname.split('/').some(part => part === '..' || part === '.')) {
      message(request, response, 403, 'Path is outside the website.');
      return;
    }

    if (base !== '/' && (pathname === '/' || pathname === base.slice(0, -1))) {
      response.writeHead(308, { Location: `${encodePath(base)}${query}`, 'Content-Length': '0' });
      response.end();
      return;
    }
    if (!pathname.startsWith(base)) {
      message(request, response, 404, 'Not found.');
      return;
    }
    const relative = pathname.slice(base.length);
    if (relative.split('/').some(part => part.startsWith('.'))) {
      message(request, response, 404, 'Not found.');
      return;
    }
    const candidate = path.resolve(realRoot, relative);
    if (!withinRoot(realRoot, candidate)) {
      message(request, response, 403, 'Path is outside the website.');
      return;
    }

    let resolved = await realpath(candidate);
    if (!withinRoot(realRoot, resolved)) {
      message(request, response, 403, 'Path is outside the website.');
      return;
    }
    if ((await stat(resolved)).isDirectory()) {
      resolved = await realpath(path.join(resolved, 'index.html'));
      if (!withinRoot(realRoot, resolved)) {
        message(request, response, 403, 'Path is outside the website.');
        return;
      }
      if (!pathname.endsWith('/')) {
        response.writeHead(308, { Location: `${encodePath(pathname)}/${query}`, 'Content-Length': '0' });
        response.end();
        return;
      }
    }

    let file;
    try {
      file = await open(resolved, 'r');
      const details = await file.stat();
      if (!details.isFile()) {
        message(request, response, 404, 'Not found.');
        return;
      }
      const range = request.headers.range === undefined ? undefined : parseByteRange(request.headers.range, details.size);
      if (range === null) {
        message(request, response, 416, 'Requested range is not satisfiable.', {
          'Content-Range': `bytes */${details.size}`,
          'Accept-Ranges': 'bytes',
        });
        return;
      }
      const headers = {
        'Content-Type': MIME_TYPES[path.extname(resolved).toLowerCase()] ?? 'application/octet-stream',
        'Content-Length': range ? range.end - range.start + 1 : details.size,
        'Accept-Ranges': 'bytes',
        'Last-Modified': details.mtime.toUTCString(),
        'Cache-Control': 'no-cache',
        'X-Content-Type-Options': 'nosniff',
      };
      if (range) headers['Content-Range'] = `bytes ${range.start}-${range.end}/${details.size}`;
      response.writeHead(range ? 206 : 200, headers);
      if (request.method === 'HEAD' || details.size === 0) {
        response.end();
        return;
      }
      const stream = file.createReadStream(range ?? {});
      file = null; // The stream owns and closes this handle, including on disconnect.
      pipeline(stream, response, error => { if (error && !response.destroyed) response.destroy(error); });
    } finally {
      await file?.close();
    }
  }

  return http.createServer((request, response) => {
    serve(request, response).catch(error => {
      if (response.headersSent) { response.destroy(error); return; }
      if (error.code === 'ENOENT' || error.code === 'ENOTDIR') message(request, response, 404, 'Not found.');
      else if (error.code === 'EACCES' || error.code === 'EPERM') message(request, response, 403, 'Access denied.');
      else {
        console.error(`Preview request failed: ${error.message}`);
        message(request, response, 500, 'Unable to read this file.');
      }
    });
  });
}

function parseArguments(args) {
  const options = { port: 4173, host: '127.0.0.1', basePath: '/' };
  for (let index = 0; index < args.length; index += 1) {
    const [name, inline] = args[index].split(/=(.*)/s);
    if (name === '--help' || name === '-h') return { help: true };
    if (!['--port', '--host', '--base-path'].includes(name)) throw new Error(`Unknown option: ${name}`);
    const value = inline ?? args[++index];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${name}.`);
    if (name === '--port') {
      if (!/^\d+$/.test(value) || Number(value) > 65535) throw new Error('--port must be an integer from 0 to 65535.');
      options.port = Number(value);
    } else if (name === '--host') {
      if (value !== 'localhost' && !isIP(value)) throw new Error('--host must be an IP address or localhost.');
      options.host = value;
    } else options.basePath = normalizeBasePath(value);
  }
  return options;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    console.log('Usage: node preview-server.mjs [--port 4173] [--host 127.0.0.1] [--base-path /]');
    console.log('Serves the website folder next to this script. Use --host 0.0.0.0 for phone/LAN preview.');
    return;
  }
  let server;
  try { server = await createPreviewServer(options); } catch (error) {
    if (error.code === 'ENOENT') throw new Error(`Website folder is missing. Place this script next to a website folder: ${DEFAULT_ROOT}`);
    throw error;
  }
  server.on('error', error => {
    if (error.code === 'EADDRINUSE') console.error(`Port ${options.port} is already in use. Choose another port with --port ${options.port === 65535 ? 4173 : options.port + 1}.`);
    else console.error(`Cannot start preview: ${error.message}`);
    process.exitCode = 1;
  });
  server.listen(options.port, options.host, () => {
    const port = server.address().port;
    const base = encodePath(normalizeBasePath(options.basePath));
    const host = options.host === '0.0.0.0' || options.host === '::' ? 'localhost' : options.host;
    const urlHost = isIP(host) === 6 ? `[${host}]` : host;
    console.log(`Local: http://${urlHost}:${port}${base}`);
    if (options.host === '0.0.0.0' || options.host === '::') {
      const addresses = new Set(Object.values(networkInterfaces()).flat().filter(entry => entry && !entry.internal && entry.family === 'IPv4').map(entry => entry.address));
      for (const address of addresses) console.log(`LAN:   http://${address}:${port}${base}`);
      if (addresses.size === 0) console.log('LAN: no active IPv4 network address found.');
    }
    console.log('Press Ctrl+C to stop.');
  });
  const stop = () => {
    server.close(() => { process.exitCode = 0; });
    server.closeAllConnections();
  };
  process.once('SIGINT', stop);
  process.once('SIGTERM', stop);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(`Cannot start preview: ${error.message}`); process.exitCode = 1; });
}

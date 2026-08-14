// SERVE THE GARDEN. A tiny static server for the demo scene: the vendored
// three.js under /vendor/, the grown GLBs under /export/, and demo/ itself at
// the root. No dependencies, `node:http` only.
//
//   node demo/serve.mjs           # http://localhost:8460
//   PORT=0 node demo/serve.mjs    # ephemeral port, printed
//
// The vendor step is COPIED from tools/gltf_shot.mjs on purpose, same argument
// as the stand-in App in blender_export.mjs: this file and that tool must both
// be runnable alone, and a shared helper would couple a verified gate to a
// demo that will keep changing. curl rather than fetch, because Node's fetch
// ignores HTTPS_PROXY and curl reads it.

import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join, extname, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
export const THREE_VERSION = process.env.THREE_VERSION || '0.161.0';
const CDN = process.env.THREE_CDN || `https://unpkg.com/three@${THREE_VERSION}`;
const CACHE = join(ROOT, 'tools', '.cache', `three-${THREE_VERSION}`);

const VENDOR = [
  'build/three.module.js',
  'examples/jsm/loaders/GLTFLoader.js',
  'examples/jsm/utils/BufferGeometryUtils.js',
];

export function vendorThree() {
  for (const rel of VENDOR) {
    const dst = join(CACHE, rel);
    if (existsSync(dst)) continue;
    mkdirSync(join(dst, '..'), { recursive: true });
    const r = spawnSync('curl', ['-sSfL', `${CDN}/${rel}`, '-o', dst], { stdio: 'inherit' });
    if (r.status !== 0) {
      console.error(`could not vendor ${rel} from ${CDN}`);
      process.exit(1);
    }
  }
  return CACHE;
}

const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.glb': 'model/gltf-binary', '.json': 'application/json', '.css': 'text/css',
  '.png': 'image/png',
};

export function serve(port = +(process.env.PORT ?? 8460)) {
  vendorThree();
  const srv = createServer((req, res) => {
    const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file;
    if (url === '/' || url === '/index.html') file = join(ROOT, 'demo', 'index.html');
    else if (url.startsWith('/vendor/')) file = join(CACHE, url.slice(8));
    else if (url.startsWith('/export/')) file = join(ROOT, 'export', url.slice(8));
    else file = join(ROOT, 'demo', url);
    // stay inside the repo — a static server that follows `..` is a gift
    if (!normalize(file).startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
    try {
      const body = readFileSync(file);
      res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404); res.end('not found: ' + url);
    }
  });
  return new Promise((ok) => srv.listen(port, '127.0.0.1', () => ok({ srv, port: srv.address().port })));
}

// run directly = serve and stay up; imported (by demo/shot.mjs) = library
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { port } = await serve();
  console.log(`serving the garden at http://localhost:${port}`);
}

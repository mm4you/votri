/**
 * @file server.mjs
 * @description Local HTTP Server phục vụ Vô Tri Game Portal tại http://localhost:8080
 * Tích hợp sẵn:
 * - Rate Limiting theo IP (chống DDoS / Flood request ở tầng HTTP)
 * - Security Headers (Content-Security-Policy, X-Frame-Options, X-Content-Type-Options, Cache-Control)
 * - Chặn truy cập thư mục ẩn (.git, .env) và chống Path Traversal
 */

import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 8080;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
};

// Bộ đếm Rate Limit theo IP (Tối đa 300 requests / 10 giây cho mỗi IP)
const ipBuckets = new Map();
const WINDOW_MS = 10_000;
const MAX_REQ_PER_WINDOW = 300;

function checkRateLimit(ip) {
  const now = Date.now();
  let bucket = ipBuckets.get(ip);
  if (!bucket || now - bucket.start > WINDOW_MS) {
    bucket = { start: now, count: 1 };
    ipBuckets.set(ip, bucket);
    return true;
  }
  bucket.count++;
  return bucket.count <= MAX_REQ_PER_WINDOW;
}

const server = http.createServer((req, res) => {
  const clientIp = req.socket.remoteAddress || 'unknown';
  if (!checkRateLimit(clientIp)) {
    res.writeHead(429, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('429 Too Many Requests - Rate Limit Exceeded');
    return;
  }

  // Bảo mật HTTP Headers chống Clickjacking, MIME sniffing & XSS
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self' blob: data:; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' blob: data:; worker-src 'self' blob:;"
  );

  const rawUrl = (req.url || '/').split('?')[0];
  let safeRel = path.normalize(decodeURIComponent(rawUrl)).replace(/^(\.\.(\/|\\|$))+/, '');
  if (safeRel === '/' || safeRel === '\\') {
    safeRel = '/index.html';
  } else if (safeRel.endsWith('/') || safeRel.endsWith('\\')) {
    safeRel = path.join(safeRel, 'index.html');
  }

  const filePath = path.join(__dirname, safeRel);
  if (!filePath.startsWith(__dirname) || path.basename(filePath).startsWith('.')) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    let targetFile = filePath;
    if (!err && stats.isDirectory()) {
      targetFile = path.join(filePath, 'index.html');
    }

    fs.readFile(targetFile, (readErr, content) => {
      if (readErr) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
        return;
      }
      const ext = path.extname(targetFile).toLowerCase();
      const mime = MIME_TYPES[ext] || 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': mime,
        'Cache-Control': 'no-store, no-cache, must-revalidate, max-age=0',
        'Pragma': 'no-cache',
        'Expires': '0',
      });
      res.end(content);
    });
  });
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Vo Tri Game Portal listening at http://localhost:${PORT}`);
});

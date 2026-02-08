// Simple HTTP server for Afterburn stress-test site — zero dependencies
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3847;
const PUBLIC = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // --- Intentional 500 route ---
  if (pathname === '/api/data') {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal Server Error' }));
    return;
  }

  // --- Intentional broken form endpoint (does nothing) ---
  if (pathname === '/api/signup' && req.method === 'POST') {
    // Intentionally hangs — never sends response body properly
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // Map routes to files
  let filePath;
  if (pathname === '/' || pathname === '/index.html') {
    filePath = path.join(PUBLIC, 'index.html');
  } else if (pathname === '/contact' || pathname === '/contact.html') {
    filePath = path.join(PUBLIC, 'contact.html');
  } else if (pathname === '/pricing' || pathname === '/pricing.html') {
    filePath = path.join(PUBLIC, 'pricing.html');
  } else {
    filePath = path.join(PUBLIC, pathname);
  }

  // Prevent directory traversal
  if (!filePath.startsWith(PUBLIC)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end(`<!DOCTYPE html><html><head><title>404</title></head><body style="font-family:sans-serif;text-align:center;padding:80px"><h1>404 — Page Not Found</h1><p>The page you're looking for doesn't exist.</p><a href="/">Go Home</a></body></html>`);
      return;
    }
    const ext = path.extname(filePath);
    const mime = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Afterburn test site running at http://localhost:${PORT}`);
});

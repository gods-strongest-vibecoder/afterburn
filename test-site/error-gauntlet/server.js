// Error Gauntlet test server — a realistic SaaS site with planted web errors for Afterburn testing
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3850;
const PUBLIC = path.join(__dirname, 'public');

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.bmp': 'image/bmp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json',
  '.webp': 'image/webp',
};

// Route map: clean URLs to HTML files
const ROUTES = {
  '/': 'index.html',
  '/index.html': 'index.html',
  '/about': 'about.html',
  '/about.html': 'about.html',
  '/pricing': 'pricing.html',
  '/pricing.html': 'pricing.html',
  '/blog': 'blog.html',
  '/blog.html': 'blog.html',
  '/contact': 'contact.html',
  '/contact.html': 'contact.html',
  '/dashboard': 'dashboard.html',
  '/dashboard.html': 'dashboard.html',
  '/login': 'login.html',
  '/login.html': 'login.html',
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;

  // Intentional: NO security headers (X-Frame-Options, CSP, etc.)
  // Intentional: NO CORS headers

  // Broken API endpoint — returns 500
  if (pathname === '/api/subscribe' && req.method === 'POST') {
    res.writeHead(500, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Internal Server Error' }));
    return;
  }

  // Working-ish API endpoint (for contact form)
  if (pathname === '/api/contact' && req.method === 'POST') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // Route lookup
  let filePath;
  if (ROUTES[pathname]) {
    filePath = path.join(PUBLIC, ROUTES[pathname]);
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
      res.end(`<!DOCTYPE html><html><head><title>404</title></head><body style="font-family:sans-serif;text-align:center;padding:80px"><h1>404 — Page Not Found</h1><p>The page you requested doesn't exist.</p><a href="/">Go Home</a></body></html>`);
      return;
    }
    const ext = path.extname(filePath);
    const mime = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`Error Gauntlet running at http://localhost:${PORT}`);
});

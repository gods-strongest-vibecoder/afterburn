// Fixed version of FlowSync test site — all 23 defects resolved for demo before/after comparison
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3848;
const PUBLIC = path.join(__dirname, 'public-fixed');

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

  // Fixed: /api/data returns 200 with FAQ content
  if (pathname === '/api/data') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      html: '<div class="faq-list"><div class="faq-item"><h3>Can I cancel anytime?</h3><p>Yes, cancel with one click. No lock-in contracts.</p></div><div class="faq-item"><h3>Is there a free trial?</h3><p>Yes — 14 days free on the Pro plan. No credit card needed.</p></div><div class="faq-item"><h3>Do you offer team discounts?</h3><p>Yes, teams of 10+ get 20% off. Contact sales for details.</p></div></div>'
    }));
    return;
  }

  // Fixed: /api/signup returns success
  if (pathname === '/api/signup' && req.method === 'POST') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, message: 'Signup successful' }));
    return;
  }

  // Map routes to files — including /about and /blog (previously 404)
  let filePath;
  if (pathname === '/' || pathname === '/index.html') {
    filePath = path.join(PUBLIC, 'index.html');
  } else if (pathname === '/contact' || pathname === '/contact.html') {
    filePath = path.join(PUBLIC, 'contact.html');
  } else if (pathname === '/pricing' || pathname === '/pricing.html') {
    filePath = path.join(PUBLIC, 'pricing.html');
  } else if (pathname === '/about' || pathname === '/about.html') {
    filePath = path.join(PUBLIC, 'about.html');
  } else if (pathname === '/blog' || pathname === '/blog.html') {
    filePath = path.join(PUBLIC, 'blog.html');
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
      res.end('<!DOCTYPE html><html lang="en"><head><title>404</title></head><body style="font-family:sans-serif;text-align:center;padding:80px"><h1>404</h1><p>Page not found.</p><a href="/">Go Home</a></body></html>');
      return;
    }
    const ext = path.extname(filePath);
    const mime = MIME[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  });
});

server.listen(PORT, () => {
  console.log(`FlowSync (FIXED) running at http://localhost:${PORT}`);
});

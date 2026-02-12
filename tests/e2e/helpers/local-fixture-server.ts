import http from 'node:http';

export interface FixtureServer {
  baseUrl: string;
  close: () => Promise<void>;
}

function renderHomePage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Afterburn Fixture Home</title>
  </head>
  <body>
    <h1>Afterburn Fixture</h1>
    <nav>
      <a href="/contact">Contact</a>
      <a href="/pricing">Pricing</a>
    </nav>

    <form id="search-form" action="/search" method="GET">
      <label for="query">Search</label>
      <input id="query" name="query" type="text" />
      <button type="submit">Search</button>
    </form>

    <button id="cta" onclick="document.body.setAttribute('data-cta', 'clicked')">Get Started</button>
  </body>
</html>`;
}

function renderContactPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Afterburn Fixture Contact</title>
  </head>
  <body>
    <h1>Contact</h1>
    <form id="contact-form" action="/api/contact" method="POST">
      <label for="name">Name</label>
      <input id="name" name="name" type="text" required />
      <label for="email">Email</label>
      <input id="email" name="email" type="email" required />
      <label for="message">Message</label>
      <textarea id="message" name="message"></textarea>
      <button type="submit">Send Message</button>
    </form>
    <a href="/">Back Home</a>
  </body>
</html>`;
}

function renderPricingPage(): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Afterburn Fixture Pricing</title>
  </head>
  <body>
    <h1>Pricing</h1>
    <button id="buy-now" onclick="window.location.href='/contact'">Buy Now</button>
    <a href="/">Back Home</a>
  </body>
</html>`;
}

function renderSearchPage(term: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Search Results</title>
  </head>
  <body>
    <h1>Results for: ${term}</h1>
    <a href="/">Back Home</a>
  </body>
</html>`;
}

function renderSpaPage(currentPath: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Afterburn Fixture SPA</title>
  </head>
  <body>
    <h1>Fixture SPA</h1>
    <nav>
      <a href="/spa/about" data-spa-link>About</a>
      <a href="/spa/pricing" data-spa-link>Pricing</a>
    </nav>
    <main id="spa-content">${currentPath}</main>
    <script>
      (function () {
        const content = document.getElementById('spa-content');
        function render(pathname) {
          if (content) content.textContent = pathname;
        }
        document.querySelectorAll('[data-spa-link]').forEach((link) => {
          link.addEventListener('click', function (event) {
            event.preventDefault();
            const href = link.getAttribute('href');
            if (!href) return;
            history.pushState({}, '', href);
            render(location.pathname);
          });
        });
        window.addEventListener('popstate', function () {
          render(location.pathname);
        });
      })();
    </script>
  </body>
</html>`;
}

export async function startFixtureServer(): Promise<FixtureServer> {
  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1');

    if (req.method === 'GET' && url.pathname === '/') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(renderHomePage());
      return;
    }

    if (req.method === 'GET' && url.pathname === '/contact') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(renderContactPage());
      return;
    }

    if (req.method === 'GET' && url.pathname === '/pricing') {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(renderPricingPage());
      return;
    }

    if (req.method === 'GET' && url.pathname === '/search') {
      const query = url.searchParams.get('query') ?? '';
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(renderSearchPage(query));
      return;
    }

    if (req.method === 'GET' && (url.pathname === '/spa' || url.pathname === '/spa/about' || url.pathname === '/spa/pricing')) {
      res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
      res.end(renderSpaPage(url.pathname));
      return;
    }

    if (req.method === 'POST' && url.pathname === '/api/contact') {
      req.resume();
      res.writeHead(200, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
      return;
    }

    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
    res.end('Not found');
  });

  await new Promise<void>((resolve, reject) => {
    server.listen(0, '127.0.0.1', () => resolve());
    server.once('error', reject);
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Fixture server failed to bind to a TCP port');
  }

  const baseUrl = `http://127.0.0.1:${address.port}`;
  return {
    baseUrl,
    close: () => new Promise<void>((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
    }),
  };
}

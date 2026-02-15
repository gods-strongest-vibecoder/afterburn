// Hierarchical sitemap tree builder from flat page data
import type { SitemapNode, PageData } from '../types/discovery.js';

/**
 * Builds a hierarchical sitemap tree from flat page data based on URL path structure.
 * Creates intermediate placeholder nodes for uncrawled parent paths.
 *
 * @param pages - Flat array of crawled pages
 * @param rootUrl - Root URL of the site (e.g., https://example.com)
 * @returns Root node of the sitemap tree
 */
export function buildSitemap(pages: PageData[], rootUrl: string): SitemapNode {
  // Parse root URL
  const rootUrlParsed = new URL(rootUrl);
  const rootHostname = rootUrlParsed.hostname;

  // Normalize URL helper (remove trailing slash, normalize path)
  const normalizePath = (path: string): string => {
    return path === '/' ? '/' : path.replace(/\/$/, '');
  };

  // Find or create root node
  const rootPage = pages.find(p => {
    try {
      const url = new URL(p.url);
      return url.hostname === rootHostname && normalizePath(url.pathname) === '/';
    } catch {
      return false;
    }
  });

  const root: SitemapNode = rootPage ? {
    url: rootPage.url,
    title: rootPage.title || 'Home',
    path: '/',
    children: [],
    pageData: rootPage,
    depth: 0,
  } : {
    // Synthetic root if homepage wasn't crawled
    url: rootUrl,
    title: 'Home',
    path: '/',
    children: [],
    pageData: {
      url: rootUrl,
      title: 'Home',
      forms: [],
      buttons: [],
      links: [],
      menus: [],
      otherInteractive: [],
      crawledAt: new Date().toISOString(),
    },
    depth: 0,
  };

  // Track all nodes by normalized path for quick lookup
  const nodesByPath = new Map<string, SitemapNode>();
  nodesByPath.set('/', root);

  // Sort pages by URL path depth (fewer segments = closer to root)
  const sortedPages = pages
    .filter(p => {
      try {
        const url = new URL(p.url);
        return url.hostname === rootHostname && normalizePath(url.pathname) !== '/';
      } catch {
        return false;
      }
    })
    .sort((a, b) => {
      const aSegments = new URL(a.url).pathname.split('/').filter(Boolean).length;
      const bSegments = new URL(b.url).pathname.split('/').filter(Boolean).length;
      return aSegments - bSegments;
    });

  // Build tree by walking path segments
  for (const page of sortedPages) {
    try {
      const url = new URL(page.url);
      const fullPath = normalizePath(url.pathname);

      // Split path into segments (e.g., /dashboard/settings -> ['dashboard', 'settings'])
      const segments = fullPath.split('/').filter(Boolean);

      // Walk the tree, creating intermediate nodes as needed
      let currentPath = '';
      let parentNode = root;

      for (let i = 0; i < segments.length; i++) {
        const segment = segments[i];
        currentPath += '/' + segment;
        const normalizedCurrentPath = normalizePath(currentPath);

        // Check if node exists for this path
        let node = nodesByPath.get(normalizedCurrentPath);

        if (!node) {
          // Check if this is the final segment (matches the page we're processing)
          const isFinalSegment = i === segments.length - 1 && normalizedCurrentPath === fullPath;

          if (isFinalSegment) {
            // Create node from page data
            node = {
              url: page.url,
              title: page.title || segment,
              path: normalizedCurrentPath,
              children: [],
              pageData: page,
              depth: parentNode.depth + 1,
            };
          } else {
            // Create placeholder node for intermediate path
            node = {
              url: `${rootUrlParsed.origin}${normalizedCurrentPath}`,
              title: segment.charAt(0).toUpperCase() + segment.slice(1),
              path: normalizedCurrentPath,
              children: [],
              pageData: {
                url: `${rootUrlParsed.origin}${normalizedCurrentPath}`,
                title: segment.charAt(0).toUpperCase() + segment.slice(1),
                forms: [],
                buttons: [],
                links: [],
                menus: [],
                otherInteractive: [],
                crawledAt: new Date().toISOString(),
              },
              depth: parentNode.depth + 1,
            };
          }

          // Add to parent's children and index
          parentNode.children.push(node);
          nodesByPath.set(normalizedCurrentPath, node);
        }

        // Move to next level
        parentNode = node;
      }

      // Handle query string pages - group under path without query
      if (url.search) {
        const queryNode: SitemapNode = {
          url: page.url,
          title: page.title || 'Query: ' + url.search,
          path: fullPath + url.search,
          children: [],
          pageData: page,
          depth: parentNode.depth + 1,
        };
        parentNode.children.push(queryNode);
      }
    } catch {
      // Invalid URL, skip
      continue;
    }
  }

  return root;
}

/**
 * Renders a sitemap tree as human-readable text with box-drawing tree connectors.
 * Uses Unicode box-drawing characters (├──, └──, │) for visual hierarchy.
 *
 * Example output:
 *   Home (/)
 *   ├── About (/about)
 *   ├── Blog (/blog)
 *   │   ├── Post One (/blog/post-one)
 *   │   └── Post Two (/blog/post-two)
 *   └── Contact (/contact)
 *
 * @param node - Root or any node in the tree
 * @param prefix - Accumulated prefix for current depth (internal use)
 * @param isLast - Whether this node is the last child of its parent (internal use)
 * @param isRoot - Whether this is the root node (internal use)
 * @returns Multi-line string representation of the tree
 */
export function printSitemapTree(
  node: SitemapNode,
  prefix: string = '',
  isLast: boolean = true,
  isRoot: boolean = true,
): string {
  let output: string;

  if (isRoot) {
    // Root node: no connector prefix
    output = `${node.title} (${node.path})\n`;
  } else {
    // Child node: use ├── or └── depending on position
    const connector = isLast ? '\u2514\u2500\u2500 ' : '\u251C\u2500\u2500 ';
    output = `${prefix}${connector}${node.title} (${node.path})\n`;
  }

  // Sort children by path for consistent output
  const sortedChildren = [...node.children].sort((a, b) => a.path.localeCompare(b.path));

  for (let i = 0; i < sortedChildren.length; i++) {
    const child = sortedChildren[i];
    const childIsLast = i === sortedChildren.length - 1;
    // For children of root, prefix stays empty.
    // For deeper nodes, extend prefix with │ (continuation) or spaces (last child).
    const childPrefix = isRoot
      ? ''
      : prefix + (isLast ? '    ' : '\u2502   ');
    output += printSitemapTree(child, childPrefix, childIsLast, false);
  }

  return output;
}

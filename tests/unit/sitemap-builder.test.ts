// Unit tests for the sitemap tree builder
import { describe, it, expect } from 'vitest';
import { buildSitemap, printSitemapTree } from '../../src/discovery/sitemap-builder.js';
import type { PageData } from '../../src/types/discovery.js';

/** Helper: create a minimal PageData object */
function makePage(url: string, title: string = ''): PageData {
  return {
    url,
    title,
    forms: [],
    buttons: [],
    links: [],
    menus: [],
    otherInteractive: [],
    crawledAt: new Date().toISOString(),
  };
}

describe('buildSitemap', () => {
  it('creates a root node from the homepage', () => {
    const pages = [makePage('https://example.com/', 'Home')];
    const tree = buildSitemap(pages, 'https://example.com');

    expect(tree.path).toBe('/');
    expect(tree.title).toBe('Home');
    expect(tree.depth).toBe(0);
    expect(tree.children).toHaveLength(0);
  });

  it('creates a synthetic root when homepage is not in pages', () => {
    const pages = [makePage('https://example.com/about', 'About')];
    const tree = buildSitemap(pages, 'https://example.com');

    expect(tree.path).toBe('/');
    expect(tree.title).toBe('Home');
    expect(tree.children).toHaveLength(1);
    expect(tree.children[0].path).toBe('/about');
  });

  it('builds a flat tree for pages at depth 1', () => {
    const pages = [
      makePage('https://example.com/', 'Home'),
      makePage('https://example.com/about', 'About'),
      makePage('https://example.com/contact', 'Contact'),
    ];

    const tree = buildSitemap(pages, 'https://example.com');
    expect(tree.children).toHaveLength(2);
    expect(tree.children.map(c => c.path).sort()).toEqual(['/about', '/contact']);
  });

  it('builds nested tree for multi-level paths', () => {
    const pages = [
      makePage('https://example.com/', 'Home'),
      makePage('https://example.com/dashboard', 'Dashboard'),
      makePage('https://example.com/dashboard/settings', 'Settings'),
    ];

    const tree = buildSitemap(pages, 'https://example.com');
    expect(tree.children).toHaveLength(1);

    const dashboard = tree.children[0];
    expect(dashboard.path).toBe('/dashboard');
    expect(dashboard.title).toBe('Dashboard');
    expect(dashboard.children).toHaveLength(1);
    expect(dashboard.children[0].path).toBe('/dashboard/settings');
    expect(dashboard.children[0].title).toBe('Settings');
  });

  it('creates intermediate placeholder nodes for missing parent paths', () => {
    // Only the leaf page exists — intermediate "/blog" should be synthesized
    const pages = [
      makePage('https://example.com/', 'Home'),
      makePage('https://example.com/blog/post-1', 'Post 1'),
    ];

    const tree = buildSitemap(pages, 'https://example.com');
    expect(tree.children).toHaveLength(1);

    const blogNode = tree.children[0];
    expect(blogNode.path).toBe('/blog');
    expect(blogNode.title).toBe('Blog'); // capitalized segment
    expect(blogNode.children).toHaveLength(1);
    expect(blogNode.children[0].path).toBe('/blog/post-1');
    expect(blogNode.children[0].title).toBe('Post 1');
  });

  it('calculates correct depth values', () => {
    const pages = [
      makePage('https://example.com/', 'Home'),
      makePage('https://example.com/a', 'A'),
      makePage('https://example.com/a/b', 'B'),
      makePage('https://example.com/a/b/c', 'C'),
    ];

    const tree = buildSitemap(pages, 'https://example.com');
    expect(tree.depth).toBe(0);

    const a = tree.children[0];
    expect(a.depth).toBe(1);

    const b = a.children[0];
    expect(b.depth).toBe(2);

    const c = b.children[0];
    expect(c.depth).toBe(3);
  });

  it('ignores pages from different hostnames', () => {
    const pages = [
      makePage('https://example.com/', 'Home'),
      makePage('https://other.com/page', 'Other'),
    ];

    const tree = buildSitemap(pages, 'https://example.com');
    expect(tree.children).toHaveLength(0);
  });

  it('handles trailing slashes correctly', () => {
    const pages = [
      makePage('https://example.com/', 'Home'),
      makePage('https://example.com/about/', 'About'),
    ];

    const tree = buildSitemap(pages, 'https://example.com');
    expect(tree.children).toHaveLength(1);
    expect(tree.children[0].path).toBe('/about');
  });

  it('preserves pageData reference in nodes', () => {
    const aboutPage = makePage('https://example.com/about', 'About Us');
    const pages = [makePage('https://example.com/', 'Home'), aboutPage];

    const tree = buildSitemap(pages, 'https://example.com');
    expect(tree.children[0].pageData).toBe(aboutPage);
  });
});

describe('printSitemapTree', () => {
  it('prints a single node correctly', () => {
    const pages = [makePage('https://example.com/', 'Home')];
    const tree = buildSitemap(pages, 'https://example.com');
    const output = printSitemapTree(tree);
    expect(output).toBe('Home (/)\n');
  });

  it('prints a nested tree with correct indentation', () => {
    const pages = [
      makePage('https://example.com/', 'Home'),
      makePage('https://example.com/about', 'About'),
      makePage('https://example.com/about/team', 'Team'),
    ];

    const tree = buildSitemap(pages, 'https://example.com');
    const output = printSitemapTree(tree);

    const lines = output.trim().split('\n');
    expect(lines[0]).toBe('Home (/)');
    expect(lines[1]).toBe('└── About (/about)');
    expect(lines[2]).toBe('    └── Team (/about/team)');
  });

  it('sorts children alphabetically by path', () => {
    const pages = [
      makePage('https://example.com/', 'Home'),
      makePage('https://example.com/zoo', 'Zoo'),
      makePage('https://example.com/about', 'About'),
      makePage('https://example.com/blog', 'Blog'),
    ];

    const tree = buildSitemap(pages, 'https://example.com');
    const output = printSitemapTree(tree);
    const lines = output.trim().split('\n');

    // Children should be sorted: about, blog, zoo
    expect(lines[1]).toContain('/about');
    expect(lines[2]).toContain('/blog');
    expect(lines[3]).toContain('/zoo');
  });

  it('uses ├── for non-last children and └── for last child', () => {
    const pages = [
      makePage('https://example.com/', 'Home'),
      makePage('https://example.com/blog', 'Blog'),
      makePage('https://example.com/about', 'About'),
      makePage('https://example.com/contact', 'Contact'),
    ];

    const tree = buildSitemap(pages, 'https://example.com');
    const output = printSitemapTree(tree);
    const lines = output.trim().split('\n');

    // Sorted order: about, blog, contact
    expect(lines[1]).toBe('├── About (/about)');
    expect(lines[2]).toBe('├── Blog (/blog)');
    expect(lines[3]).toBe('└── Contact (/contact)');
  });

  it('uses │ continuation for deep nesting under non-last children', () => {
    const pages = [
      makePage('https://example.com/', 'Home'),
      makePage('https://example.com/blog', 'Blog'),
      makePage('https://example.com/blog/post-1', 'Post 1'),
      makePage('https://example.com/blog/post-2', 'Post 2'),
      makePage('https://example.com/contact', 'Contact'),
    ];

    const tree = buildSitemap(pages, 'https://example.com');
    const output = printSitemapTree(tree);
    const lines = output.trim().split('\n');

    // Sorted: blog (not last), contact (last)
    // Blog's children get │   prefix because blog is not the last child
    expect(lines[0]).toBe('Home (/)');
    expect(lines[1]).toBe('├── Blog (/blog)');
    expect(lines[2]).toBe('│   ├── Post 1 (/blog/post-1)');
    expect(lines[3]).toBe('│   └── Post 2 (/blog/post-2)');
    expect(lines[4]).toBe('└── Contact (/contact)');
  });

  it('uses spaces (not │) for children of a last-child node', () => {
    const pages = [
      makePage('https://example.com/', 'Home'),
      makePage('https://example.com/about', 'About'),
      makePage('https://example.com/about/team', 'Team'),
    ];

    const tree = buildSitemap(pages, 'https://example.com');
    const output = printSitemapTree(tree);
    const lines = output.trim().split('\n');

    // About is the only (and therefore last) child of root
    expect(lines[0]).toBe('Home (/)');
    expect(lines[1]).toBe('└── About (/about)');
    // Team is child of About (last child) so prefix is 4 spaces, not │
    expect(lines[2]).toBe('    └── Team (/about/team)');
  });

  it('root node has no connector prefix', () => {
    const pages = [makePage('https://example.com/', 'Home')];
    const tree = buildSitemap(pages, 'https://example.com');
    const output = printSitemapTree(tree);
    const firstLine = output.trim().split('\n')[0];

    // Root starts directly with the title, no ├── or └── prefix
    expect(firstLine).toBe('Home (/)');
    expect(firstLine).not.toMatch(/^[├└│]/);
  });
});

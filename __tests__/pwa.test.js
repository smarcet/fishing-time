'use strict';
const fs   = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');

describe('PWA manifest and service worker', () => {
  let manifest;

  beforeAll(() => {
    manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
  });

  test('manifest.json has all required fields', () => {
    expect(manifest.name).toBeDefined();
    expect(manifest.short_name).toBeDefined();
    expect(manifest.start_url).toBeDefined();
    expect(manifest.scope).toBeDefined();
    expect(manifest.display).toBe('standalone');
    expect(manifest.orientation).toBe('landscape');
    expect(manifest.theme_color).toBeDefined();
    expect(manifest.background_color).toBeDefined();
  });

  test('manifest.icons contains 192x192 and 512x512 entries', () => {
    expect(Array.isArray(manifest.icons)).toBe(true);
    const sizes = manifest.icons.map(i => i.sizes);
    expect(sizes).toContain('192x192');
    expect(sizes).toContain('512x512');
  });

  test('every manifest icon src exists on disk', () => {
    manifest.icons.forEach(icon => {
      expect(fs.existsSync(path.join(ROOT, icon.src))).toBe(true);
    });
  });

  test('sw.js exists at repo root', () => {
    expect(fs.existsSync(path.join(ROOT, 'sw.js'))).toBe(true);
  });
});

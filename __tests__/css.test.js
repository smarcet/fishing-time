const fs = require('fs');
const path = require('path');

describe('main.css', () => {
  test('test_css_body_html_overflow_hidden_prevents_scrollbars', () => {
    const css = fs.readFileSync(path.join(__dirname, '..', 'main.css'), 'utf8');
    // html or body must declare overflow:hidden to suppress the phantom layout-box
    // overhang caused by transform:translate(-50%,-50%) on the canvas
    expect(css).toMatch(/(?:html|body)[^{]*\{[^}]*overflow\s*:\s*hidden/s);
  });

  test('canvas disables browser touch gestures for responsive game input', () => {
    const css = fs.readFileSync(path.join(__dirname, '..', 'main.css'), 'utf8');

    expect(css).toMatch(/#canvas1[^{]*\{[^}]*touch-action\s*:\s*none/s);
    expect(css).toMatch(/#canvas1[^{]*\{[^}]*max-width\s*:\s*100vw/s);
    expect(css).toMatch(/#canvas1[^{]*\{[^}]*max-height\s*:\s*100vh/s);
  });

  test('rotate overlay is centered and can block canvas interaction', () => {
    const css = fs.readFileSync(path.join(__dirname, '..', 'main.css'), 'utf8');

    expect(css).toMatch(/#rotate-overlay[^{]*\{[^}]*position\s*:\s*fixed/s);
    expect(css).toMatch(/#rotate-overlay[^{]*\{[^}]*display\s*:\s*flex/s);
    expect(css).toMatch(/#rotate-overlay[^{]*\{[^}]*z-index\s*:\s*\d+/s);
    expect(css).toMatch(/#rotate-overlay\[hidden\][^{]*\{[^}]*display\s*:\s*none/s);
  });

  test('mobile navigation controls are large edge touch targets', () => {
    const css = fs.readFileSync(path.join(__dirname, '..', 'main.css'), 'utf8');

    expect(css).toMatch(/\.touch-nav[^{]*\{[^}]*position\s*:\s*fixed/s);
    expect(css).toMatch(/\.touch-nav[^{]*\{[^}]*min-width\s*:\s*72px/s);
    expect(css).toMatch(/\.touch-nav\[hidden\][^{]*\{[^}]*display\s*:\s*none/s);
  });
});

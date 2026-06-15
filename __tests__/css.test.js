const fs = require('fs');
const path = require('path');

describe('main.css', () => {
  test('test_css_body_html_overflow_hidden_prevents_scrollbars', () => {
    const css = fs.readFileSync(path.join(__dirname, '..', 'main.css'), 'utf8');
    // html or body must declare overflow:hidden to suppress the phantom layout-box
    // overhang caused by transform:translate(-50%,-50%) on the canvas
    expect(css).toMatch(/(?:html|body)[^{]*\{[^}]*overflow\s*:\s*hidden/s);
  });
});

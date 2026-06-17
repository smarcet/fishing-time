'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

function loadLayer() {
  const source = fs.readFileSync(path.join(__dirname, '..', 'src', 'Layer.js'), 'utf8');
  return vm.runInNewContext(`${source}\nLayer`, { PARALLAX_GAME_SPEED: 5 });
}

describe('Layer parallax tiling', () => {
  test('draw overlaps wrapped image copies to avoid transparent seams', () => {
    const Layer = loadLayer();
    const layer = new Layer({ id: 'ocean' }, 320, 180, 0.2);
    const ctx = { drawImage: jest.fn() };
    layer.x = -120.5;

    layer.draw(ctx);

    const firstDraw = ctx.drawImage.mock.calls[0];
    const secondDraw = ctx.drawImage.mock.calls[1];
    const firstRightEdge = firstDraw[1] + firstDraw[3];

    expect(secondDraw[1]).toBeLessThan(firstRightEdge);
  });
});

'use strict';

const { Bubble, Size, Point } = require('../index.js');

function makeBubble(x = 200, y = 600) {
  const mockCtx = {
    drawImage: () => {},
    save: () => {},
    restore: () => {},
    beginPath: () => {},
    arc: () => {},
    stroke: () => {},
  };
  const mockGame = {};
  return new Bubble(mockGame, mockCtx, new Size(32, 32), new Point(x, y), {});
}

describe('Bubble dying animation', () => {
  test('startDying() sets _dying to true', () => {
    const b = makeBubble();
    expect(b._dying).toBe(false);
    b.startDying();
    expect(b._dying).toBe(true);
  });

  test('startDying() is idempotent - second call leaves _dieFrame and _dying unchanged', () => {
    const b = makeBubble();
    b.startDying();
    b.update(); // advance one frame
    const frameBefore = b._dieFrame;
    b.startDying(); // second call - must not reset
    expect(b._dying).toBe(true);
    expect(b._dieFrame).toBe(frameBefore);
  });

  test('bubble stops rising while dying', () => {
    const b = makeBubble(200, 400);
    const yBefore = b.getPosition().getY();
    b.startDying();
    b.update();
    expect(b.getPosition().getY()).toBe(yBefore);
  });

  test('bubble marks itself dead after BUBBLE_DIE_DURATION updates', () => {
    const b = makeBubble();
    b.startDying();
    for (let i = 0; i < BUBBLE_DIE_DURATION; i++) b.update();
    expect(b.isLive()).toBe(false);
  });

  test('bubble is still alive before BUBBLE_DIE_DURATION frames elapse', () => {
    const b = makeBubble();
    b.startDying();
    for (let i = 0; i < BUBBLE_DIE_DURATION - 1; i++) b.update();
    expect(b.isLive()).toBe(true);
  });
});

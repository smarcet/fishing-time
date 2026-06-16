'use strict';

const { Size, Point, InertObject, RedApple } = require('../index.js');

function makeRedApple(startX = 0) {
  const mockGame = {
    getSize: () => new Size(600, 800),
    isDebug: () => false,
    hasKey: () => false,
  };
  const mockCtx = {
    drawImage: () => {},
    save: () => {},
    restore: () => {},
    translate: () => {},
    rotate: () => {},
    fillRect: () => {},
    fillText: () => {},
  };
  return new RedApple(mockGame, mockCtx, new Size(204, 118), new Point(startX, 300), {}, 1);
}

describe('RedApple class hierarchy', () => {
  test('instanceof InertObject', () => {
    expect(makeRedApple() instanceof InertObject).toBe(true);
  });

  test('getFightSpec() returns null (inert - no struggle)', () => {
    expect(makeRedApple().getFightSpec()).toBeNull();
  });
});

describe('RedApple bob animation', () => {
  test('_bobOffset is 0 before any update', () => {
    expect(makeRedApple()._bobOffset).toBe(0);
  });

  test('getPosition().getY() reflects bob offset after one update', () => {
    const apple = makeRedApple(0);
    apple.update();
    const expected = 300 + 12 * Math.sin(0.08);
    expect(apple.getPosition().getY()).toBeCloseTo(expected, 5);
  });
});

describe('RedApple slow drift', () => {
  test('drifts at 0.6 px/tick', () => {
    const apple = makeRedApple(0);
    apple.update();
    expect(apple.getPosition().getX()).toBeCloseTo(0.6, 5);
  });
});

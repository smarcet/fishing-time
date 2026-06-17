'use strict';

const { Size, Point, Enemy } = require('../index.js');

const CANVAS_W = 800;
const CANVAS_H = 600;
const ENEMY_W = 50;
const ENEMY_H = 30;

function makeEnemy(startX = 0) {
  const game = {
    getSize: () => new Size(CANVAS_H, CANVAS_W),
    isDebug: () => false,
  };
  const ctx = { drawImage: jest.fn() };
  return new Enemy(game, ctx, new Size(ENEMY_H, ENEMY_W), new Point(startX, 100), {});
}

describe('Enemy traffic movement', () => {
  test('right-moving enemy at right edge continues right instead of reversing', () => {
    const enemy = makeEnemy(CANVAS_W - ENEMY_W);
    enemy._direction = 1;
    enemy._speedX = 2;
    enemy._driftSpeed = 2;

    enemy.update();

    expect(enemy._direction).toBe(1);
    expect(enemy._speedX).toBe(2);
    expect(enemy.getPosition().getX()).toBe(CANVAS_W - ENEMY_W + 2);
  });

  test('left-moving enemy at left edge continues left instead of reversing', () => {
    const enemy = makeEnemy(0);
    enemy._direction = -1;
    enemy._speedX = -2;
    enemy._driftSpeed = 2;

    enemy.update();

    expect(enemy._direction).toBe(-1);
    expect(enemy._speedX).toBe(-2);
    expect(enemy.getPosition().getX()).toBe(-2);
  });
});

describe('Enemy traffic offscreen boundaries', () => {
  test('exact spawn edges are not offscreen', () => {
    expect(makeEnemy(-ENEMY_W).isOffScreen()).toBe(false);
    expect(makeEnemy(CANVAS_W).isOffScreen()).toBe(false);
  });

  test('fully beyond right edge is offscreen without escape state', () => {
    expect(makeEnemy(CANVAS_W + 1).isOffScreen()).toBe(true);
  });

  test('fully beyond left edge is offscreen without escape state', () => {
    expect(makeEnemy(-ENEMY_W - 1).isOffScreen()).toBe(true);
  });
});

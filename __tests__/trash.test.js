'use strict';

const { Size, Point, EnemyWithAnimation, Trash } = require('../index.js');

function makeMocks(startX = 0) {
  const mockGame = {
    getSize: () => new Size(600, 800), // height=600, width=800 - wide enough to avoid right-wall bounce
    isDebug: () => false,
    hasKey: () => false,
  };
  const mockCtx = {
    drawImage: () => {},
    beginPath: () => {},
    stroke: () => {},
    fillRect: () => {},
    fillText: () => {},
    save: () => {},
    restore: () => {},
    translate: () => {},
    rotate: () => {},
    setLineDash: () => {},
  };
  const mockImage = {};
  return { mockGame, mockCtx, mockImage, startX };
}

function makeTrash(startX = 0) {
  const { mockGame, mockCtx, mockImage } = makeMocks(startX);
  // maxFrames=10 matches the 10-frame green_bottle_sprite.png
  return new Trash(mockGame, mockCtx, new Size(92, 76), new Point(startX, 300), mockImage, 10);
}

function makeEnemy(startX = 0) {
  const { mockGame, mockCtx, mockImage } = makeMocks(startX);
  return new EnemyWithAnimation(
    mockGame, mockCtx, new Size(82, 100), new Point(startX, 200), mockImage,
    10, 4, 1, 1
  );
}

describe('Trash animation', () => {
  describe('bob (sinusoidal vertical offset)', () => {
    test('_bobOffset is 0 before any update', () => {
      const trash = makeTrash();
      expect(trash._bobOffset).toBe(0);
    });

    test('getPosition().getY() reflects bob offset after update', () => {
      const trash = makeTrash(0);
      trash.update();
      const expected = 300 + 12 * Math.sin(0.08);
      expect(trash.getPosition().getY()).toBeCloseTo(expected, 5);
    });

    test('_bobOffset ≈ 12*sin(0.08) after one update', () => {
      const trash = makeTrash();
      trash.update();
      expect(trash._bobOffset).toBeCloseTo(12 * Math.sin(0.08), 5);
    });

    test('_bobOffset follows 12*sin(phase) across multiple updates', () => {
      const trash = makeTrash();
      for (let i = 0; i < 5; i++) trash.update();
      expect(trash._bobOffset).toBeCloseTo(12 * Math.sin(0.08 * 5), 5);
    });
  });

  describe('rock (rotational tilt, out of phase with bob)', () => {
    test('_angle ≈ 0.1745*cos(0.08) after one update (phase advances before rock computed)', () => {
      const trash = makeTrash();
      trash.update();
      // Phase is incremented first: _bobPhase = 0 + 0.08 = 0.08
      // Then angle = maxAngle * cos(0.08)
      expect(trash._angle).toBeCloseTo(0.1745 * Math.cos(0.08), 5);
    });

    test('_angle follows 0.1745*cos(phase) across multiple updates', () => {
      const trash = makeTrash();
      for (let i = 0; i < 7; i++) trash.update();
      expect(trash._angle).toBeCloseTo(0.1745 * Math.cos(0.08 * 7), 5);
    });
  });

  describe('frame stagger (advance every 6 ticks)', () => {
    test('_frameX stays 0 for first 5 updates', () => {
      const trash = makeTrash();
      for (let i = 0; i < 5; i++) {
        trash.update();
        expect(trash._frameX).toBe(0);
      }
    });

    test('_frameX becomes 1 on the 6th update', () => {
      const trash = makeTrash();
      for (let i = 0; i < 6; i++) trash.update();
      expect(trash._frameX).toBe(1);
    });

    test('_frameX wraps back to 0 after 60 updates (10 frames × 6 ticks)', () => {
      const trash = makeTrash();
      for (let i = 0; i < 60; i++) trash.update();
      expect(trash._frameX).toBe(0);
    });
  });

  describe('slow horizontal drift (0.6 px/tick)', () => {
    test('getX() === 0.6 after first update (starts at x=0, lBound triggers _speedX=0.6)', () => {
      const trash = makeTrash(0);
      trash.update();
      expect(trash.getPosition().getX()).toBeCloseTo(0.6, 5);
    });

    test('getX() ≈ 1.2 after second update (sustained drift)', () => {
      const trash = makeTrash(0);
      trash.update();
      trash.update();
      expect(trash.getPosition().getX()).toBeCloseTo(1.2, 5);
    });
  });
});

describe('EnemyWithAnimation regression (fish behavior unchanged)', () => {
  test('_frameX advances every single update (stagger=1 default)', () => {
    const enemy = makeEnemy(0);
    enemy.update();
    expect(enemy._frameX).toBe(1);
    enemy.update();
    expect(enemy._frameX).toBe(2);
  });

  test('getX() === 1.5 after first update (drift speed 1.5 default)', () => {
    const enemy = makeEnemy(0);
    enemy.update();
    expect(enemy.getPosition().getX()).toBe(1.5);
  });
});

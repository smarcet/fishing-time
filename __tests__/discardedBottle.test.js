'use strict';

const { Size, Point, EnemyWithAnimation, InertObject, DiscardedBottle } = require('../index.js');
const { DRIFT_SPEED_DEFAULT, FISH_TRAFFIC_DIRECTION_RIGHT } = require('../src/constants');

function makeMocks(startX = 0) {
  const mockGame = {
    getSize: () => new Size(600, 800),
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
  return { mockGame, mockCtx, mockImage: {}, startX };
}

function makeDiscardedBottle(startX = 0) {
  const { mockGame, mockCtx, mockImage } = makeMocks(startX);
  return new DiscardedBottle(mockGame, mockCtx, new Size(92, 76), new Point(startX, 300), mockImage, 10);
}

function makeScaledBottle() {
  const { mockGame, mockCtx } = makeMocks(0);
  mockCtx.drawImage = jest.fn();
  const mockImage = { naturalWidth: 760, naturalHeight: 92 };
  return new DiscardedBottle(mockGame, mockCtx, new Size(44.16, 36.48), new Point(0, 300), mockImage, 10);
}

function makeEnemy(startX = 0) {
  const { mockGame, mockCtx, mockImage } = makeMocks(startX);
  return new EnemyWithAnimation(
    mockGame, mockCtx, new Size(82, 100), new Point(startX, 200), mockImage,
    10, 4, 1, 1
  );
}

describe('DiscardedBottle animation', () => {
  describe('bob (sinusoidal vertical offset)', () => {
    test('_bobOffset is 0 before any update', () => {
      const bottle = makeDiscardedBottle();
      expect(bottle._bobOffset).toBe(0);
    });

    test('getPosition().getY() reflects bob offset after update', () => {
      const bottle = makeDiscardedBottle(0);
      bottle.update();
      const expected = 300 + 12 * Math.sin(0.08);
      expect(bottle.getPosition().getY()).toBeCloseTo(expected, 5);
    });

    test('_bobOffset ≈ 12*sin(0.08) after one update', () => {
      const bottle = makeDiscardedBottle();
      bottle.update();
      expect(bottle._bobOffset).toBeCloseTo(12 * Math.sin(0.08), 5);
    });

    test('_bobOffset follows 12*sin(phase) across multiple updates', () => {
      const bottle = makeDiscardedBottle();
      for (let i = 0; i < 5; i++) bottle.update();
      expect(bottle._bobOffset).toBeCloseTo(12 * Math.sin(0.08 * 5), 5);
    });
  });

  describe('rock (rotational tilt, out of phase with bob)', () => {
    test('_angle ≈ 0.1745*cos(0.08) after one update', () => {
      const bottle = makeDiscardedBottle();
      bottle.update();
      expect(bottle._angle).toBeCloseTo(0.1745 * Math.cos(0.08), 5);
    });

    test('_angle follows 0.1745*cos(phase) across multiple updates', () => {
      const bottle = makeDiscardedBottle();
      for (let i = 0; i < 7; i++) bottle.update();
      expect(bottle._angle).toBeCloseTo(0.1745 * Math.cos(0.08 * 7), 5);
    });
  });

  describe('frame stagger (advance every 6 ticks)', () => {
    test('_frameX stays 0 for first 5 updates', () => {
      const bottle = makeDiscardedBottle();
      for (let i = 0; i < 5; i++) {
        bottle.update();
        expect(bottle._frameX).toBe(0);
      }
    });

    test('_frameX becomes 1 on the 6th update', () => {
      const bottle = makeDiscardedBottle();
      for (let i = 0; i < 6; i++) bottle.update();
      expect(bottle._frameX).toBe(1);
    });

    test('_frameX wraps back to 0 after 60 updates (10 frames x 6 ticks)', () => {
      const bottle = makeDiscardedBottle();
      for (let i = 0; i < 60; i++) bottle.update();
      expect(bottle._frameX).toBe(0);
    });
  });

  describe('slow horizontal drift (0.6 px/tick)', () => {
    test('getX() === 0.6 after first update', () => {
      const bottle = makeDiscardedBottle(0);
      bottle.update();
      expect(bottle.getPosition().getX()).toBeCloseTo(0.6, 5);
    });

    test('getX() ≈ 1.2 after second update (sustained drift)', () => {
      const bottle = makeDiscardedBottle(0);
      bottle.update();
      bottle.update();
      expect(bottle.getPosition().getX()).toBeCloseTo(1.2, 5);
    });
  });

  test('draw() preserves spritesheet frame source when display size is scaled', () => {
    const bottle = makeScaledBottle();

    bottle.draw();

    const drawCall = bottle._ctx.drawImage.mock.calls[0];
    expect(drawCall[1]).toBe(0);
    expect(drawCall[2]).toBe(0);
    expect(drawCall[3]).toBe(76);
    expect(drawCall[4]).toBe(92);
    expect(drawCall[7]).toBeCloseTo(36.48, 5);
    expect(drawCall[8]).toBeCloseTo(44.16, 5);
  });
});

describe('DiscardedBottle class hierarchy', () => {
  test('instanceof InertObject', () => {
    const bottle = makeDiscardedBottle();
    expect(bottle instanceof InertObject).toBe(true);
  });

  test('getFightSpec() returns null (inert - no struggle)', () => {
    const bottle = makeDiscardedBottle();
    expect(bottle.getFightSpec()).toBeNull();
  });
});

describe('EnemyWithAnimation regression (behavior unchanged)', () => {
  test('_frameX advances every single update (stagger=1 default)', () => {
    const enemy = makeEnemy(0);
    enemy.update();
    expect(enemy._frameX).toBe(1);
    enemy.update();
    expect(enemy._frameX).toBe(2);
  });

  test('base enemy does not drift until traffic speed is assigned', () => {
    const enemy = makeEnemy(0);
    enemy.update();
    expect(enemy.getPosition().getX()).toBe(0);
  });

  test('base enemy moves once traffic direction and speed are assigned', () => {
    const enemy = makeEnemy(0);
    enemy._direction = FISH_TRAFFIC_DIRECTION_RIGHT;
    enemy._speedX = DRIFT_SPEED_DEFAULT;
    enemy.update();
    expect(enemy.getPosition().getX()).toBe(DRIFT_SPEED_DEFAULT);
  });
});

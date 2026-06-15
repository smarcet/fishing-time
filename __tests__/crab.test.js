'use strict';

const { Size, Point, EnemyWithAnimation, Crab } = require('../index.js');

const CRAB_FRAME_WIDTH   = 408;
const CRAB_FRAME_HEIGHT  = 197;
const CRAB_MAX_FRAME_X   = 10;
const CRAB_MAX_FRAME_Y   = 1;
const CRAB_DIE_FRAME_Y   = 1;
const CRAB_DRIFT_SPEED   = 4.0;

function makeMocks() {
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
    scale: jest.fn(),
    setLineDash: () => {},
  };
  return { mockGame, mockCtx, mockImage: {} };
}

function makeCrab(startX = 0, startY = 510) {
  const { mockGame, mockCtx, mockImage } = makeMocks();
  return new Crab(
    mockGame, mockCtx,
    new Size(98, 204),
    new Point(startX, startY),
    mockImage,
    CRAB_MAX_FRAME_X, CRAB_MAX_FRAME_Y,
    0, CRAB_DIE_FRAME_Y,
    new Size(CRAB_FRAME_HEIGHT, CRAB_FRAME_WIDTH)
  );
}

describe('Crab inheritance', () => {
  test('Crab is an instance of EnemyWithAnimation', () => {
    const crab = makeCrab();
    expect(crab).toBeInstanceOf(EnemyWithAnimation);
  });
});

describe('Crab direction bootstrap (seabed spawn at x=0)', () => {
  test('after first update at x=0, direction is 1 and speedX > 0', () => {
    const crab = makeCrab(0);
    crab.update();
    expect(crab._direction).toBe(1);
    expect(crab._speedX).toBeGreaterThan(0);
  });

  test('drift speed is CRAB_DRIFT_SPEED (2.5) after bootstrap', () => {
    const crab = makeCrab(0);
    crab.update();
    expect(crab._speedX).toBe(CRAB_DRIFT_SPEED);
  });
});

describe('Crab draw() direction flip', () => {
  test('draw() calls ctx.scale(1, 1) when direction is 1 (going right, sprite faces right)', () => {
    const { mockGame, mockCtx, mockImage } = makeMocks();
    const crab = new Crab(
      mockGame, mockCtx,
      new Size(98, 204), new Point(100, 510),
      mockImage,
      CRAB_MAX_FRAME_X, CRAB_MAX_FRAME_Y, 0, CRAB_DIE_FRAME_Y,
      new Size(CRAB_FRAME_HEIGHT, CRAB_FRAME_WIDTH)
    );
    crab._direction = 1;
    crab.draw();
    expect(mockCtx.scale).toHaveBeenCalledWith(1, 1);
  });

  test('draw() calls ctx.scale(-1, 1) when direction is -1 (going left, flip right-facing sprite)', () => {
    const { mockGame, mockCtx, mockImage } = makeMocks();
    const crab = new Crab(
      mockGame, mockCtx,
      new Size(98, 204), new Point(100, 510),
      mockImage,
      CRAB_MAX_FRAME_X, CRAB_MAX_FRAME_Y, 0, CRAB_DIE_FRAME_Y,
      new Size(CRAB_FRAME_HEIGHT, CRAB_FRAME_WIDTH)
    );
    crab._direction = -1;
    crab.draw();
    expect(mockCtx.scale).toHaveBeenCalledWith(-1, 1);
  });
});

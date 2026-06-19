'use strict';

const { Size, Point, InertObject } = require('../index.js');
const { FISH_SCORE_MAP } = require('../src/constants.js');
const { ChestWithJewels } = require('../src/ChestWithJewels.js');
global.ChestWithJewels = ChestWithJewels;

const CANVAS_W = 800;
const CANVAS_H = 600;
const CHEST_W  = 206;
const CHEST_H  = 138;

function makeChest(startX = 0, startY = 300) {
  const mockGame = {
    getSize: () => new Size(CANVAS_H, CANVAS_W),
    isDebug: () => false,
    hasKey:  () => false,
  };
  const mockCtx = {
    drawImage:  () => {},
    save:       () => {},
    restore:    () => {},
    translate:  () => {},
    rotate:     () => {},
    fillRect:   () => {},
    fillText:   () => {},
  };
  return new ChestWithJewels(mockGame, mockCtx, new Size(CHEST_H, CHEST_W), new Point(startX, startY), {}, 1);
}

describe('ChestWithJewels class hierarchy', () => {
  test('instanceof InertObject', () => {
    expect(makeChest() instanceof InertObject).toBe(true);
  });

  test('getFightSpec() returns null (inert - instant grab, no struggle)', () => {
    expect(makeChest().getFightSpec()).toBeNull();
  });
});

describe('ChestWithJewels score wiring', () => {
  test('FISH_SCORE_MAP["ChestWithJewels"] === 10000', () => {
    expect(FISH_SCORE_MAP['ChestWithJewels']).toBe(10000);
  });
});

describe('ChestWithJewels bob animation', () => {
  test('Y position unchanged before any update', () => {
    expect(makeChest(0, 300).getPosition().getY()).toBe(300);
  });

  test('getPosition().getY() reflects bob offset after one update', () => {
    const chest = makeChest(0, 300);
    chest.update();
    const expected = 300 + 12 * Math.sin(0.08);
    expect(chest.getPosition().getY()).toBeCloseTo(expected, 5);
  });
});

describe('ChestWithJewels fast drift', () => {
  test('drifts at 7.0 px/tick (constructor fallback)', () => {
    const chest = makeChest(0);
    chest.update();
    expect(chest.getPosition().getX()).toBeCloseTo(7.0, 5);
  });
});

describe('ChestWithJewels off-screen detection', () => {
  test('isOffScreen() returns true when fully past right edge', () => {
    const chest = makeChest(CANVAS_W + CHEST_W + 1);
    expect(chest.isOffScreen()).toBe(true);
  });
});

describe('ChestWithJewels factory integration', () => {
  test('EnemyFactory creates a ChestWithJewels instance', () => {
    const { EnemyFactory } = require('../src/EnemyFactory');
    const mockGame = {
      getSize: () => new Size(CANVAS_H, CANVAS_W),
      isDebug: () => false,
    };
    const mockCtx = {};
    const factory = new EnemyFactory();
    const chest = factory.createEnemy('chest_with_jewels', mockGame, mockCtx);
    expect(chest instanceof ChestWithJewels).toBe(true);
  });
});

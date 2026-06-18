'use strict';

const { Size, Point, InertObject } = require('../index.js');
const { Clock } = require('../src/Clock.js');
global.Clock = Clock;

function makeClock(startX = 0) {
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
  return new Clock(mockGame, mockCtx, new Size(77, 100), new Point(startX, 300), {}, 1);
}

describe('Clock class hierarchy', () => {
  test('instanceof InertObject', () => {
    expect(makeClock() instanceof InertObject).toBe(true);
  });

  test('getFightSpec() returns null (inert - no struggle)', () => {
    expect(makeClock().getFightSpec()).toBeNull();
  });
});

describe('Clock bob animation', () => {
  test('_bobOffset is 0 before any update', () => {
    expect(makeClock()._bobOffset).toBe(0);
  });

  test('getPosition().getY() reflects bob offset after one update', () => {
    const clock = makeClock(0);
    clock.update();
    const expected = 300 + 12 * Math.sin(0.08);
    expect(clock.getPosition().getY()).toBeCloseTo(expected, 5);
  });
});

describe('Clock slow drift', () => {
  test('drifts at 0.6 px/tick', () => {
    const clock = makeClock(0);
    clock.update();
    expect(clock.getPosition().getX()).toBeCloseTo(0.6, 5);
  });
});

describe('Clock factory integration', () => {
  test('EnemyFactory creates a Clock instance', () => {
    const { EnemyFactory } = require('../src/EnemyFactory');
    const mockGame = {
      getSize: () => new Size(600, 800),
      isDebug: () => false,
    };
    const mockCtx = {};
    const factory = new EnemyFactory();
    const clock = factory.createEnemy('clock', mockGame, mockCtx);
    expect(clock instanceof Clock).toBe(true);
  });
});

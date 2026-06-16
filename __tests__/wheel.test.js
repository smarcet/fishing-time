'use strict';

const { Size, Point, InertObject, Wheel } = require('../index.js');

function makeWheel(startX = 0) {
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
  return new Wheel(mockGame, mockCtx, new Size(76, 84), new Point(startX, 300), {}, 1);
}

describe('Wheel class hierarchy', () => {
  test('instanceof InertObject', () => {
    expect(makeWheel() instanceof InertObject).toBe(true);
  });

  test('getFightSpec() returns null (inert - no struggle)', () => {
    expect(makeWheel().getFightSpec()).toBeNull();
  });
});

describe('Wheel bob animation', () => {
  test('_bobOffset is 0 before any update', () => {
    expect(makeWheel()._bobOffset).toBe(0);
  });

  test('getPosition().getY() reflects bob offset after one update', () => {
    const wheel = makeWheel(0);
    wheel.update();
    const expected = 300 + 12 * Math.sin(0.08);
    expect(wheel.getPosition().getY()).toBeCloseTo(expected, 5);
  });
});

describe('Wheel slow drift', () => {
  test('drifts at 0.6 px/tick', () => {
    const wheel = makeWheel(0);
    wheel.update();
    expect(wheel.getPosition().getX()).toBeCloseTo(0.6, 5);
  });
});

describe('Wheel factory integration', () => {
  test('EnemyFactory creates a Wheel instance', () => {
    const { EnemyFactory } = require('../src/EnemyFactory');
    const ENEMY_TYPE_WHEEL = 'wheel';
    const mockGame = {
      getSize: () => new Size(600, 800),
      isDebug: () => false,
    };
    const mockCtx = {};
    const factory = new EnemyFactory();
    const wheel = factory.createEnemy(ENEMY_TYPE_WHEEL, mockGame, mockCtx);
    expect(wheel instanceof Wheel).toBe(true);
  });
});

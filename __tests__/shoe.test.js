'use strict';

const { Size, Point, InertObject } = require('../index.js');
const { Shoe } = require('../src/Shoe.js');
global.Shoe = Shoe;

function makeShoe(startX = 0) {
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
  return new Shoe(mockGame, mockCtx, new Size(55, 84), new Point(startX, 300), {}, 1);
}

describe('Shoe class hierarchy', () => {
  test('instanceof InertObject', () => {
    expect(makeShoe() instanceof InertObject).toBe(true);
  });

  test('getFightSpec() returns null (inert - no struggle)', () => {
    expect(makeShoe().getFightSpec()).toBeNull();
  });
});

describe('Shoe bob animation', () => {
  test('_bobOffset is 0 before any update', () => {
    expect(makeShoe()._bobOffset).toBe(0);
  });

  test('getPosition().getY() reflects bob offset after one update', () => {
    const shoe = makeShoe(0);
    shoe.update();
    const expected = 300 + 12 * Math.sin(0.08);
    expect(shoe.getPosition().getY()).toBeCloseTo(expected, 5);
  });
});

describe('Shoe slow drift', () => {
  test('drifts at 0.6 px/tick', () => {
    const shoe = makeShoe(0);
    shoe.update();
    expect(shoe.getPosition().getX()).toBeCloseTo(0.6, 5);
  });
});

describe('Shoe factory integration', () => {
  test('EnemyFactory creates a Shoe instance', () => {
    const { EnemyFactory } = require('../src/EnemyFactory');
    const ENEMY_TYPE_SHOE = 'shoe';
    const mockGame = {
      getSize: () => new Size(600, 800),
      isDebug: () => false,
    };
    const mockCtx = {};
    const factory = new EnemyFactory();
    const shoe = factory.createEnemy(ENEMY_TYPE_SHOE, mockGame, mockCtx);
    expect(shoe instanceof Shoe).toBe(true);
  });
});

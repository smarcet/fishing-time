'use strict';

const { Size } = require('../index.js');
const { EnemyFactory } = require('../src/EnemyFactory');
const { FISH_DEFINITIONS, ENEMY_TYPE_OCTOPUS } = require('../src/constants');

const UNHANDLED_FACTORY_ID = 'unhandled_configured_id';

function makeGame() {
  return {
    getSize: () => new Size(600, 800),
    isDebug: () => false,
  };
}

describe('EnemyFactory configured roster', () => {
  test('creates the configured class for every fish definition id', () => {
    const factory = new EnemyFactory();
    const game = makeGame();

    FISH_DEFINITIONS.forEach(def => {
      const enemy = factory.createEnemy(def.id, game, {});
      expect(enemy).not.toBeNull();
      expect(enemy.constructor.name).toBe(def.className);
    });
  });

  test('does not use Octopus fallback for configured but unhandled ids', () => {
    const factory = new EnemyFactory();
    factory.specs[UNHANDLED_FACTORY_ID] = factory.specs[ENEMY_TYPE_OCTOPUS];

    expect(factory.createEnemy(UNHANDLED_FACTORY_ID, makeGame(), {})).toBeNull();
  });
});

'use strict';

const { Size } = require('../index.js');
const { EnemyFactory } = require('../src/EnemyFactory');
const {
  FISH_DEFINITIONS,
  ENEMY_TYPE_OCTOPUS,
  ENEMY_TYPE_BUTTERFLY_FISH,
  ENEMY_TYPE_SHARK,
  ENEMY_TYPE_HAMMERHEAD_SHARK,
  GAMEPLAY_PROFILE_MOBILE,
} = require('../src/constants');

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

  test('mobile profile scales display size proportionally without changing source frame size', () => {
    const desktopFactory = new EnemyFactory();
    const mobileFactory = new EnemyFactory(GAMEPLAY_PROFILE_MOBILE);

    const desktopShark = desktopFactory.createEnemy(ENEMY_TYPE_SHARK, makeGame(), {});
    const mobileShark = mobileFactory.createEnemy(ENEMY_TYPE_SHARK, makeGame(), {});
    const mobileButterfly = mobileFactory.createEnemy(ENEMY_TYPE_BUTTERFLY_FISH, makeGame(), {});
    const mobileHammerhead = mobileFactory.createEnemy(ENEMY_TYPE_HAMMERHEAD_SHARK, makeGame(), {});

    expect(mobileShark.getSize().getWidth()).toBeCloseTo(desktopShark.getSize().getWidth() * GAMEPLAY_PROFILE_MOBILE.spriteScale, 3);
    expect(mobileShark.getSize().getHeight()).toBeCloseTo(desktopShark.getSize().getHeight() * GAMEPLAY_PROFILE_MOBILE.spriteScale, 3);
    const hammerheadDef = FISH_DEFINITIONS.find(d => d.id === ENEMY_TYPE_HAMMERHEAD_SHARK);
    expect(mobileButterfly._sw).toBe(100);
    expect(mobileButterfly._sh).toBe(82);
    expect(mobileHammerhead._sw).toBe(hammerheadDef.frameW);
  });
});

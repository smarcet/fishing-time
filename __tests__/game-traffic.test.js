'use strict';

require('../index.js');
const { Game } = require('../src/Game');
const { Point, Size } = require('../index.js');
const { EVENT_ENEMY_EVADED } = require('../src/constants');

function makeEvent(type, init = {}) {
  this.type = type;
  this.detail = init.detail;
}

function makeGameForUpdate(enemies) {
  const game = Object.create(Game.prototype);
  game._size = new Size(600, 800);
  game._timerSystem = { update: jest.fn() };
  game._scoreSystem = { update: jest.fn() };
  game._gameResult = null;
  game._resultElapsed = 0;
  game._reelPowerBar = { update: jest.fn() };
  game._layers = [{ update: jest.fn() }];
  game._bubbles = [{
    isLive: () => true,
    update: jest.fn(),
    getPosition: () => new Point(0, 600),
    startDying: jest.fn(),
  }];
  game._enemies = enemies;
  game._fishSpawner = { update: jest.fn(() => []) };
  game._player = {
    update: jest.fn(),
    getHook: () => ({
      isCasting: () => false,
      getPosition: () => new Point(0, 0),
      getSize: () => new Size(0, 0),
    }),
  };
  return game;
}

function makeOffscreenEnemy(name, hasEscaped) {
  return {
    _hasEscaped: hasEscaped,
    constructor: { name },
    isOffScreen: () => true,
    isCaptured: () => false,
    update: jest.fn(),
  };
}

describe('Game traffic exit handling', () => {
  let savedDocument;
  let savedCustomEvent;

  beforeEach(() => {
    savedDocument = global.document;
    savedCustomEvent = global.CustomEvent;
    global.document = { dispatchEvent: jest.fn() };
    global.CustomEvent = makeEvent;
  });

  afterEach(() => {
    global.document = savedDocument;
    global.CustomEvent = savedCustomEvent;
  });

  test('dispatches evade penalty only for escaped fish, not normal traffic exits', () => {
    const normalTraffic = makeOffscreenEnemy('ClownFish', false);
    const escapedFish = makeOffscreenEnemy('Crab', true);
    const game = makeGameForUpdate([normalTraffic, escapedFish]);

    game.update(16);

    expect(global.document.dispatchEvent).toHaveBeenCalledTimes(1);
    expect(global.document.dispatchEvent).toHaveBeenCalledWith(expect.objectContaining({
      type: EVENT_ENEMY_EVADED,
      detail: { enemyType: 'Crab' },
    }));
    expect(game._fishSpawner.update).toHaveBeenCalledWith([]);
  });
});

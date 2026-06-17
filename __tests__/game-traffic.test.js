'use strict';

require('../index.js');
const { Game } = require('../src/Game');
const { Point, Size } = require('../index.js');
const { BUBBLE_SIZE_MAX, EVENT_ENEMY_EVADED, GAMEPLAY_PROFILE_MOBILE } = require('../src/constants');

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
    getPosition: () => new Point(100, -44),
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

function makeLiveBubbleAt(y) {
  return {
    isLive: () => true,
    update: jest.fn(),
    getPosition: () => new Point(0, y),
    startDying: jest.fn(),
  };
}

describe('Game traffic exit handling', () => {
  let savedDocument;
  let savedCustomEvent;

  beforeEach(() => {
    savedDocument = global.document;
    savedCustomEvent = global.CustomEvent;
    global.document = { dispatchEvent: jest.fn(), getElementById: jest.fn(() => ({})) };
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
    expect(game._fishSpawner.update).toHaveBeenCalledWith([], 16);
  });

  test('paused game update does not advance traffic, player, bubbles, score, or timer', () => {
    const escapedFish = makeOffscreenEnemy('Crab', true);
    const game = makeGameForUpdate([escapedFish]);
    game.setPaused(true);

    game.update(16);

    expect(game._timerSystem.update).not.toHaveBeenCalled();
    expect(game._scoreSystem.update).not.toHaveBeenCalled();
    expect(game._fishSpawner.update).not.toHaveBeenCalled();
    expect(game._player.update).not.toHaveBeenCalled();
    expect(escapedFish.update).not.toHaveBeenCalled();
  });

  test('resize with resetTraffic flushes non-hooked traffic and bubbles', () => {
    const traffic = { isCaptured: () => false };
    const hooked = { isCaptured: () => true };
    const profile = { name: 'mobile', playerScale: 0.62, hudScale: 0.42, playerYOffset: -44 };
    const game = Object.create(Game.prototype);
    game._size = new Size(600, 800);
    game._layers = [{ width: 800, height: 600 }];
    game._timerSystem = { resize: jest.fn(), setScale: jest.fn() };
    game._scoreSystem = { setScale: jest.fn() };
    game._fishSpawner = { setProfile: jest.fn() };
    game._enemyFactory = { setProfile: jest.fn() };
    game._player = {
      _position: new Point(900, 0),
      getSize: () => new Size(100, 100),
      setDisplayScale: jest.fn(),
      setProfileYOffset: jest.fn(),
    };
    game._enemies = [traffic, hooked];
    game._bubbles = [{}];

    game.resize(new Size(430, 900), profile, { resetTraffic: true });

    expect(game._size.getWidth()).toBe(900);
    expect(game._layers[0].width).toBe(900);
    expect(game._layers[0].height).toBe(430);
    expect(game._player.setDisplayScale).toHaveBeenCalledWith(0.62);
    expect(game._player.setProfileYOffset).toHaveBeenCalledWith(-44);
    expect(game._timerSystem.setScale).toHaveBeenCalledWith(0.42);
    expect(game._scoreSystem.setScale).toHaveBeenCalledWith(0.42);
    expect(game._enemies).toEqual([hooked]);
    expect(game._bubbles).toEqual([]);
    expect(game._player._position.getX()).toBe(800);
  });

  test('iPad-sized mobile resize lowers the boat with a short-edge responsive offset', () => {
    const game = Object.create(Game.prototype);
    game._size = new Size(390, 844);
    game._layers = [{ width: 844, height: 390 }];
    game._timerSystem = { resize: jest.fn(), setScale: jest.fn() };
    game._scoreSystem = { setScale: jest.fn() };
    game._fishSpawner = { setProfile: jest.fn() };
    game._enemyFactory = { setProfile: jest.fn() };
    game._player = {
      _position: new Point(100, 0),
      getSize: () => new Size(100, 100),
      setDisplayScale: jest.fn(),
      setProfileYOffset: jest.fn(),
    };
    game._enemies = [];
    game._bubbles = [];

    game.resize(new Size(390, 844), GAMEPLAY_PROFILE_MOBILE, { resetTraffic: true });
    expect(game._player.setProfileYOffset).toHaveBeenLastCalledWith(-44);

    game.resize(new Size(820, 1180), GAMEPLAY_PROFILE_MOBILE, { resetTraffic: true });
    expect(game._player.setProfileYOffset).toHaveBeenLastCalledWith(59);

    game.resize(new Size(1024, 1366), GAMEPLAY_PROFILE_MOBILE, { resetTraffic: true });
    expect(game._player.setProfileYOffset).toHaveBeenLastCalledWith(108);
  });

  test('getRuntimeStats reports profile, pause state, and active entity counts', () => {
    const game = makeGameForUpdate([]);
    game._profile = { name: 'mobile', maxActiveTraffic: 8, maxActiveLargeFish: 1, playerScale: 0.62, hudScale: 0.42, playerYOffset: -44, spriteScale: 0.48 };
    game._paused = true;
    game._enemies = [{ _trafficType: 'shark' }, { _trafficType: 'clown_fish' }];
    game._bubbles = [{}, {}, {}];

    const stats = game.getRuntimeStats();

    expect(stats).toEqual(expect.objectContaining({
      profileName: 'mobile',
      paused: true,
      activeTraffic: 2,
      bubbles: 3,
      playerX: 100,
      playerY: -44,
      maxActiveTraffic: 8,
      maxActiveLargeFish: 1,
      playerScale: 0.62,
      hudScale: 0.42,
      playerYOffset: -44,
      spriteScale: 0.48,
    }));
  });

  test('mobile profile scales newly spawned bubble sizes', () => {
    const game = makeGameForUpdate([]);
    game._bubbles = [];
    game._profile = {
      name: 'mobile',
      bubbleBatchSize: 1,
      bubbleSizeScale: 0.45,
      maxActiveTraffic: 8,
      maxActiveLargeFish: 1,
    };

    game.update(16);

    expect(game._bubbles).toHaveLength(1);
    expect(game._bubbles[0].getSize().getWidth()).toBeLessThanOrEqual(BUBBLE_SIZE_MAX * 0.45);
    expect(game._bubbles[0].getSize().getHeight()).toBeLessThanOrEqual(BUBBLE_SIZE_MAX * 0.45);
  });

  test('mobile bubble death threshold is relative to viewport height', () => {
    const bottomBubble = makeLiveBubbleAt(360);
    const surfaceBubble = makeLiveBubbleAt(150);
    const game = makeGameForUpdate([]);
    game._size = new Size(390, 844);
    game._profile = { name: 'mobile', bubbleDieThresholdFactor: 0.42 };

    game._bubbles = [bottomBubble];
    game.update(16);
    expect(bottomBubble.startDying).not.toHaveBeenCalled();

    game._bubbles = [surfaceBubble];
    game.update(16);
    expect(surfaceBubble.startDying).toHaveBeenCalled();
  });
});

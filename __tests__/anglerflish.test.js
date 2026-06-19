'use strict';

const fs = require('node:fs');
const path = require('node:path');

const { Size, Point, PremiumCatchableFish, AnglerFlish, FishSpawner } = require('../index.js');
const {
  ENEMY_TYPE_ANGLER_FLISH,
  FISH_DEFINITIONS,
  FISH_LANE_BOTTOM,
  FISH_LANES,
  FISH_RARITY_EPIC,
  FISH_TRAFFIC_DIRECTION_LEFT,
  FISH_TRAFFIC_DIRECTION_RIGHT,
  FISH_TRAFFIC_COOLDOWN_READY,
  FISH_TRAFFIC_MAX_ACTIVE_ONE,
  GAMEPLAY_PROFILE_DESKTOP,
  GAMEPLAY_PROFILE_MOBILE,
} = require('../src/constants');

const ANGLER_FLISH_FRAME_WIDTH = 264;
const ANGLER_FLISH_FRAME_HEIGHT = 160;
const ANGLER_FLISH_MAX_FRAME_X = 4;
const ANGLER_FLISH_DISPLAY_W = 165;
const ANGLER_FLISH_DISPLAY_H = 100;
const ANGLER_FLISH_SPAWN_INTERVAL = 1800;

const anglerDefinition = FISH_DEFINITIONS.find(def => def.id === ENEMY_TYPE_ANGLER_FLISH);

function makeMocks() {
  const operations = [];
  const drawImageCalls = [];
  const scaleCalls = [];
  const mockCtx = {
    drawImage: jest.fn((...args) => { operations.push('drawImage'); drawImageCalls.push(args); }),
    beginPath: jest.fn(() => { operations.push('beginPath'); }),
    arc: jest.fn(() => { operations.push('arc'); }),
    moveTo: jest.fn(() => { operations.push('moveTo'); }),
    lineTo: jest.fn(() => { operations.push('lineTo'); }),
    closePath: jest.fn(() => { operations.push('closePath'); }),
    fill: jest.fn(() => { operations.push('fill'); }),
    stroke: () => {},
    fillRect: () => {},
    fillText: () => {},
    save: jest.fn(() => { operations.push('save'); }),
    restore: jest.fn(() => { operations.push('restore'); }),
    translate: jest.fn(() => { operations.push('translate'); }),
    rotate: () => {},
    scale: jest.fn((...args) => { operations.push('scale'); scaleCalls.push(args); }),
    setLineDash: () => {},
    createRadialGradient: jest.fn(() => {
      operations.push('createRadialGradient');
      return { addColorStop() {} };
    }),
    set fillStyle(v) { this._fillStyle = v; operations.push('fillStyle'); },
    get fillStyle() { return this._fillStyle; },
    set globalAlpha(v) { this._globalAlpha = v; operations.push('globalAlpha'); },
    get globalAlpha() { return this._globalAlpha; },
    operations,
    drawImageCalls,
    scaleCalls,
  };
  const mockGame = {
    getSize: () => new Size(600, 800),
    isDebug: () => false,
    hasKey: () => false,
  };
  return { mockGame, mockCtx, mockImage: {} };
}

function makeAnglerFlish(startX = 0, startY = 500, direction = FISH_TRAFFIC_DIRECTION_RIGHT) {
  const { mockGame, mockCtx, mockImage } = makeMocks();
  const fish = new AnglerFlish(
    mockGame, mockCtx,
    new Size(ANGLER_FLISH_DISPLAY_H, ANGLER_FLISH_DISPLAY_W),
    new Point(startX, startY),
    mockImage,
    ANGLER_FLISH_MAX_FRAME_X, 1,
    0, 0,
    new Size(ANGLER_FLISH_FRAME_HEIGHT, ANGLER_FLISH_FRAME_WIDTH)
  );
  fish._direction = direction;
  fish._speedX = direction * 8.0;
  return { fish, mockCtx, mockGame };
}

function makeEnemy(type, size = new Size(ANGLER_FLISH_DISPLAY_H, ANGLER_FLISH_DISPLAY_W)) {
  return {
    type,
    _trafficType: type,
    _position: new Point(0, 0),
    _direction: null,
    _driftSpeed: 0,
    _speedX: 0,
    getSize: () => size,
  };
}

function makeFactory() {
  return {
    createEnemy: jest.fn(type => makeEnemy(type)),
  };
}

describe('AnglerFlish species definition', () => {
  test('is configured as an epic bottom-lane premium fish worth 1000 points', () => {
    expect(anglerDefinition).toEqual(expect.objectContaining({
      className: 'AnglerFlish',
      domId: 'angler_fish_sprite',
      displayW: ANGLER_FLISH_DISPLAY_W,
      displayH: ANGLER_FLISH_DISPLAY_H,
      frameW: ANGLER_FLISH_FRAME_WIDTH,
      frameH: ANGLER_FLISH_FRAME_HEIGHT,
      maxFrameX: ANGLER_FLISH_MAX_FRAME_X,
      maxFrameY: 1,
      dieFrameX: 0,
      dieFrameY: 0,
      rarity: FISH_RARITY_EPIC,
      lanes: [FISH_LANE_BOTTOM],
      score: 1000,
      spawnFrequency: ANGLER_FLISH_SPAWN_INTERVAL,
      maxActive: FISH_TRAFFIC_MAX_ACTIVE_ONE,
    }));
  });

  test('is guaranteed once every 30 seconds in desktop and mobile profiles', () => {
    expect(GAMEPLAY_PROFILE_DESKTOP.guaranteedSpeciesIntervals[ENEMY_TYPE_ANGLER_FLISH]).toBe(ANGLER_FLISH_SPAWN_INTERVAL);
    expect(GAMEPLAY_PROFILE_DESKTOP.guaranteedSpeciesInitialOffsets[ENEMY_TYPE_ANGLER_FLISH]).toBe(ANGLER_FLISH_SPAWN_INTERVAL);
    expect(GAMEPLAY_PROFILE_MOBILE.guaranteedSpeciesIntervals[ENEMY_TYPE_ANGLER_FLISH]).toBe(ANGLER_FLISH_SPAWN_INTERVAL);
    expect(GAMEPLAY_PROFILE_MOBILE.guaranteedSpeciesInitialOffsets[ENEMY_TYPE_ANGLER_FLISH]).toBe(ANGLER_FLISH_SPAWN_INTERVAL);
  });
});

describe('AnglerFlish normalized spritesheet', () => {
  test('sprite asset is normalized to four uniform transparent cells', () => {
    const png = fs.readFileSync(path.join(__dirname, '../images/fishes/angler_fish_sprite.png'));
    expect(png.readUInt32BE(16)).toBe(ANGLER_FLISH_FRAME_WIDTH * ANGLER_FLISH_MAX_FRAME_X);
    expect(png.readUInt32BE(20)).toBe(ANGLER_FLISH_FRAME_HEIGHT);
  });
});

describe('AnglerFlish class', () => {
  test('is an instance of PremiumCatchableFish', () => {
    const { fish } = makeAnglerFlish();
    expect(fish).toBeInstanceOf(PremiumCatchableFish);
  });

  test('draw() uses normalized source cells', () => {
    const { fish, mockCtx } = makeAnglerFlish();
    fish._frameX = 2;
    fish.draw();

    const call = mockCtx.drawImageCalls[0];
    expect(call[1]).toBe(ANGLER_FLISH_FRAME_WIDTH * 2);
    expect(call[2]).toBe(0);
    expect(call[3]).toBe(ANGLER_FLISH_FRAME_WIDTH);
    expect(call[4]).toBe(ANGLER_FLISH_FRAME_HEIGHT);
  });

  test('direction flip preserves the right-facing sprite orientation', () => {
    const right = makeAnglerFlish(100, 500, FISH_TRAFFIC_DIRECTION_RIGHT);
    right.fish.draw();
    expect(right.mockCtx.scaleCalls.some(c => c[0] === 1 && c[1] === 1)).toBe(true);

    const left = makeAnglerFlish(100, 500, FISH_TRAFFIC_DIRECTION_LEFT);
    left.fish.draw();
    expect(left.mockCtx.scaleCalls.some(c => c[0] === -1 && c[1] === 1)).toBe(true);
  });
});

describe('AnglerFlish guaranteed traffic', () => {
  test('spawns in the bottom lane when its 30 second guarantee elapses', () => {
    const factory = makeFactory();
    const profile = Object.assign({}, GAMEPLAY_PROFILE_DESKTOP, {
      guaranteedSpeciesIntervals: Object.freeze({ [ENEMY_TYPE_ANGLER_FLISH]: 60 }),
      guaranteedSpeciesInitialOffsets: Object.freeze({ [ENEMY_TYPE_ANGLER_FLISH]: 60 }),
    });
    const spawner = new FishSpawner(
      { getSize: () => new Size(600, 800) },
      {},
      factory,
      {
        rng: () => 0.99,
        profile,
        preseedPerLane: FISH_TRAFFIC_COOLDOWN_READY,
        initialLaneTimer: 999,
      }
    );

    expect(spawner.update([], 500)).toEqual([]);
    const spawned = spawner.update([], 500);

    expect(spawned).toHaveLength(1);
    expect(spawned[0].type).toBe(ENEMY_TYPE_ANGLER_FLISH);
    expect(spawned[0]._trafficLane).toBe(FISH_LANE_BOTTOM);
    expect(spawned[0]._position.getY()).toBeGreaterThanOrEqual(600 * FISH_LANES[FISH_LANE_BOTTOM].yMin);
  });
});

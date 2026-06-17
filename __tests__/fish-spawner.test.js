'use strict';

const { Size, Point, FishSpawner } = require('../index.js');
const {
  FISH_DEFINITIONS,
  FISH_LANES,
  FISH_LANE_SURFACE,
  FISH_LANE_UPPER,
  FISH_LANE_BOTTOM,
  FISH_TRAFFIC_DIRECTION_RIGHT,
  FISH_TRAFFIC_DIRECTION_LEFT,
  FISH_TRAFFIC_DEFAULT_PRESEED_PER_LANE,
  FISH_TRAFFIC_COOLDOWN_READY,
  FISH_TRAFFIC_MAX_ACTIVE_ONE,
  ENEMY_TYPE_CRAB,
  WATER_SURFACE_Y,
} = require('../src/constants');

const CANVAS_W = 800;
const CANVAS_H = 600;
const SHORT_CANVAS_H = 500;
const ENEMY_W = 50;
const ENEMY_H = 30;
const LARGE_ENEMY_H = 120;
const LOW_WEIGHT_ID = 'low_weight_candidate';
const HIGH_WEIGHT_ID = 'high_weight_candidate';

function makeGame(width = CANVAS_W, height = CANVAS_H) {
  return {
    getSize: () => new Size(height, width),
  };
}

function makeEnemy(type, size = new Size(ENEMY_H, ENEMY_W)) {
  return {
    type,
    _position: new Point(0, 0),
    _direction: null,
    _driftSpeed: 0,
    _speedX: 0,
    getSize: () => size,
  };
}

function makeFactory(size = new Size(ENEMY_H, ENEMY_W)) {
  return {
    createEnemy: jest.fn(type => makeEnemy(type, size)),
  };
}

describe('FishSpawner traffic integration', () => {
  test('preseeds two enemies per lane on first update', () => {
    const factory = makeFactory();
    const spawner = new FishSpawner(makeGame(), {}, factory, {
      rng: () => 0,
      preseedPerLane: FISH_TRAFFIC_DEFAULT_PRESEED_PER_LANE,
    });

    const spawned = spawner.update();

    expect(spawned).toHaveLength(Object.keys(FISH_LANES).length * FISH_TRAFFIC_DEFAULT_PRESEED_PER_LANE);
    spawned.forEach(enemy => {
      expect(enemy._direction).not.toBeNull();
      expect(enemy._speedX).not.toBe(0);
    });
  });

  test('expired lane timers spawn from the correct offscreen edge', () => {
    const factory = makeFactory();
    const spawner = new FishSpawner(makeGame(), {}, factory, {
      rng: () => 0,
      preseedPerLane: FISH_TRAFFIC_COOLDOWN_READY,
      initialLaneTimer: FISH_TRAFFIC_COOLDOWN_READY,
    });

    const spawned = spawner.update();
    const surfaceEnemy = spawned.find(enemy => enemy._trafficLane === FISH_LANE_SURFACE);
    const upperEnemy = spawned.find(enemy => enemy._trafficLane === FISH_LANE_UPPER);

    expect(surfaceEnemy._position.getX()).toBe(-ENEMY_W);
    expect(surfaceEnemy._direction).toBe(FISH_TRAFFIC_DIRECTION_RIGHT);
    expect(upperEnemy._position.getX()).toBe(CANVAS_W);
    expect(upperEnemy._direction).toBe(FISH_TRAFFIC_DIRECTION_LEFT);
  });

  test('weighted selection can choose the higher-weight candidate deterministically', () => {
    const spawner = new FishSpawner(makeGame(), {}, makeFactory(), {
      rng: () => 0,
      preseedPerLane: FISH_TRAFFIC_COOLDOWN_READY,
    });

    const selected = spawner._weightedRandom([
      { id: LOW_WEIGHT_ID, spawnWeight: 1 },
      { id: HIGH_WEIGHT_ID, spawnWeight: 9 },
    ], () => 0.5);

    expect(selected.id).toBe(HIGH_WEIGHT_ID);
  });

  test('species spawnFrequency prevents immediate repeat spawning', () => {
    const factory = makeFactory();
    const spawner = new FishSpawner(makeGame(), {}, factory, {
      rng: () => 0,
      preseedPerLane: FISH_TRAFFIC_COOLDOWN_READY,
    });
    const laneDef = FISH_LANES[FISH_LANE_SURFACE];

    const first = spawner._spawnForLane(FISH_LANE_SURFACE, laneDef, false);
    const second = spawner._spawnForLane(FISH_LANE_SURFACE, laneDef, false);

    expect(first.type).not.toBe(second.type);
    expect(spawner._speciesCooldowns[first.type]).toBeGreaterThan(FISH_TRAFFIC_COOLDOWN_READY);
  });

  test('all configured ids are eligible through at least one lane', () => {
    const factory = makeFactory();
    const spawner = new FishSpawner(makeGame(), {}, factory, {
      rng: () => 0,
      preseedPerLane: FISH_TRAFFIC_COOLDOWN_READY,
    });

    FISH_DEFINITIONS.forEach(def => {
      spawner._speciesCooldowns = {};
      spawner._weightedRandom = jest.fn(candidates => {
        expect(candidates).toContain(def);
        return def;
      });
      const laneName = def.lanes[0];
      const enemy = spawner._spawnForLane(laneName, FISH_LANES[laneName], false);

      expect(enemy.type).toBe(def.id);
    });
  });

  test('large bottom-lane entities clamp inside short canvas vertical bounds', () => {
    const factory = makeFactory(new Size(LARGE_ENEMY_H, ENEMY_W));
    const spawner = new FishSpawner(makeGame(CANVAS_W, SHORT_CANVAS_H), {}, factory, {
      rng: () => 0,
      preseedPerLane: FISH_TRAFFIC_COOLDOWN_READY,
    });
    const bottomDef = FISH_DEFINITIONS.find(def => def.lanes.includes(FISH_LANE_BOTTOM));
    spawner._weightedRandom = jest.fn(() => bottomDef);

    const enemy = spawner._spawnForLane(FISH_LANE_BOTTOM, FISH_LANES[FISH_LANE_BOTTOM], false);
    const y = enemy._position.getY();

    expect(y).toBeGreaterThanOrEqual(WATER_SURFACE_Y);
    expect(y).toBeLessThanOrEqual(SHORT_CANVAS_H - LARGE_ENEMY_H);
  });

  test('crab is bottom-only and limited to one active crab', () => {
    const crabDef = FISH_DEFINITIONS.find(def => def.id === ENEMY_TYPE_CRAB);

    expect(crabDef.lanes).toEqual([FISH_LANE_BOTTOM]);
    expect(crabDef.maxActive).toBe(FISH_TRAFFIC_MAX_ACTIVE_ONE);
  });

  test('does not spawn another crab while one is already active', () => {
    const factory = makeFactory();
    const spawner = new FishSpawner(makeGame(), {}, factory, {
      rng: () => 0,
      preseedPerLane: FISH_TRAFFIC_COOLDOWN_READY,
    });
    const activeCrab = makeEnemy(ENEMY_TYPE_CRAB);
    activeCrab._trafficType = ENEMY_TYPE_CRAB;

    FISH_DEFINITIONS
      .filter(def => def.id !== ENEMY_TYPE_CRAB && def.lanes.includes(FISH_LANE_BOTTOM))
      .forEach(def => { spawner._speciesCooldowns[def.id] = def.spawnFrequency; });

    const enemy = spawner._spawnForLane(
      FISH_LANE_BOTTOM,
      FISH_LANES[FISH_LANE_BOTTOM],
      false,
      [activeCrab]
    );

    expect(enemy).toBeNull();
    expect(factory.createEnemy).not.toHaveBeenCalled();
  });

  test('update() enforces crab maxActive through the live spawn path', () => {
    const factory = makeFactory();
    const spawner = new FishSpawner(makeGame(), {}, factory, {
      rng: () => 0,
      preseedPerLane: FISH_TRAFFIC_COOLDOWN_READY,
      initialLaneTimer: FISH_TRAFFIC_COOLDOWN_READY,
    });
    const activeCrab = makeEnemy(ENEMY_TYPE_CRAB);
    activeCrab._trafficType = ENEMY_TYPE_CRAB;

    FISH_DEFINITIONS
      .filter(def => def.id !== ENEMY_TYPE_CRAB)
      .forEach(def => { spawner._speciesCooldowns[def.id] = def.spawnFrequency; });

    const spawned = spawner.update([activeCrab]);

    expect(spawned).toEqual([]);
    expect(factory.createEnemy).not.toHaveBeenCalled();
  });
});

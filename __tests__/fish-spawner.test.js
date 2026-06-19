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
  ENEMY_TYPE_CLOWN_FISH,
  ENEMY_TYPE_CRAB,
  ENEMY_TYPE_LOBSTER,
  ENEMY_TYPE_SHARK,
  ENEMY_TYPE_HAMMERHEAD_SHARK,
  ENEMY_TYPE_SWORDFISH,
  WATER_SURFACE_Y,
  LOBSTER_TRAFFIC_OFFSET_Y,
  GAMEPLAY_PROFILE_DESKTOP,
  GAMEPLAY_PROFILE_MOBILE,
  FISH_SCHOOL_SIZE_MIN,
  FISH_SCHOOL_SIZE_MAX,
  FISH_RARITY_RARE,
  CLOWN_FISH_DRIFT_SPEED,
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
    _trafficType: type,
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

function getLobsterDefinition() {
  return FISH_DEFINITIONS.find(def => def.id === ENEMY_TYPE_LOBSTER);
}

function getLobsterSize() {
  const lobsterDef = getLobsterDefinition();
  return new Size(lobsterDef.displayH, lobsterDef.displayW);
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

  test('lobster traffic is offset lower in the bottom lane', () => {
    const lobsterDef = getLobsterDefinition();
    const factory = makeFactory(getLobsterSize());
    const spawner = new FishSpawner(makeGame(), {}, factory, {
      rng: () => 0,
      preseedPerLane: FISH_TRAFFIC_COOLDOWN_READY,
    });

    const enemy = spawner._createTrafficEnemy(
      lobsterDef,
      FISH_LANE_BOTTOM,
      FISH_LANES[FISH_LANE_BOTTOM],
      false
    );

    const offsetY = (CANVAS_H * FISH_LANES[FISH_LANE_BOTTOM].yMin) + LOBSTER_TRAFFIC_OFFSET_Y;
    expect(enemy._position.getY()).toBe(Math.min(CANVAS_H - lobsterDef.displayH, offsetY));
  });

  test('lobster traffic offset clamps to the bottom of short canvases', () => {
    const lobsterDef = getLobsterDefinition();
    const shortSeabedCanvasH = 400;
    const factory = makeFactory(getLobsterSize());
    const spawner = new FishSpawner(makeGame(CANVAS_W, shortSeabedCanvasH), {}, factory, {
      rng: () => 1,
      preseedPerLane: FISH_TRAFFIC_COOLDOWN_READY,
    });

    const enemy = spawner._createTrafficEnemy(
      lobsterDef,
      FISH_LANE_BOTTOM,
      FISH_LANES[FISH_LANE_BOTTOM],
      false
    );

    expect(enemy._position.getY()).toBe(shortSeabedCanvasH - lobsterDef.displayH);
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

  test('mobile profile preseeds one enemy per lane instead of desktop density', () => {
    const factory = makeFactory();
    const spawner = new FishSpawner(makeGame(), {}, factory, {
      rng: () => 0,
      profile: GAMEPLAY_PROFILE_MOBILE,
    });

    const spawned = spawner.update();

    expect(spawned).toHaveLength(Object.keys(FISH_LANES).length * GAMEPLAY_PROFILE_MOBILE.preseedPerLane);
  });

  test('mobile profile lengthens lane spawn intervals', () => {
    const desktopSpawner = new FishSpawner(makeGame(), {}, makeFactory(), {
      rng: () => 0,
      profile: GAMEPLAY_PROFILE_DESKTOP,
      preseedPerLane: FISH_TRAFFIC_COOLDOWN_READY,
    });
    const mobileSpawner = new FishSpawner(makeGame(), {}, makeFactory(), {
      rng: () => 0,
      profile: GAMEPLAY_PROFILE_MOBILE,
      preseedPerLane: FISH_TRAFFIC_COOLDOWN_READY,
    });
    const laneDef = { spawnInterval: 100 };

    expect(desktopSpawner._nextLaneDelay(laneDef)).toBe(100);
    expect(mobileSpawner._nextLaneDelay(laneDef)).toBe(155);
  });

  test('mobile profile limits simultaneous large fish across species', () => {
    const spawner = new FishSpawner(makeGame(), {}, makeFactory(), {
      rng: () => 0,
      profile: GAMEPLAY_PROFILE_MOBILE,
      preseedPerLane: FISH_TRAFFIC_COOLDOWN_READY,
    });
    const hammerheadDef = FISH_DEFINITIONS.find(def => def.id === ENEMY_TYPE_HAMMERHEAD_SHARK);
    const activeShark = makeEnemy(ENEMY_TYPE_SHARK);
    const secondActiveShark = makeEnemy(ENEMY_TYPE_SHARK);
    const thirdActiveShark = makeEnemy(ENEMY_TYPE_SHARK);
    activeShark._trafficType = ENEMY_TYPE_SHARK;
    secondActiveShark._trafficType = ENEMY_TYPE_SHARK;
    thirdActiveShark._trafficType = ENEMY_TYPE_SHARK;

    expect(GAMEPLAY_PROFILE_MOBILE.maxActiveLargeFish).toBe(3);
    expect(spawner._hasActiveCapacity(hammerheadDef, [activeShark])).toBe(true);
    expect(spawner._hasActiveCapacity(hammerheadDef, [activeShark, secondActiveShark])).toBe(true);
    expect(spawner._hasActiveCapacity(hammerheadDef, [activeShark, secondActiveShark, thirdActiveShark])).toBe(false);
  });

  test('mobile profile maxActiveTraffic prevents extra spawns when traffic is capped', () => {
    const factory = makeFactory();
    const profile = Object.assign({}, GAMEPLAY_PROFILE_MOBILE, { maxActiveTraffic: 1 });
    const spawner = new FishSpawner(makeGame(), {}, factory, {
      rng: () => 0,
      profile,
      preseedPerLane: FISH_TRAFFIC_COOLDOWN_READY,
      initialLaneTimer: FISH_TRAFFIC_COOLDOWN_READY,
    });

    const spawned = spawner.update([makeEnemy(ENEMY_TYPE_SHARK)]);

    expect(spawned).toEqual([]);
    expect(factory.createEnemy).not.toHaveBeenCalled();
  });

  test('mobile profile reduces crab cooldown for higher bottom-lane cadence', () => {
    const factory = makeFactory();
    const spawner = new FishSpawner(makeGame(), {}, factory, {
      rng: () => 0,
      profile: GAMEPLAY_PROFILE_MOBILE,
      preseedPerLane: FISH_TRAFFIC_COOLDOWN_READY,
    });
    const crabDef = FISH_DEFINITIONS.find(def => def.id === ENEMY_TYPE_CRAB);

    spawner._applySpeciesCooldown(crabDef);

    expect(spawner._speciesCooldowns[ENEMY_TYPE_CRAB]).toBeLessThan(crabDef.spawnFrequency);
    expect(spawner._speciesCooldowns[ENEMY_TYPE_CRAB]).toBe(210);
    expect(GAMEPLAY_PROFILE_MOBILE.guaranteedSpeciesIntervals[ENEMY_TYPE_CRAB]).toBe(600);
    expect(GAMEPLAY_PROFILE_MOBILE.guaranteedSpeciesIntervals[ENEMY_TYPE_HAMMERHEAD_SHARK]).toBe(1200);
    expect(GAMEPLAY_PROFILE_MOBILE.guaranteedSpeciesIntervals[ENEMY_TYPE_SHARK]).toBe(1200);
  });

  test('mobile profile forces a crab spawn when the guarantee interval elapses', () => {
    const factory = makeFactory();
    const profile = Object.assign({}, GAMEPLAY_PROFILE_MOBILE, {
      guaranteedSpeciesIntervals: Object.freeze({ [ENEMY_TYPE_CRAB]: 3 }),
      guaranteedSpeciesInitialOffsets: Object.freeze({ [ENEMY_TYPE_CRAB]: 3 }),
    });
    const spawner = new FishSpawner(makeGame(), {}, factory, {
      rng: () => 0.99,
      profile,
      preseedPerLane: FISH_TRAFFIC_COOLDOWN_READY,
      initialLaneTimer: 999,
    });

    expect(spawner.update([])).toEqual([]);
    expect(spawner.update([])).toEqual([]);

    const spawned = spawner.update([]);

    expect(spawned).toHaveLength(1);
    expect(spawned[0].type).toBe(ENEMY_TYPE_CRAB);
    expect(spawned[0]._trafficLane).toBe(FISH_LANE_BOTTOM);
  });

  test('mobile species guarantees advance from elapsed frame time', () => {
    const factory = makeFactory();
    const profile = Object.assign({}, GAMEPLAY_PROFILE_MOBILE, {
      guaranteedSpeciesIntervals: Object.freeze({ [ENEMY_TYPE_CRAB]: 60 }),
      guaranteedSpeciesInitialOffsets: Object.freeze({ [ENEMY_TYPE_CRAB]: 60 }),
    });
    const spawner = new FishSpawner(makeGame(), {}, factory, {
      rng: () => 0.99,
      profile,
      preseedPerLane: FISH_TRAFFIC_COOLDOWN_READY,
      initialLaneTimer: 999,
    });

    expect(spawner.update([], 500)).toEqual([]);
    expect(spawner.update([], 500).map(enemy => enemy.type)).toEqual([ENEMY_TYPE_CRAB]);
  });

  test('mobile species guarantees make room when the traffic cap is full', () => {
    const factory = makeFactory();
    const profile = Object.assign({}, GAMEPLAY_PROFILE_MOBILE, {
      maxActiveTraffic: 2,
      guaranteedSpeciesIntervals: Object.freeze({ [ENEMY_TYPE_CRAB]: 1 }),
      guaranteedSpeciesInitialOffsets: Object.freeze({ [ENEMY_TYPE_CRAB]: 1 }),
    });
    const spawner = new FishSpawner(makeGame(), {}, factory, {
      rng: () => 0.99,
      profile,
      preseedPerLane: FISH_TRAFFIC_COOLDOWN_READY,
      initialLaneTimer: 999,
    });
    const activeEnemies = [
      makeEnemy(ENEMY_TYPE_CLOWN_FISH),
      makeEnemy(ENEMY_TYPE_CLOWN_FISH),
    ];

    const spawned = spawner.update(activeEnemies);

    expect(spawned.map(enemy => enemy.type)).toEqual([ENEMY_TYPE_CRAB]);
    expect(activeEnemies).toHaveLength(1);
  });

  test('mobile shark guarantees make room when large-fish capacity is full', () => {
    const factory = makeFactory();
    const profile = Object.assign({}, GAMEPLAY_PROFILE_MOBILE, {
      maxActiveLargeFish: 1,
      guaranteedSpeciesIntervals: Object.freeze({ [ENEMY_TYPE_SHARK]: 1 }),
      guaranteedSpeciesInitialOffsets: Object.freeze({ [ENEMY_TYPE_SHARK]: 1 }),
    });
    const spawner = new FishSpawner(makeGame(), {}, factory, {
      rng: () => 0.99,
      profile,
      preseedPerLane: FISH_TRAFFIC_COOLDOWN_READY,
      initialLaneTimer: 999,
    });
    const activeEnemies = [makeEnemy(ENEMY_TYPE_SWORDFISH)];

    const spawned = spawner.update(activeEnemies);

    expect(spawned.map(enemy => enemy.type)).toEqual([ENEMY_TYPE_SHARK]);
    expect(activeEnemies).toHaveLength(0);
  });

  test('mobile profile forces each shark type on its own guarantee interval', () => {
    const factory = makeFactory();
    const profile = Object.assign({}, GAMEPLAY_PROFILE_MOBILE, {
      maxActiveLargeFish: 2,
      guaranteedSpeciesIntervals: Object.freeze({
        [ENEMY_TYPE_HAMMERHEAD_SHARK]: 8,
        [ENEMY_TYPE_SHARK]: 4,
      }),
      guaranteedSpeciesInitialOffsets: Object.freeze({
        [ENEMY_TYPE_HAMMERHEAD_SHARK]: 2,
        [ENEMY_TYPE_SHARK]: 4,
      }),
    });
    const spawner = new FishSpawner(makeGame(), {}, factory, {
      rng: () => 0.99,
      profile,
      preseedPerLane: FISH_TRAFFIC_COOLDOWN_READY,
      initialLaneTimer: 999,
    });

    expect(spawner.update([])).toEqual([]);
    expect(spawner.update([]).map(enemy => enemy.type)).toEqual([ENEMY_TYPE_HAMMERHEAD_SHARK]);
    expect(spawner.update([])).toEqual([]);
    expect(spawner.update([]).map(enemy => enemy.type)).toEqual([ENEMY_TYPE_SHARK]);
  });

  test('mobile profile uses responsive water surface so lanes do not collapse to the bottom', () => {
    const spawner = new FishSpawner(makeGame(844, 390), {}, makeFactory(new Size(40, 48)), {
      rng: () => 0,
      profile: GAMEPLAY_PROFILE_MOBILE,
      preseedPerLane: FISH_TRAFFIC_COOLDOWN_READY,
    });
    const surfaceY = spawner._laneY(FISH_LANES[FISH_LANE_SURFACE], makeEnemy(ENEMY_TYPE_CLOWN_FISH, new Size(40, 48)));
    const middleY = spawner._laneY(FISH_LANES[FISH_LANE_MIDDLE], makeEnemy(ENEMY_TYPE_CLOWN_FISH, new Size(40, 48)));
    const bottomY = spawner._laneY(FISH_LANES[FISH_LANE_BOTTOM], makeEnemy(ENEMY_TYPE_CLOWN_FISH, new Size(40, 48)));

    expect(surfaceY).toBeLessThan(190);
    expect(middleY).toBeGreaterThan(surfaceY);
    expect(bottomY).toBeGreaterThan(middleY);
  });

  describe('school spawning', () => {
    test('_isSchoolEligible returns true for schoolable COMMON species', () => {
      const spawner = new FishSpawner(makeGame(), {}, makeFactory(), {
        rng: () => 0,
        preseedPerLane: FISH_TRAFFIC_COOLDOWN_READY,
      });
      const clownDef = FISH_DEFINITIONS.find(d => d.id === ENEMY_TYPE_CLOWN_FISH);
      expect(spawner._isSchoolEligible(clownDef)).toBe(true);
    });

    test('_isSchoolEligible returns false for non-schoolable species', () => {
      const spawner = new FishSpawner(makeGame(), {}, makeFactory(), {
        rng: () => 0,
        preseedPerLane: FISH_TRAFFIC_COOLDOWN_READY,
      });
      const sharkDef = FISH_DEFINITIONS.find(d => d.id === ENEMY_TYPE_SHARK);
      expect(spawner._isSchoolEligible(sharkDef)).toBe(false);
    });

    test('_isSchoolEligible returns false for schoolable RARE species (rarity guard)', () => {
      const spawner = new FishSpawner(makeGame(), {}, makeFactory(), {
        rng: () => 0,
        preseedPerLane: FISH_TRAFFIC_COOLDOWN_READY,
      });
      expect(spawner._isSchoolEligible({ schoolable: true, rarity: FISH_RARITY_RARE })).toBe(false);
    });

    test('_randomSchoolSize returns FISH_SCHOOL_SIZE_MIN when rng returns 0', () => {
      const spawner = new FishSpawner(makeGame(), {}, makeFactory(), {
        rng: () => 0,
        preseedPerLane: FISH_TRAFFIC_COOLDOWN_READY,
      });
      expect(spawner._randomSchoolSize()).toBe(FISH_SCHOOL_SIZE_MIN);
    });

    test('_randomSchoolSize returns FISH_SCHOOL_SIZE_MAX when rng returns 0.999', () => {
      const spawner = new FishSpawner(makeGame(), {}, makeFactory(), {
        rng: () => 0.999,
        preseedPerLane: FISH_TRAFFIC_COOLDOWN_READY,
      });
      expect(spawner._randomSchoolSize()).toBe(FISH_SCHOOL_SIZE_MAX);
    });

    test('_spawnSchoolFollowers returns SIZE_MIN-1 followers for schoolable leader (rng=0)', () => {
      const factory = makeFactory();
      const spawner = new FishSpawner(makeGame(), {}, factory, {
        rng: () => 0,
        preseedPerLane: FISH_TRAFFIC_COOLDOWN_READY,
      });
      const clownDef = FISH_DEFINITIONS.find(d => d.id === ENEMY_TYPE_CLOWN_FISH);
      const leader = makeEnemy(ENEMY_TYPE_CLOWN_FISH);
      leader._direction = FISH_TRAFFIC_DIRECTION_RIGHT;
      leader._driftSpeed = CLOWN_FISH_DRIFT_SPEED;
      leader._position = new Point(-ENEMY_W, 200);
      const laneDef = FISH_LANES[FISH_LANE_SURFACE];

      const followers = spawner._spawnSchoolFollowers(leader, FISH_LANE_SURFACE, laneDef, [leader]);

      expect(followers).toHaveLength(FISH_SCHOOL_SIZE_MIN - 1);
      followers.forEach(f => {
        expect(f._trafficType).toBe(ENEMY_TYPE_CLOWN_FISH);
        expect(f._direction).toBe(FISH_TRAFFIC_DIRECTION_RIGHT);
        const x = f._position.getX();
        const w = f.getSize().getWidth();
        expect(x + w).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(CANVAS_W);
        expect(f._driftSpeed).toBeGreaterThanOrEqual(clownDef.speedMin);
        expect(f._driftSpeed).toBeLessThanOrEqual(clownDef.speedMax);
      });
    });

    test('_spawnSchoolFollowers returns SIZE_MAX-1 followers when school size rolls maximum', () => {
      const factory = makeFactory();
      const spawner = new FishSpawner(makeGame(), {}, factory, {
        rng: () => 0,
        preseedPerLane: FISH_TRAFFIC_COOLDOWN_READY,
      });
      // Replace _rng after construction so constructor calls don't consume the sequence
      // sequence: chance roll=0 (school proceeds), size roll=0.999 (SIZE_MAX), rest=0
      const calls = [0, 0.999];
      let ci = 0;
      spawner._rng = () => calls[ci++] ?? 0;
      const leader = makeEnemy(ENEMY_TYPE_CLOWN_FISH);
      leader._direction = FISH_TRAFFIC_DIRECTION_RIGHT;
      leader._driftSpeed = CLOWN_FISH_DRIFT_SPEED;
      leader._position = new Point(-ENEMY_W, 200);
      const laneDef = FISH_LANES[FISH_LANE_SURFACE];

      const followers = spawner._spawnSchoolFollowers(leader, FISH_LANE_SURFACE, laneDef, [leader]);

      expect(followers).toHaveLength(FISH_SCHOOL_SIZE_MAX - 1);
      followers.forEach(f => {
        const x = f._position.getX();
        const w = f.getSize().getWidth();
        expect(x + w).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(CANVAS_W);
      });
    });

    test('_spawnSchoolFollowers returns [] for non-schoolable leader', () => {
      const factory = makeFactory();
      const spawner = new FishSpawner(makeGame(), {}, factory, {
        rng: () => 0,
        preseedPerLane: FISH_TRAFFIC_COOLDOWN_READY,
      });
      const crabLeader = makeEnemy(ENEMY_TYPE_CRAB);
      crabLeader._direction = FISH_TRAFFIC_DIRECTION_RIGHT;
      crabLeader._driftSpeed = 1.0;
      crabLeader._position = new Point(-ENEMY_W, 400);

      const followers = spawner._spawnSchoolFollowers(crabLeader, FISH_LANE_BOTTOM, FISH_LANES[FISH_LANE_BOTTOM], [crabLeader]);

      expect(followers).toEqual([]);
    });

    test('follower Y is clamped to WATER_SURFACE_Y when jitter would push above waterline', () => {
      const factory = makeFactory();
      const spawner = new FishSpawner(makeGame(), {}, factory, {
        rng: () => 0,
        preseedPerLane: FISH_TRAFFIC_COOLDOWN_READY,
      });
      const clownDef = FISH_DEFINITIONS.find(d => d.id === ENEMY_TYPE_CLOWN_FISH);
      const leader = makeEnemy(ENEMY_TYPE_CLOWN_FISH);
      leader._direction = FISH_TRAFFIC_DIRECTION_RIGHT;
      leader._driftSpeed = CLOWN_FISH_DRIFT_SPEED;
      // Place leader exactly at waterSurface; rng=0 gives max upward jitter which would push above
      leader._position = new Point(-ENEMY_W, WATER_SURFACE_Y);
      const laneDef = FISH_LANES[FISH_LANE_SURFACE];

      const followers = spawner._spawnSchoolFollowers(leader, FISH_LANE_SURFACE, laneDef, [leader]);

      followers.forEach(f => {
        expect(f._position.getY()).toBeGreaterThanOrEqual(WATER_SURFACE_Y);
      });
    });

    test('update() spawns leader then same-type followers for a schoolable lane spawn', () => {
      const factory = makeFactory();
      const profile = Object.assign({}, GAMEPLAY_PROFILE_DESKTOP, { guaranteedSpeciesIntervals: {} });
      const spawner = new FishSpawner(makeGame(), {}, factory, {
        rng: () => 0,
        profile,
        preseedPerLane: FISH_TRAFFIC_COOLDOWN_READY,
        initialLaneTimer: FISH_TRAFFIC_COOLDOWN_READY,
      });

      const spawned = spawner.update([]);

      const surfaceEntries = spawned.filter(e => e._trafficLane === FISH_LANE_SURFACE);
      expect(surfaceEntries.length).toBeGreaterThanOrEqual(2);
      const leaderType = surfaceEntries[0]._trafficType;
      surfaceEntries.forEach(e => expect(e._trafficType).toBe(leaderType));
      expect(surfaceEntries[0]._position.getX()).toBe(-ENEMY_W);
    });

    test('school is truncated when maxActiveTraffic cap is nearly full', () => {
      const factory = makeFactory();
      const profile = Object.assign({}, GAMEPLAY_PROFILE_DESKTOP, {
        maxActiveTraffic: 2,
        guaranteedSpeciesIntervals: {},
      });
      const spawner = new FishSpawner(makeGame(), {}, factory, {
        rng: () => 0,
        profile,
        preseedPerLane: FISH_TRAFFIC_COOLDOWN_READY,
        initialLaneTimer: FISH_TRAFFIC_COOLDOWN_READY,
      });

      const spawned = spawner.update([makeEnemy(ENEMY_TYPE_CLOWN_FISH)]);

      // active starts at 1; leader fills cap to 2; no followers can be added
      expect(spawned).toHaveLength(1);
    });
  });
});

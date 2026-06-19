class FishSpawner {
  constructor(game, ctx, enemyFactory, options = {}) {
    this._game = game;
    this._ctx = ctx;
    this._enemyFactory = enemyFactory;
    this._rng = options.rng || Math.random;
    this._profile = options.profile || GAMEPLAY_PROFILE_DESKTOP;
    this._preseedPerLane = options.preseedPerLane ?? this._profile.preseedPerLane ?? FISH_TRAFFIC_DEFAULT_PRESEED_PER_LANE;
    this._initialLaneTimer = options.initialLaneTimer;
    this._laneTimers = {};
    this._speciesCooldowns = {};
    this._guaranteeTimers = this._createGuaranteeTimers();
    this._pending = [];

    Object.entries(FISH_LANES).forEach(([laneName, laneDef]) => {
      this._laneTimers[laneName] = this._initialLaneTimer ?? this._nextLaneDelay(laneDef);
      for (let i = FISH_TRAFFIC_QUEUE_START_INDEX; i < this._preseedPerLane; i += FISH_TRAFFIC_TIMER_TICK) {
        const enemy = this._spawnForLane(laneName, laneDef, true, this._pending);
        if (enemy) this._pending.push(enemy);
      }
    });
  }

  setProfile(profile) {
    this._profile = profile || GAMEPLAY_PROFILE_DESKTOP;
    this._guaranteeTimers = this._createGuaranteeTimers();
  }

  update(activeEnemies = [], dt = 0) {
    const spawned = this._pending.splice(FISH_TRAFFIC_QUEUE_START_INDEX);
    const activeTraffic = activeEnemies.concat(spawned);
    this._tickCooldowns();
    this._tickGuarantees(dt);
    this._spawnGuaranteedSpecies(activeEnemies, activeTraffic).forEach(enemy => spawned.push(enemy));

    Object.entries(FISH_LANES).forEach(([laneName, laneDef]) => {
      if (activeTraffic.length >= this._profile.maxActiveTraffic) return;
      this._laneTimers[laneName] -= FISH_TRAFFIC_TIMER_TICK;
      if (this._laneTimers[laneName] <= FISH_TRAFFIC_COOLDOWN_READY) {
        const enemy = this._spawnForLane(laneName, laneDef, false, activeTraffic);
        if (enemy) {
          spawned.push(enemy);
          activeTraffic.push(enemy);
        }
        this._laneTimers[laneName] = this._nextLaneDelay(laneDef);
      }
    });

    return spawned;
  }

  _createGuaranteeTimers() {
    const intervals = this._profile.guaranteedSpeciesIntervals || {};
    const offsets = this._profile.guaranteedSpeciesInitialOffsets || {};
    return Object.keys(intervals).reduce((timers, id) => {
      timers[id] = Number.isFinite(offsets[id]) ? offsets[id] : intervals[id];
      return timers;
    }, {});
  }

  _tickCooldowns() {
    Object.keys(this._speciesCooldowns).forEach(id => {
      this._speciesCooldowns[id] = Math.max(
        FISH_TRAFFIC_COOLDOWN_READY,
        this._speciesCooldowns[id] - FISH_TRAFFIC_TIMER_TICK
      );
    });
  }

  _tickGuarantees(dt = 0) {
    const tick = dt > 0
      ? Math.max(FISH_TRAFFIC_TIMER_TICK, dt / (1000 / 60))
      : FISH_TRAFFIC_TIMER_TICK;
    Object.keys(this._guaranteeTimers).forEach(id => {
      const nextTimer = this._guaranteeTimers[id] - tick;
      this._guaranteeTimers[id] = nextTimer <= 0.0001
        ? FISH_TRAFFIC_COOLDOWN_READY
        : nextTimer;
    });
  }

  _nextLaneDelay(laneDef) {
    const jitter = Math.floor(this._rng() * Math.max(FISH_TRAFFIC_MIN_TIMER_JITTER, laneDef.spawnInterval));
    return Math.round((laneDef.spawnInterval + jitter) * (this._profile.spawnIntervalMultiplier || 1));
  }

  _spawnGuaranteedSpecies(activeEnemies = [], activeTraffic = activeEnemies) {
    const spawned = [];
    Object.keys(this._guaranteeTimers).forEach(id => {
      if (this._guaranteeTimers[id] > FISH_TRAFFIC_COOLDOWN_READY) return;

      const spec = FISH_DEFINITIONS.find(def => def.id === id);
      if (spec && this._hasActiveTrafficType(spec.id, activeTraffic)) {
        this._resetGuaranteeTimer(spec.id);
        return;
      }
      if (!this._reserveGuaranteedSlot(spec, activeEnemies, activeTraffic)) return;
      if (!spec || !this._hasActiveCapacity(spec, activeTraffic)) return;

      const laneName = spec.lanes[0];
      const enemy = this._createTrafficEnemy(spec, laneName, FISH_LANES[laneName], false);
      if (enemy) {
        spawned.push(enemy);
        activeTraffic.push(enemy);
      }
    });
    return spawned;
  }

  _reserveGuaranteedSlot(spec, activeEnemies, activeTraffic) {
    if (!spec) return false;
    if (this._isLargeFishSpec(spec) && Number.isFinite(this._profile.maxActiveLargeFish)) {
      const activeLargeCount = activeTraffic.filter(enemy => {
        const activeSpec = FISH_DEFINITIONS.find(def => def.id === enemy._trafficType);
        return activeSpec && this._isLargeFishSpec(activeSpec);
      }).length;
      if (activeLargeCount >= this._profile.maxActiveLargeFish) {
        this._removeReplaceableTraffic(activeEnemies, activeTraffic, true);
      }
    }
    if (activeTraffic.length >= this._profile.maxActiveTraffic) {
      this._removeReplaceableTraffic(activeEnemies, activeTraffic, false);
    }
    return activeTraffic.length < this._profile.maxActiveTraffic && this._hasActiveCapacity(spec, activeTraffic);
  }

  _removeReplaceableTraffic(activeEnemies, activeTraffic, largeOnly) {
    const guaranteedIds = Object.keys(this._profile.guaranteedSpeciesIntervals || {});
    const removeIndex = activeEnemies.findIndex(enemy => {
      if (this._isCapturedEnemy(enemy)) return false;
      if (guaranteedIds.includes(enemy._trafficType)) return false;
      if (!largeOnly) return true;
      const activeSpec = FISH_DEFINITIONS.find(def => def.id === enemy._trafficType);
      return activeSpec && this._isLargeFishSpec(activeSpec);
    });
    if (removeIndex === -1) return null;
    const removed = activeEnemies.splice(removeIndex, 1)[0];
    const trafficIndex = activeTraffic.indexOf(removed);
    if (trafficIndex > -1) activeTraffic.splice(trafficIndex, 1);
    return removed;
  }

  _isCapturedEnemy(enemy) {
    return enemy && typeof enemy.isCaptured === 'function' && enemy.isCaptured();
  }

  _hasActiveTrafficType(type, activeEnemies) {
    return activeEnemies.some(enemy => enemy._trafficType === type);
  }

  _spawnForLane(laneName, laneDef, seeded, activeEnemies = []) {
    const candidates = FISH_DEFINITIONS.filter(def =>
      def.lanes.includes(laneName) &&
      (this._speciesCooldowns[def.id] || FISH_TRAFFIC_COOLDOWN_READY) <= FISH_TRAFFIC_COOLDOWN_READY &&
      this._hasActiveCapacity(def, activeEnemies)
    );
    if (!candidates.length) return null;

    const spec = this._weightedRandom(candidates);
    return this._createTrafficEnemy(spec, laneName, laneDef, seeded);
  }

  _createTrafficEnemy(spec, laneName, laneDef, seeded) {
    const enemy = this._enemyFactory.createEnemy(spec.id, this._game, this._ctx);
    if (!enemy) return null;

    this._applyTrafficState(enemy, spec, laneName, laneDef, seeded);
    this._applySpeciesCooldown(spec);
    this._resetGuaranteeTimer(spec.id);
    return enemy;
  }

  _resetGuaranteeTimer(id) {
    const intervals = this._profile.guaranteedSpeciesIntervals || {};
    if (Number.isFinite(intervals[id])) {
      this._guaranteeTimers[id] = intervals[id];
    }
  }

  _applySpeciesCooldown(spec) {
    const multipliers = this._profile.speciesCooldownMultipliers || {};
    const multiplier = multipliers[spec.id] || 1;
    this._speciesCooldowns[spec.id] = Math.max(
      FISH_TRAFFIC_TIMER_TICK,
      Math.round(spec.spawnFrequency * multiplier)
    );
  }

  _applyTrafficState(enemy, spec, laneName, laneDef, seeded) {
    const gameWidth = this._game.getSize().getWidth();
    const gameHeight = this._game.getSize().getHeight();
    const enemyWidth = enemy.getSize().getWidth();
    const enemyHeight = enemy.getSize().getHeight();
    const direction = laneDef.direction;
    const speed = this._randomSpeed(spec);
    const offsetY = Number.isFinite(spec.trafficOffsetY) ? spec.trafficOffsetY : 0;
    const maxY = Math.max(FISH_TRAFFIC_COOLDOWN_READY, gameHeight - enemyHeight);

    enemy._trafficLane = laneName;
    enemy._trafficType = spec.id;
    enemy._position = new Point(
      seeded ? this._seededX(gameWidth, enemyWidth) : this._spawnX(direction, gameWidth, enemyWidth),
      Math.min(maxY, Math.max(FISH_TRAFFIC_COOLDOWN_READY, this._laneY(laneDef, enemy) + offsetY))
    );
    enemy._direction = direction;
    enemy._driftSpeed = speed;
    enemy._speedX = direction * speed;
  }

  _weightedRandom(candidates, rng = this._rng) {
    const total = candidates.reduce((sum, def) => sum + def.spawnWeight, FISH_TRAFFIC_WEIGHT_THRESHOLD);
    let target = rng() * total;
    for (const candidate of candidates) {
      target -= candidate.spawnWeight;
      if (target <= FISH_TRAFFIC_WEIGHT_THRESHOLD) return candidate;
    }
    return candidates[candidates.length - FISH_TRAFFIC_LAST_INDEX_OFFSET];
  }

  _hasActiveCapacity(spec, activeEnemies) {
    if (this._isLargeFishSpec(spec) && Number.isFinite(this._profile.maxActiveLargeFish)) {
      const activeLargeCount = activeEnemies.filter(enemy => {
        const activeSpec = FISH_DEFINITIONS.find(def => def.id === enemy._trafficType);
        return activeSpec && this._isLargeFishSpec(activeSpec);
      }).length;
      if (activeLargeCount >= this._profile.maxActiveLargeFish) return false;
    }
    if (typeof spec.maxActive !== 'number') return true;
    const activeCount = activeEnemies.filter(enemy => enemy._trafficType === spec.id).length;
    return activeCount < spec.maxActive;
  }

  _isLargeFishSpec(spec) {
    return spec && [FISH_RARITY_RARE, FISH_RARITY_EPIC, FISH_RARITY_LEGENDARY].includes(spec.rarity);
  }

  _randomSpeed(spec) {
    const min = Math.min(spec.speedMin, spec.speedMax);
    const max = Math.max(spec.speedMin, spec.speedMax);
    return min + this._rng() * (max - min);
  }

  _spawnX(direction, gameWidth, enemyWidth) {
    return direction === FISH_TRAFFIC_DIRECTION_RIGHT ? -enemyWidth : gameWidth;
  }

  _seededX(gameWidth, enemyWidth) {
    const travelWidth = Math.max(FISH_TRAFFIC_COOLDOWN_READY, gameWidth - enemyWidth);
    return travelWidth * (FISH_TRAFFIC_SEED_X_MIN_FACTOR + this._rng() * FISH_TRAFFIC_SEED_X_RANGE_FACTOR);
  }

  _laneY(laneDef, enemy) {
    const gameHeight = this._game.getSize().getHeight();
    const enemyHeight = enemy.getSize().getHeight();
    const absoluteMax = Math.max(FISH_TRAFFIC_COOLDOWN_READY, gameHeight - enemyHeight);
    const waterSurfaceY = this._profile.waterSurfaceFactor
      ? gameHeight * this._profile.waterSurfaceFactor
      : WATER_SURFACE_Y;
    const laneMin = Math.max(waterSurfaceY, gameHeight * laneDef.yMin);
    const laneMax = gameHeight * laneDef.yMax - enemyHeight;
    const minY = Math.min(laneMin, absoluteMax);
    const maxY = Math.min(Math.max(minY, laneMax), absoluteMax);
    return minY + this._rng() * (maxY - minY);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FishSpawner };
}

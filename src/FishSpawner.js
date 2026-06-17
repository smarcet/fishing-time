class FishSpawner {
  constructor(game, ctx, enemyFactory, options = {}) {
    this._game = game;
    this._ctx = ctx;
    this._enemyFactory = enemyFactory;
    this._rng = options.rng || Math.random;
    this._preseedPerLane = options.preseedPerLane ?? FISH_TRAFFIC_DEFAULT_PRESEED_PER_LANE;
    this._initialLaneTimer = options.initialLaneTimer;
    this._laneTimers = {};
    this._speciesCooldowns = {};
    this._pending = [];

    Object.entries(FISH_LANES).forEach(([laneName, laneDef]) => {
      this._laneTimers[laneName] = this._initialLaneTimer ?? this._nextLaneDelay(laneDef);
      for (let i = FISH_TRAFFIC_QUEUE_START_INDEX; i < this._preseedPerLane; i += FISH_TRAFFIC_TIMER_TICK) {
        const enemy = this._spawnForLane(laneName, laneDef, true);
        if (enemy) this._pending.push(enemy);
      }
    });
  }

  update(activeEnemies = []) {
    const spawned = this._pending.splice(FISH_TRAFFIC_QUEUE_START_INDEX);
    const activeTraffic = activeEnemies.concat(spawned);
    this._tickCooldowns();

    Object.entries(FISH_LANES).forEach(([laneName, laneDef]) => {
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

  _tickCooldowns() {
    Object.keys(this._speciesCooldowns).forEach(id => {
      this._speciesCooldowns[id] = Math.max(
        FISH_TRAFFIC_COOLDOWN_READY,
        this._speciesCooldowns[id] - FISH_TRAFFIC_TIMER_TICK
      );
    });
  }

  _nextLaneDelay(laneDef) {
    const jitter = Math.floor(this._rng() * Math.max(FISH_TRAFFIC_MIN_TIMER_JITTER, laneDef.spawnInterval));
    return laneDef.spawnInterval + jitter;
  }

  _spawnForLane(laneName, laneDef, seeded, activeEnemies = []) {
    const candidates = FISH_DEFINITIONS.filter(def =>
      def.lanes.includes(laneName) &&
      (this._speciesCooldowns[def.id] || FISH_TRAFFIC_COOLDOWN_READY) <= FISH_TRAFFIC_COOLDOWN_READY &&
      this._hasActiveCapacity(def, activeEnemies)
    );
    if (!candidates.length) return null;

    const spec = this._weightedRandom(candidates);
    const enemy = this._enemyFactory.createEnemy(spec.id, this._game, this._ctx);
    if (!enemy) return null;

    this._applyTrafficState(enemy, spec, laneName, laneDef, seeded);
    this._speciesCooldowns[spec.id] = spec.spawnFrequency;
    return enemy;
  }

  _applyTrafficState(enemy, spec, laneName, laneDef, seeded) {
    const gameWidth = this._game.getSize().getWidth();
    const enemyWidth = enemy.getSize().getWidth();
    const direction = laneDef.direction;
    const speed = this._randomSpeed(spec);

    enemy._trafficLane = laneName;
    enemy._trafficType = spec.id;
    enemy._position = new Point(
      seeded ? this._seededX(gameWidth, enemyWidth) : this._spawnX(direction, gameWidth, enemyWidth),
      this._laneY(laneDef, enemy)
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
    if (typeof spec.maxActive !== 'number') return true;
    const activeCount = activeEnemies.filter(enemy => enemy._trafficType === spec.id).length;
    return activeCount < spec.maxActive;
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
    const laneMin = Math.max(WATER_SURFACE_Y, gameHeight * laneDef.yMin);
    const laneMax = gameHeight * laneDef.yMax - enemyHeight;
    const minY = Math.min(laneMin, absoluteMax);
    const maxY = Math.min(Math.max(minY, laneMax), absoluteMax);
    return minY + this._rng() * (maxY - minY);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { FishSpawner };
}

// Player sprite geometry
const PLAYER_SPRITE_H        = 315.6;
const PLAYER_SPRITE_W        = 404.75;
const PLAYER_INIT_X          = 100;
const PLAYER_INIT_Y          = -10;

// Layer parallax speeds (0.0 = static, named only where non-obvious)
const LAYER_SPEED_CLOUD      = 0.1;
const LAYER_SPEED_OCEAN      = 0.2;

// Game result overlay
const RESULT_OVERLAY         = 'rgba(0,0,0,0.55)';
const RESULT_FONT            = 'bold 96px monospace';
const RESULT_STROKE_W        = 5;
const RESULT_WIN_COLOR       = '#00ff44';
const RESULT_LOSE_COLOR      = '#ff2244';
const RESULT_PULSE_MS        = 500;
const RESULT_GLOW_MIN        = 20;
const RESULT_GLOW_MAX        = 60;

class Game extends GameObject{

  constructor(ctx, size, options = {}) {
    super(ctx, size);
    this._profile = options.profile || GAMEPLAY_PROFILE_DESKTOP;
    this._paused = false;
    const w = this._size.getWidth();
    const h = this._size.getHeight();
    this._layers = [
      new Layer(document.getElementById('sky'),    w, h, 0.0),
      new Layer(document.getElementById('cloud'),  w, h, LAYER_SPEED_CLOUD),
      new Layer(document.getElementById('ocean'),  w, h, LAYER_SPEED_OCEAN),
      new Layer(document.getElementById('ocean1'), w, h, 0.0),
      new Layer(document.getElementById('ocean2'), w, h, 0.0),
      new Layer(document.getElementById('ground'), w, h, 0.0),
      new Layer(document.getElementById('ground2'),w, h, 0.0),
      new Layer(document.getElementById('ground3'),w, h, 0.0),
    ];
    this._enemyFactory = new EnemyFactory(this._profile);
    this._fishSpawner = new FishSpawner(this, ctx, this._enemyFactory, {
      profile: this._profile,
      preseedPerLane: this._profile.preseedPerLane,
    });
    this._player = new Player(this, ctx, new Size(PLAYER_SPRITE_H, PLAYER_SPRITE_W), new Point(PLAYER_INIT_X, PLAYER_INIT_Y))
    this._enemies = [];
    this._bubbles = [];

    this._debug = false;
    this._keys = [];

    this._inputHandler = options.inputSystem || new InputHandler(this);
    this._inputSystem = this._inputHandler;
    this._scoreSystem = new ScoreSystem();
    this._reelPowerBar = new ReelPowerBar();
    this._timerSystem    = new TimerSystem(ctx, size);
    this._gameResult     = null;
    this._resultElapsed  = 0;
    this._handleTimeUp = () => {
      if (this._gameResult !== null) return;
      this._gameResult = this._scoreSystem.getScore() >= GAME_NEEDED_SCORE ? 'win' : 'lose';
    };
    if (typeof document !== 'undefined') {
      document.addEventListener(EVENT_TIMER_TIMEUP, this._handleTimeUp);
    }
    this._audioSystem = new AudioSystem();
    this._applyProfileScales();
  }

  isDebug(){
    return this._debug;
  }

  releaseEnemy(enemy) {
    if (!this._enemies.includes(enemy)) {
      this._enemies.push(enemy);
    }
  }

  update(dt = 0){
    super.update();
    if (this._paused) return;
    this._timerSystem.update(dt);
    this._scoreSystem.update();
    if (this._gameResult !== null) { this._resultElapsed += dt; return; }
    this._reelPowerBar.update();
    this._layers.forEach(l => l.update());

    // clear dead bubbles and off-screen escaped fish
    this._bubbles = this._bubbles.filter(b => b.isLive());
    this._enemies.forEach(f => {
      if (f.isOffScreen() && !f.isCaptured() && f._hasEscaped && typeof document !== 'undefined') {
        document.dispatchEvent(new CustomEvent(EVENT_ENEMY_EVADED, { detail: { enemyType: f.constructor.name } }));
      }
    });
    this._enemies = this._enemies.filter(f => !f.isCaptured() && !f.isOffScreen());
    const spawnedEnemies = this._fishSpawner.update(this._enemies, dt);
    if (spawnedEnemies.length) this._enemies.push(...spawnedEnemies);

    // add bubbles
    if(!this._bubbles.length) {
      const bubbleBatchSize = this._profile.bubbleBatchSize || BUBBLE_BATCH_SIZE;
      const bubbleSizeScale = this._profile.bubbleSizeScale || 1;
      for (let j = 0; j < bubbleBatchSize; j++) {
        let x = Math.random() * (this._size.getWidth() - BUBBLE_SPAWN_X_MIN) + BUBBLE_SPAWN_X_MIN;
        let h = (Math.random() * (BUBBLE_SIZE_MAX - BUBBLE_SIZE_MIN) + BUBBLE_SIZE_MIN) * bubbleSizeScale;
        this._bubbles.push(
          new Bubble
          (
            this,
            this._ctx,
            new Size(h, h),
            new Point(x, this._size.getHeight()),
            document.getElementById('bubble'),
          )
        );
      }
    }

    this._bubbles.forEach(b => {
      b.update();
      if(b.getPosition().getY() <= this._getBubbleDieThresholdY()){
        b.startDying();
      }
    });

    this._player.update(dt);

    this._enemies.forEach(e => {
      e.update();
      if(this.checkCollision(this._player.getHook(), e) && this._player.getHook().isCasting())
      {
        console.log(`collision detected`, e);
        this._player.getHook().setCatch(e);
      }
    });

  }

  draw(){
    super.draw();
    this._ctx.filter = 'none';
    this._ctx.clearRect(0, 0, this._size.getWidth(),  this._size.getHeight());
    this._layers.forEach(l => l.draw(this._ctx));

    this._player.draw();
    this._enemies.forEach(e => e.draw());
    this._bubbles.forEach(e => e.draw());
    this._scoreSystem.draw(this._ctx, this._size.getWidth());
    this._reelPowerBar.draw(this._ctx);
    this._timerSystem.draw();
    if (this._gameResult !== null) this._drawGameResult();
  }

  _drawGameResult() {
    const ctx   = this._ctx;
    const w     = this._size.getWidth();
    const h     = this._size.getHeight();
    const text  = this._gameResult === 'win' ? 'YOU WIN!' : 'GAME OVER';
    const color = this._gameResult === 'win' ? RESULT_WIN_COLOR : RESULT_LOSE_COLOR;
    const pulse = Math.abs(Math.sin(this._resultElapsed / RESULT_PULSE_MS * Math.PI));
    ctx.save();
    ctx.fillStyle = RESULT_OVERLAY;
    ctx.fillRect(0, 0, w, h);
    ctx.font         = RESULT_FONT;
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth    = RESULT_STROKE_W;
    ctx.strokeStyle  = 'black';
    ctx.shadowColor  = color;
    ctx.shadowBlur   = RESULT_GLOW_MIN + RESULT_GLOW_MAX * pulse;
    ctx.fillStyle    = color;
    ctx.strokeText(text, w / 2, h / 2);
    ctx.fillText(text, w / 2, h / 2);
    ctx.restore();
  }

  destroy() {
    if (typeof document !== 'undefined') {
      document.removeEventListener(EVENT_TIMER_TIMEUP, this._handleTimeUp);
    }
    if (this._player && this._player.getHook && this._player.getHook().destroy) {
      this._player.getHook().destroy();
    }
    if (this._inputSystem && this._inputSystem.destroy) {
      this._inputSystem.destroy();
    }
    if (this._scoreSystem && this._scoreSystem.destroy) this._scoreSystem.destroy();
    if (this._reelPowerBar && this._reelPowerBar.destroy) this._reelPowerBar.destroy();
    if (this._audioSystem && this._audioSystem.destroy) this._audioSystem.destroy();
  }

  setPaused(paused) {
    this._paused = paused === true;
  }

  isPaused() {
    return this._paused;
  }

  resize(size, profile = this._profile, options = {}) {
    this._size = size;
    this._profile = profile || this._profile;
    this._layers.forEach(layer => {
      layer.width = size.getWidth();
      layer.height = size.getHeight();
    });
    if (this._timerSystem && this._timerSystem.resize) this._timerSystem.resize(size);
    if (this._fishSpawner && this._fishSpawner.setProfile) this._fishSpawner.setProfile(this._profile);
    if (this._enemyFactory && this._enemyFactory.setProfile) this._enemyFactory.setProfile(this._profile);
    this._applyProfileScales();
    this._clampPlayerToBounds();
    if (options.resetTraffic) this._resetTrafficForResize();
  }

  _applyProfileScales() {
    const playerScale = this._profile && this._profile.playerScale ? this._profile.playerScale : 1;
    const hudScale = this._profile && this._profile.hudScale ? this._profile.hudScale : 1;
    if (this._player && typeof this._player.setDisplayScale === 'function') {
      this._player.setDisplayScale(playerScale);
    }
    if (this._player && typeof this._player.setProfileYOffset === 'function') {
      this._player.setProfileYOffset(this._resolvePlayerYOffset());
    }
    if (this._timerSystem && typeof this._timerSystem.setScale === 'function') {
      this._timerSystem.setScale(hudScale);
    }
    if (this._scoreSystem && typeof this._scoreSystem.setScale === 'function') {
      this._scoreSystem.setScale(hudScale);
    }
  }

  _resolvePlayerYOffset() {
    if (!this._profile) return 0;
    const baseOffset = this._profile.playerYOffset || 0;
    const shortEdgeBase = this._profile.playerYOffsetShortEdgeBase;
    const shortEdgeSlope = this._profile.playerYOffsetShortEdgeSlope;
    const maxOffset = this._profile.playerYOffsetMax;
    if (
      Number.isFinite(shortEdgeBase) &&
      Number.isFinite(shortEdgeSlope)
    ) {
      const shortEdge = Math.min(this._size.getWidth(), this._size.getHeight());
      const responsiveOffset = baseOffset + Math.max(0, shortEdge - shortEdgeBase) * shortEdgeSlope;
      return Math.round(Number.isFinite(maxOffset)
        ? Math.min(maxOffset, responsiveOffset)
        : responsiveOffset);
    }
    return baseOffset;
  }

  _clampPlayerToBounds() {
    if (!this._player || !this._player._position || !this._player.getSize) return;
    const playerWidth = this._player.getSize().getWidth();
    const maxX = Math.max(0, this._size.getWidth() - playerWidth);
    const x = Math.min(maxX, Math.max(0, this._player._position.getX()));
    this._player._position = new Point(x, this._player._position.getY());
  }

  _resetTrafficForResize() {
    this._enemies = this._enemies.filter(enemy => typeof enemy.isCaptured === 'function' && enemy.isCaptured());
    this._bubbles = [];
  }

  _getBubbleDieThresholdY() {
    if (this._profile && this._profile.bubbleDieThresholdFactor) {
      return this._size.getHeight() * this._profile.bubbleDieThresholdFactor;
    }
    return BUBBLE_DIE_THRESHOLD_Y;
  }

  getRuntimeStats() {
    const activeLargeFish = this._enemies.filter(enemy => {
      return enemy._trafficType && [
        ENEMY_TYPE_HAMMERHEAD_SHARK,
        ENEMY_TYPE_SWORDFISH,
        ENEMY_TYPE_TUNA,
        ENEMY_TYPE_SHARK,
      ].includes(enemy._trafficType);
    }).length;
    return {
      profileName: this._profile ? this._profile.name : 'unknown',
      paused: this._paused === true,
      activeTraffic: this._enemies.length,
      activeLargeFish,
      activeTrafficTypes: this._enemies.map(enemy => enemy._trafficType).filter(Boolean),
      bubbles: this._bubbles.length,
      playerX: this._player && this._player.getPosition ? this._player.getPosition().getX() : undefined,
      playerY: this._player && this._player.getPosition ? this._player.getPosition().getY() : undefined,
      canvasWidth: this._size.getWidth(),
      canvasHeight: this._size.getHeight(),
      maxActiveTraffic: this._profile ? this._profile.maxActiveTraffic : undefined,
      maxActiveLargeFish: this._profile ? this._profile.maxActiveLargeFish : undefined,
      spriteScale: this._profile ? this._profile.spriteScale : undefined,
      playerScale: this._profile ? this._profile.playerScale : undefined,
      hudScale: this._profile ? this._profile.hudScale : undefined,
      playerYOffset: this._profile ? this._profile.playerYOffset : undefined,
      bubbleSizeScale: this._profile ? this._profile.bubbleSizeScale : undefined,
      bubbleDieThresholdY: this._getBubbleDieThresholdY(),
      guaranteedSpeciesIntervals: this._profile ? this._profile.guaranteedSpeciesIntervals : undefined,
    };
  }

  forceHookedFishForE2E(enemyType = ENEMY_TYPE_CLOWN_FISH) {
    const hook = this._player.getHook();
    const enemy = this._enemyFactory.createEnemy(enemyType, this, this._ctx);
    if (!hook || !enemy) {
      return { hooked: false, enemyType: null, runtimeStats: this.getRuntimeStats() };
    }
    hook._ropeLength = Math.max(hook._ropeLength, HOOK_REST_LENGTH + 220);
    hook.setCatch(enemy);
    return {
      hooked: hook.isHooked(),
      enemyType: enemy.constructor.name,
      runtimeStats: this.getRuntimeStats(),
    };
  }

  addKey(key){
    if(this._keys.indexOf(key) === -1)
      this._keys.push(key);
  }

  removeKey(key){
    if(this._keys.indexOf(key) > -1)
      this._keys.splice(this._keys.indexOf(key) , 1);
  }

  hasKey(key){
    if (this._inputSystem && this._inputSystem.hasKey) return this._inputSystem.hasKey(key);
    return this._keys.indexOf(key) > -1;
  }

  checkCollision(obj1, obj2){
    let res = (
        obj1.getPosition().getX() < obj2.getPosition().getX() + obj2.getSize().getWidth() &&
        obj1.getPosition().getX() + obj1.getSize().getWidth() > obj2.getPosition().getX() &&
        obj1.getPosition().getY() < obj2.getPosition().getY() + obj2.getSize().getHeight() &&
        obj1.getPosition().getY() + obj1.getSize().getHeight() > obj2.getPosition().getY()
    );
    return res;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Game };
}

// Player sprite geometry
const PLAYER_SPRITE_H        = 315.6;
const PLAYER_SPRITE_W        = 404.75;
const PLAYER_INIT_X          = 100;
const PLAYER_INIT_Y          = -10;

// Layer parallax speeds (0.0 = static, named only where non-obvious)
const LAYER_SPEED_CLOUD      = 0.1;
const LAYER_SPEED_OCEAN      = 0.2;

// Enemy spawn counts
const ENEMY_COUNT_BUTTERFLY  = 3;
const ENEMY_COUNT_LION_FISH  = 2;
const ENEMY_COUNT_CLOWN_FISH = 10;

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

  constructor(ctx, size) {
    super(ctx, size);
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
    this._enemyFactory = new EnemyFactory();
    this._player = new Player(this, ctx, new Size(PLAYER_SPRITE_H, PLAYER_SPRITE_W), new Point(PLAYER_INIT_X, PLAYER_INIT_Y))
    this._enemies = [];
    this._bubbles = [];

    this._enemies.push(this._enemyFactory.createEnemy(ENEMY_TYPE_OCTOPUS, this, ctx));
    this._enemies.push(this._enemyFactory.createEnemy(ENEMY_TYPE_CRAB, this, ctx));

    for (let i = 0; i < ENEMY_COUNT_BUTTERFLY; i++) {
      this._enemies.push(this._enemyFactory.createEnemy(ENEMY_TYPE_BUTTERFLY_FISH, this, ctx));
    }

    for (let i = 0; i < ENEMY_COUNT_LION_FISH; i++) {
      this._enemies.push(this._enemyFactory.createEnemy(ENEMY_TYPE_LION_FISH, this, ctx));
    }

    for (let i = 0; i < ENEMY_COUNT_CLOWN_FISH; i++) {
      this._enemies.push(this._enemyFactory.createEnemy(ENEMY_TYPE_CLOWN_FISH, this, ctx));
    }

    this._enemies.push(this._enemyFactory.createEnemy(ENEMY_TYPE_HAMMERHEAD_SHARK, this, ctx));
    this._enemies.push(this._enemyFactory.createEnemy(ENEMY_TYPE_SHARK, this, ctx));
    this._enemies.push(this._enemyFactory.createEnemy(ENEMY_TYPE_SWORDFISH, this, ctx));
    this._enemies.push(this._enemyFactory.createEnemy(ENEMY_TYPE_TUNA, this, ctx));
    this._enemies.push(this._enemyFactory.createEnemy(ENEMY_TYPE_DISCARDED_BOTTLE, this, ctx));

    this._debug = false;
    this._keys = [];

    this._inputHandler = new InputHandler(this);
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
    this._timerSystem.update(dt);
    this._scoreSystem.update();
    if (this._gameResult !== null) { this._resultElapsed += dt; return; }
    this._reelPowerBar.update();
    this._layers.forEach(l => l.update());

    // clear dead bubbles and off-screen escaped fish
    this._bubbles = this._bubbles.filter(b => b.isLive());
    this._enemies.forEach(f => {
      if (f.isOffScreen() && !f.isCaptured()) {
        document.dispatchEvent(new CustomEvent(EVENT_ENEMY_EVADED, { detail: { enemyType: f.constructor.name } }));
      }
    });
    this._enemies = this._enemies.filter(f => !f.isCaptured() && !f.isOffScreen());

    // add bubbles
    if(!this._bubbles.length) {
      for (let j = 0; j < BUBBLE_BATCH_SIZE; j++) {
        let x = Math.random() * (this._size.getWidth() - BUBBLE_SPAWN_X_MIN) + BUBBLE_SPAWN_X_MIN;
        let h = Math.random() * (BUBBLE_SIZE_MAX - BUBBLE_SIZE_MIN) + BUBBLE_SIZE_MIN;
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
      if(b.getPosition().getY() <= BUBBLE_DIE_THRESHOLD_Y){
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

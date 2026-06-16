class Game extends GameObject{

  constructor(ctx, size) {
    super(ctx, size);
    const w = this._size.getWidth();
    const h = this._size.getHeight();
    this._layers = [
      new Layer(document.getElementById('sky'),    w, h, 0.0),
      new Layer(document.getElementById('cloud'),  w, h, 0.1),
      new Layer(document.getElementById('ocean'),  w, h, 0.2),
      new Layer(document.getElementById('ocean1'), w, h, 0.0),
      new Layer(document.getElementById('ocean2'), w, h, 0.0),
      new Layer(document.getElementById('ground'), w, h, 0.0),
      new Layer(document.getElementById('ground2'),w, h, 0.0),
      new Layer(document.getElementById('ground3'),w, h, 0.0),
    ];
    this._enemyFactory = new EnemyFactory();
    this._player = new Player(this, ctx, new Size(315.6, 404.75), new Point(100, -10))
    this._enemies = [];
    this._bubbles = [];

    this._enemies.push(this._enemyFactory.createEnemy(ENEMY_TYPE_OCTOPUS, this, ctx));
    this._enemies.push(this._enemyFactory.createEnemy(ENEMY_TYPE_CRAB, this, ctx));

    for (let i = 0; i < 3; i++) {
      this._enemies.push(this._enemyFactory.createEnemy(ENEMY_TYPE_BUTTERFLY_FISH, this, ctx));
    }

    for (let i = 0; i < 2; i++) {
      this._enemies.push(this._enemyFactory.createEnemy(ENEMY_TYPE_LION_FISH, this, ctx));
    }

    for (let i = 0; i < 10; i++) {
      this._enemies.push(this._enemyFactory.createEnemy(ENEMY_TYPE_CLOWN_FISH, this, ctx));
    }

    this._enemies.push(this._enemyFactory.createEnemy(ENEMY_TYPE_HAMMERHEAD_SHARK, this, ctx));
    this._enemies.push(this._enemyFactory.createEnemy(ENEMY_TYPE_SWORDFISH, this, ctx));
    this._enemies.push(this._enemyFactory.createEnemy(ENEMY_TYPE_TUNA, this, ctx));
    this._enemies.push(this._enemyFactory.createEnemy(ENEMY_TYPE_DISCARDED_BOTTLE, this, ctx));

    this._debug = false;
    this._keys = [];

    this._inputHandler = new InputHandler(this);
    this._scoreSystem = new ScoreSystem();
    this._reelPowerBar = new ReelPowerBar();
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
    this._scoreSystem.update();
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

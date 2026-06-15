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
    this._enemies_images = [];
    this._enemies_images.push(document.getElementById("fish1"));
    this._enemies_images.push(document.getElementById("fish2"));
    this._enemies_images.push(document.getElementById("fish3"));


    this._enemies.push(this._enemyFactory.createEnemy('octopus', this, ctx));
    this._enemies.push(this._enemyFactory.createEnemy('crab', this, ctx));

    for(let i = 0; i < 5 ; i++){
      this._enemies.push(
        new Fish(
          this,
          ctx,
          new Size(FISH_FRAME_HEIGHT, FISH_FRAME_WIDTH),
          new Point(
            Fish.randomSpawnX(this._size.getWidth(), FISH_FRAME_WIDTH),
            Fish.randomSpawnY(this._size.getHeight(), FISH_FRAME_HEIGHT)
          ),
          document.getElementById('fish1_sprite'),
          FISH_MAX_FRAME_X
        )
      );
    }

    for(let i = 0; i < 1; i++){
      this._enemies.push(
        new Trash
        (
          this,
          ctx,
          new Size(92 , 76),
          new Point(0, 300),
          document.getElementById('bottle_1_sprite'),
          10
        )
      );
    }

    this._debug = false;
    this._keys = [];

    this._inputHandler = new InputHandler(this);
  }

  isDebug(){
    return this._debug;
  }

  update(){
    super.update();
    this._layers.forEach(l => l.update());

    // clear dead bubbles
    this._bubbles = this._bubbles.filter(b => b.isLive());
    this._enemies =  this._enemies.filter(f => !f.isCaptured());

    // add bubbles
    if(!this._bubbles.length) {
      for (let j = 0; j < 15; j++) {
        let x = Math.random() * (this._size.getWidth() - 200) + 200;
        let h = Math.random() * (64 - 16) + 16;
        this._bubbles.push(
          new Bubble
          (
            this,
            this._ctx,
            new Size(h, h),
            new Point(x, this._size.getHeight()),
          )
        );
      }
    }

    this._bubbles.forEach(b => {
      b.update();
      if(b.getPosition().getY() <= 300){
        console.log(`marking dead bubble`);
        b.markDead();
      }
    });

    this._player.update();

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

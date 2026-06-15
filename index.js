const KEY_ARROW_UP = 'ArrowUp';
const KEY_ARROW_DOWN = 'ArrowDown';
const KEY_ARROW_LEFT = 'ArrowLeft';
const KEY_ARROW_RIGHT = 'ArrowRight';
const KEY_SPACE = ' ';
const AllowedKeys = [KEY_ARROW_UP,  KEY_ARROW_DOWN, KEY_ARROW_LEFT, KEY_ARROW_RIGHT, KEY_SPACE];

const ANIM_BOB_AMPLITUDE   = 12;     // px - vertical sine wave height
const ANIM_BOB_SPEED       = 0.08;   // rad/tick - phase advance per frame (~1.3s period at 60fps)
const ANIM_MAX_TILT_ANGLE  = 0.1745; // rad - max rock angle (~10 deg)
const ANIM_STAGGER_SLOW    = 6;      // ticks per sprite frame (bottle, octopus)
const DRIFT_SPEED_SLOW     = 0.6;    // px/tick (trash/bottle)
const DRIFT_SPEED_DEFAULT  = 1.5;    // px/tick (fish, octopus default)

class Size {
  constructor(h, w) {
    this._h = h;
    this._w = w;
  }

  getWidth(){return this._w}
  getHeight(){return this._h;}
}

class Point {
  constructor(x, y) {
    this._x = x;
    this._y = y;
  }

  getX(){return this._x}
  getY(){return this._y;}
}

class InputHandler {
  constructor(game) {
    this._game = game;

    window.addEventListener('keydown', (e) => {
      console.log(`InputHandler keydown`, e.key);
      if(AllowedKeys.indexOf(e.key) > -1)
        this._game.addKey(e.key);
    });

    window.addEventListener('keyup', (e) => {
       console.log(e.key);
       this._game.removeKey(e.key);
    });
  }
}

class GameObject {

  constructor(ctx, size, position = new Point(0, 0)) {
    this._size = size;
    this._ctx = ctx;
    this._position = position;
    this._isLive = true;
  }

  getPosition(){
    return this._position;
  }

  getSize(){
    return this._size;
  }

  update(){}

  draw(){}

  markDead(){ this._isLive = false};

  isLive(){ return this._isLive;}
}

class Sprite {
  constructor(image, size, position, ctx) {
    this._size = size;
    this._position = position;
    this._image = image;
    this._ctx = ctx;
  }

  draw(){
      this._ctx.drawImage(this._image, )
  }
}

class Animation {
  constructor(ctx, staggerFrame = 5) {
    this._sprites = [];
    this._ctx = ctx;
    this._staggerFrame =staggerFrame;
    this._currentFrame = 0;
  }
  addSprite(s){
    this._sprites.push(s)
  }

  run(){
    ++this._currentFrame;
  }
}

class Enemy extends GameObject{
  constructor(game, ctx, size, position, image) {
    super(ctx, size, position)
    this._game = game;
    this._speedX  = 0;
    this._image = image;
    this._direction = null;
    this._status = null;
    this._hook = null;
    this._driftSpeed = DRIFT_SPEED_DEFAULT;
  }

  update(){
    super.update();
    const formerPosition = this._position;
    const rBound = formerPosition.getX() + this._size.getWidth();
    const lBound = formerPosition.getX();

    if(rBound >= this._game.getSize().getWidth()) {
      this._speedX = -this._driftSpeed;
      this._direction = -1;
    }
    if(lBound === 0) {
      this._speedX = this._driftSpeed;
      this._direction = 1;
    }

    this._position = new Point(formerPosition.getX() + this._speedX, formerPosition.getY());
  }

  draw(){
    super.draw();
    //this._ctx.fillStyle = 'red';
    //this._ctx.fillRect(this._position.getX(), this._position.getY(), this._size.getWidth(), this._size.getHeight());
    this._ctx.drawImage(this._image, this._position.getX(), this._position.getY(), this._size.getWidth(), this._size.getHeight())
  }

  captured(hook){
    this._hook = hook;
    this._status = 'CAPTURED';
  }

  isCaptured(){
    return this._status === 'CAPTURED';
  }
}

class EnemyWithAnimation extends Enemy {

   constructor(game, ctx, size, position, image, maxFrameX, maxFrameY, dieFrameX, dieFrameY) {
     super(game, ctx, size, position, image);
     // this is frame 1
     this._frameX = 0;
     this._frameY = 0;
     this._maxFrameX = maxFrameX;
     this._maxFrameY = maxFrameY;
     this._dieFrameX = dieFrameX;
     this._dieFrameY = dieFrameY;
     this._opacity = 1;
     this._direction = null;
     this._staggerFrame = 1;
     this._tick = 0;
   }

  update() {

    super.update();
    // frames
    if (++this._tick % this._staggerFrame === 0) {
      if (this._frameX < this._maxFrameX -1 ) {
        ++this._frameX;
      } else {
        this._frameX = 0;
        if (this._frameY < this._maxFrameY -1 ) {
          ++this._frameY
        } else {
          this._frameY = 0;
        }
      }
    }
    const rBound = this.getPosition().getX() + this._size.getWidth();

    /*
    if((this._game.getSize().getWidth() - rBound ) < 10 && this._opacity > 0 ) {
      this._opacity = this._opacity - 0.01;
    }
    else{
      this._opacity = 1;
    }
     */
  }


  draw(){

    const w = this._size.getWidth();
    const h =  this._size.getHeight();
    const dx = this._position.getX();
    const dy = this._position.getY()

    if(this._status === 'CAPTURED'){
      //this._ctx.filter =  "sepia(1) drop-shadow(-9px 9px 3px #e81)";
      this._ctx.drawImage
      (
        this._image,
        this._dieFrameX * w,
        this._dieFrameY * h,
        w,
        h,
        this._hook.getPosition().getX(),
        this._hook.getPosition().getY(),
        w,
        h);
      return;
    }

    // this._ctx.filter = `opacity(${this._opacity})`;
    // debug
    if(this._game.isDebug()) {
      this._ctx.fillStyle = 'red';
      this._ctx.font = "16px serif";
      this._ctx.fillText(`X ${dx} `, 10, 200);
      this._ctx.fillText(`Y ${dy} `, 10, 220);
      this._ctx.fillRect(this._position.getX(), this._position.getY(), this._size.getWidth(), this._size.getHeight());
    }

    this._ctx.drawImage
    (
      this._image,
      this._frameX * w,
      this._frameY * h,
      //h * (this._direction === 1 ? 1 : 0),
      w,
      h,
      dx,
      dy,
      w,
      h)
  }
}

class Trash extends EnemyWithAnimation {

  constructor(game, ctx, size, position, image, maxFrames) {
    super(game, ctx, size, position, image, maxFrames);
    this._staggerFrame = ANIM_STAGGER_SLOW;
    this._driftSpeed = DRIFT_SPEED_SLOW;
    this._bobAmplitude = ANIM_BOB_AMPLITUDE;
    this._bobSpeed = ANIM_BOB_SPEED;
    this._maxAngle = ANIM_MAX_TILT_ANGLE;
    this._bobPhase = 0;
    this._bobOffset = 0;
    this._angle = 0;
  }

  update() {
    super.update();
    this._bobPhase += this._bobSpeed;
    this._bobOffset = this._bobAmplitude * Math.sin(this._bobPhase);
    this._angle = this._maxAngle * Math.cos(this._bobPhase);
  }

  getPosition() {
    const p = super.getPosition();
    return new Point(p.getX(), p.getY() + this._bobOffset);
  }

  draw(){
    const w = this._size.getWidth();
    const h =  this._size.getHeight();
    const dx = this._position.getX();
    const dy = this._position.getY();

    if(this._status === 'CAPTURED'){
      this._ctx.drawImage
      (
        this._image,
        0,
        0,
        w,
        h,
        this._hook.getPosition().getX(),
        this._hook.getPosition().getY(),
        w,
        h);
      return;
    }

    // debug
    if(this._game.isDebug()) {
      this._ctx.fillStyle = 'red';
      this._ctx.font = "16px serif";
      this._ctx.fillText(`X ${dx} `, 10, 200);
      this._ctx.fillText(`Y ${dy} `, 10, 220);
      this._ctx.fillRect(dx, dy + this._bobOffset, w, h);
    }

    this._ctx.save();
    this._ctx.translate(dx + w / 2, dy + this._bobOffset + h / 2);
    this._ctx.rotate(this._angle);
    this._ctx.drawImage(this._image, this._frameX * w, 0, w, h, -w / 2, -h / 2, w, h);
    this._ctx.restore();
  }
}

class Octopus extends EnemyWithAnimation {

  constructor(game, ctx, size, position, image, maxFrameX, maxFrameY, dieFrameX, dieFrameY, spriteFrameSize) {
    super(game, ctx, size, position, image, maxFrameX, maxFrameY, dieFrameX, dieFrameY);
    // spriteFrameSize holds the natural spritesheet cell dimensions, which can differ
    // from the display size when the octopus is rendered at a scaled-down size.
    this._spriteFrameSize = spriteFrameSize || size;
    this._sw = this._spriteFrameSize.getWidth();
    this._sh = this._spriteFrameSize.getHeight();
    this._staggerFrame = ANIM_STAGGER_SLOW;
    this._bobAmplitude = ANIM_BOB_AMPLITUDE;
    this._bobSpeed = ANIM_BOB_SPEED;
    this._maxAngle = ANIM_MAX_TILT_ANGLE;
    this._bobPhase = 0;
    this._bobOffset = 0;
    this._angle = 0;
  }

  update() {
    super.update();
    this._bobPhase += this._bobSpeed;
    this._bobOffset = this._bobAmplitude * Math.sin(this._bobPhase);
    this._angle = this._maxAngle * Math.cos(this._bobPhase);
  }

  getPosition() {
    const p = super.getPosition();
    return new Point(p.getX(), p.getY() + this._bobOffset);
  }

  draw() {
    const w  = this._size.getWidth();
    const h  = this._size.getHeight();
    const sw = this._sw;
    const sh = this._sh;
    const dx = this._position.getX();
    const dy = this._position.getY();

    if (this._status === 'CAPTURED') {
      this._ctx.drawImage(
        this._image,
        this._dieFrameX * sw, this._dieFrameY * sh, sw, sh,
        this._hook.getPosition().getX(), this._hook.getPosition().getY(), w, h
      );
      return;
    }

    if (this._game.isDebug()) {
      this._ctx.fillStyle = 'red';
      this._ctx.font = '16px serif';
      this._ctx.fillText(`X ${dx} `, 10, 200);
      this._ctx.fillText(`Y ${dy + this._bobOffset} `, 10, 220);
      this._ctx.fillRect(dx, dy + this._bobOffset, w, h);
    }

    const flipX = this._direction === -1 ? -1 : 1;
    this._ctx.save();
    this._ctx.translate(dx + w / 2, dy + this._bobOffset + h / 2);
    this._ctx.scale(flipX, 1);
    this._ctx.rotate(this._angle);
    this._ctx.drawImage(this._image, this._frameX * sw, this._frameY * sh, sw, sh, -w / 2, -h / 2, w, h);
    this._ctx.restore();
  }
}

class Hook extends GameObject {

  constructor(player, ctx, size, position) {
    super(ctx, size, position);
    this._image = document.getElementById('hook');
    this._player = player;
    this._status = 'NONE';
    this._catch = null;
  }

  clearCaptured(){
    this._catch = null;
    this._status = 'NONE';
  }

  update(){
    super.update();
    let formerY = this._position.getY();

    if(this._status === 'CATCH'){
      if(formerY > this._player.getPosition().getY() + (this._player.getSize().getHeight() * 0.6))
        this._position = new Point(this._player.getPosition().getX(), formerY - 5);
      else {
        // on board
        this.clearCaptured();
      }
    }
    else {
      if (this._player._game.hasKey(KEY_SPACE) && !(this._player._game.hasKey(KEY_ARROW_LEFT) || this._player._game.hasKey(KEY_ARROW_RIGHT)) && formerY < (this._player._game.getSize().getHeight() * 0.95)) {
        this._position = new Point(this._player.getPosition().getX(), formerY + 5);
      } else if (formerY > this._player.getPosition().getY() + (this._player.getSize().getHeight() * 0.6)) {
        this._position = new Point(this._player.getPosition().getX()  , formerY - 5);
      }
    }

  }

  draw(){
    super.draw();
    const currentX = this._position.getX();
    const currentY = this._position.getY();
    const w = this._size.getWidth();
    const h = this._size.getHeight();

    // rope
    this._ctx.beginPath();
    this._ctx.lineWidth = 5;
    this._ctx.strokeStyle = "brown";
    this._ctx.setLineDash([5, 5]);

    this._ctx.moveTo(this._player.getPosition().getX()+45, this._player.getPosition().getY() + (this._player.getSize().getHeight() * (this._player._game.hasKey(KEY_SPACE) && !(this._player._game.hasKey(KEY_ARROW_LEFT) || this._player._game.hasKey(KEY_ARROW_RIGHT)) ? 0.45: 0.6) ));
    this._ctx.lineTo(this._player.getPosition().getX()+45, currentY);
    this._ctx.stroke();

    // hook

    if(this._player._game.isDebug()) {
      // debug BB
      this._ctx.fillStyle = this._status === 'CATCH' ? 'green' : 'red';
      this._ctx.font = "16px serif";
      this._ctx.fillText(`X ${currentX} Y ${currentY} W ${w} H ${h}`, 10, 50);
      this._ctx.fillRect(this._player.getPosition().getX() + 22, currentY, w, h);
    }

    this._ctx.drawImage(this._image, this._player.getPosition().getX() + (this._player.getSize().getWidth() * 0.06), currentY , w, h);

    if(this._catch) {
      this._catch.draw();
    }
  }

  hadCatch(){
    return this._status === 'CATCH';
  }

  setCatch(fish){
    this._status = 'CATCH';
    this._catch = fish;
    this._catch.captured(this);
  }
}

class Player extends GameObject {
  constructor(game, ctx, size, position) {
    super(ctx, size, position)
    this._game = game;
    this._speedY  = 0;
    this._speedX  = 0;
    this._frameX = 0;
    this._frameY = 0;
    this._hook = new Hook (this, ctx, new Size(25, 25) , new Point(position.getX() , position.getY() + (size.getHeight() * 0.6)));
    this._image = document.getElementById('boat_idle');
    this._castAnimation = document.getElementById('boat_cast');
    this._state = 'IDLE';
    this._castAnimationEnded = false;
    this._gameFrame = 0;
    this.STAGGERFRAME = 5;
  }

  getHook(){
    return this._hook;
  }

  update(){
    super.update();

    const formerPosition = this._position;
    const rBound = formerPosition.getX() + this._size.getWidth();
    const lBound = formerPosition.getX();

    if(this._game.hasKey(KEY_ARROW_RIGHT) && rBound <= this._game.getSize().getWidth()) {
      this._speedX = 2;
      this._state = 'MOVING_R';
    }
    else if(this._game.hasKey(KEY_ARROW_LEFT) && lBound !== 0) {
      this._speedX = -2;
      this._state = 'MOVING_L';
    }
    else if (this._game.hasKey(KEY_SPACE) && !(this._game.hasKey(KEY_ARROW_LEFT) || this._game.hasKey(KEY_ARROW_RIGHT)) ){
      console.log(`state`, this._state);
      if(this._state !== 'CAST'){
        console.log('start cast');
        this._frameY = this._frameX = 0;
        this.__castAnimationEnded = false;
      }
      this._state = 'CAST';
    }
    else {
      this._state = 'IDLE';
      this._speedX = 0;
    }
    // set mew position
    this._position = new Point(formerPosition.getX() + this._speedX, formerPosition.getY() + this._speedY);
    if(this.__castAnimationEnded || this._state !== 'CAST')
      this._hook.update();
  }

  draw(){
    super.draw();
    if (this._game.isDebug()) {
      this._ctx.strokeStyle = "red";
      this._ctx.fillRect(this._position.getX(), this._position.getY(), this._size.getWidth(), this._size.getHeight());
      this._ctx.fillStyle = 'black';
      this._ctx.font = "16px serif";
      this._ctx.fillText(`frameX ${this._frameX} frameY ${this._frameY}`, 10, 90);
    }

    const w = this._size.getWidth();
    const h = this._size.getHeight();

    if(this._state === 'MOVING_L' || this._state === 'MOVING_R' || this._state === 'IDLE') {


      this._ctx.drawImage
      (
        this._image,
        this._frameX * w,
        this._frameY * h,
        w,
        h,
        this._position.getX(),
        this._position.getY(),
        w,
        h
      );
      if(this._gameFrame % this.STAGGERFRAME  ===0){
        // zero based index
        if (this._frameX < 3) {
          ++this._frameX;
        } else {
          this._frameX = 0;
          if (this._frameY < 4) {
            ++this._frameY
          } else {
            this._frameY = 0;
          }
        }
      }
    }
    else{
      // zero based index
      if(this._gameFrame % this.STAGGERFRAME  ===0) {
        if (this.__castAnimationEnded) {
          this._frameY = 0;
          this._frameX = 0;
        } else {
          if (this._frameX < 3) {
            ++this._frameX;
          } else {
            this._frameX = 0;
            if (this._frameY < 2) {
              ++this._frameY
            } else {
              this._frameY = 0;
              this._frameX = 0;
              this.__castAnimationEnded = true;
            }
          }
        }
      }

      // cast
      this._ctx.drawImage
      (
        this._castAnimation,
        this._frameX * w,
        this._frameY * h,
        w,
        h,
        this._position.getX(),
        this._position.getY(),
        w,
        h
      );
    }
    if(this.__castAnimationEnded || this._state !== 'CAST')
      this._hook.draw();
    ++this._gameFrame
  }
}

class Bubble extends GameObject {
  constructor(game, ctx, size, position) {
    super(ctx, size, position)
    this._game = game;
    this._speedY  = 0.5;
    this._speedX  = 0;
    this._image = document.getElementById('bubble');
  }

  update(){
    super.update();
    const formerPosition = this._position;
    this._position = new Point(formerPosition.getX() ,formerPosition.getY() - this._speedY);
  }

  draw(){
    this._ctx.drawImage(this._image, this._position.getX(), this._position.getY(), this._size.getWidth(), this._size.getHeight());
  }

}

class EnemyFactory {

  constructor() {
    this.specs = [];
    this.specs['octopus'] ={
      image:  document.getElementById('octopus'),
      size: new Size(244.75, 198.75),
      spriteFrameSize: new Size(489.5, 397.5),
      maxFrameX: 4,
      maxFrameY: 4,
      dieFrameX: 1,
      dieFrameY: 1
    }
  }

  createEnemy(name, game, ctx){
     const spec = this.specs[name];
     if(spec){
       return new Octopus
       (
         game,
         ctx,
         spec.size,
         new Point(0,  300 ),
         spec.image,
         spec.maxFrameX,
         spec.maxFrameY,
         spec.dieFrameX,
         spec.dieFrameY,
         spec.spriteFrameSize
       )
     }
     return null;
  }
}

class Game extends GameObject{

  constructor(ctx, size) {
    super(ctx, size);
    this._enemyFactory = new EnemyFactory();
    this._player = new Player(this, ctx, new Size(315.6, 404.75), new Point(100, -30))
    this._enemies = [];
    this._bubbles = [];
    this._enemies_images = [];
    this._enemies_images.push(document.getElementById("fish1"));
    this._enemies_images.push(document.getElementById("fish2"));
    this._enemies_images.push(document.getElementById("fish3"));


    this._enemies.push(this._enemyFactory.createEnemy('octopus', this, ctx));


    for(let i = 0; i < 5 ; i++){
      // see https://www.geeksforgeeks.org/how-to-generate-random-number-in-given-range-using-javascript/
      let y = Math.random() * (this._size.getHeight() - 200) + 200;
      this._enemies.push(
        new EnemyWithAnimation
        (
          this,
          ctx,
          new Size(82 , 100),
          new Point(0, y ),
          //this._enemies_images[Math.floor((Math.random()*this._enemies_images.length))],
          document.getElementById('fish1_sprite'),
          10
        )
      );
    }

    for(let i = 0; i < 1; i++){
      // see https://www.geeksforgeeks.org/how-to-generate-random-number-in-given-range-using-javascript/
      let y = Math.random() * (this._size.getHeight() - 200) + 200;
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

  update(deltaTime){
    super.update();

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
      if(this.checkCollision(this._player.getHook(), e) && !this._player.getHook().hadCatch())
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
    this._ctx.drawImage(document.getElementById("background"), 0, 0, this._size.getWidth(),  this._size.getHeight())

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

if (typeof window !== 'undefined') { window.addEventListener('load', function(){
  const canvas = document.getElementById("canvas1");
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const game = new Game(ctx, new Size(canvas.height, canvas.width));

  /*
  window.requestAnimFrame = (function(callback) {
    return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame ||
      function(callback) {
        window.setTimeout(callback, 1000 / 10);
      };
  })();

   */

  function disableAntiAliasing(context) {
    // note: you must factor this into any other context.translate calls in the future
    context.translate(0.5, 0.5);
    context.webkitImageSmoothingEnabled = false;
    context.mozImageSmoothingEnabled = false;
    context.imageSmoothingEnabled = false;
  }

  window.requestAnimFrame = (function(callback) {
    return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame ||
      function(callback) {
        window.setTimeout(callback, 5000);
      };
  })();

  let lastTime = 0
  function animationLoop(timestamp){
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    game.update(deltaTime);
    game.draw();
    requestAnimationFrame(animationLoop);
  }

  disableAntiAliasing(ctx)
  animationLoop(0);

}); } // end if (typeof window !== 'undefined')

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Size, Point, GameObject, Enemy, EnemyWithAnimation, Trash, Octopus };
}

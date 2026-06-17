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
    this._hasEscaped = false;
  }

  update(){
    super.update();
    const formerPosition = this._position;
    this._position = new Point(formerPosition.getX() + this._speedX, formerPosition.getY());
  }

  isOffScreen() {
    const x = this._position.getX();
    const gameWidth = this._game.getSize().getWidth();
    return x + this._size.getWidth() < 0 || x > gameWidth;
  }

  draw(){
    super.draw();
    //this._ctx.fillStyle = 'red';
    //this._ctx.fillRect(this._position.getX(), this._position.getY(), this._size.getWidth(), this._size.getHeight());
    this._ctx.drawImage(this._image, this._position.getX(), this._position.getY(), this._size.getWidth(), this._size.getHeight())
  }

  captured(hook){
    this._hook = hook;
    this._status = ENEMY_STATUS_CAPTURED;
    this._captureTick = 0;
  }

  updateCaptured() {
    this._captureTick++;
  }

  isCaptured(){
    return this._status === ENEMY_STATUS_CAPTURED;
  }

  escaped() {
    if (this._hook) {
      const ep = this._hook.getEndpoint();
      this._position = new Point(ep.getX() - this._size.getWidth() / 2, ep.getY());
    }
    this._status = null;
    this._hook = null;
    this._captureTick = 0;
    this._hasEscaped = true;
    if (this._direction !== null) {
      this._speedX = this._direction * this._driftSpeed * ENEMY_ESCAPE_SPEED_MULTIPLIER;
    }
  }

  static randomSpawnX(canvasWidth, width, rng = Math.random) {
    return rng() * (canvasWidth - width);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Enemy };
}

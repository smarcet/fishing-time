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
    this._status = ENEMY_STATUS_CAPTURED;
    this._captureTick = 0;
  }

  updateCaptured() {
    this._captureTick++;
  }

  isCaptured(){
    return this._status === ENEMY_STATUS_CAPTURED;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Enemy };
}

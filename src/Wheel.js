class Wheel extends InertObject {

  constructor(game, ctx, size, position, image, maxFrames) {
    super(game, ctx, size, position, image, maxFrames);
    this._staggerFrame = ANIM_STAGGER_SLOW;
    this._driftSpeed = DRIFT_SPEED_SLOW;
    this._speedX = this._driftSpeed;
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

  _drawCapturedSprite(dx, dy, w, h) {
    this._ctx.drawImage(this._image, 0, 0, this._image.naturalWidth, this._image.naturalHeight, dx, dy, w, h);
  }

  draw() {
    const w = this._size.getWidth();
    const h = this._size.getHeight();
    const dx = this._position.getX();
    const dy = this._position.getY();

    if (this._status === ENEMY_STATUS_CAPTURED) { this.drawCaptured(); return; }

    if (this._game.isDebug()) {
      this._ctx.fillStyle = 'red';
      this._ctx.font = '16px serif';
      this._ctx.fillText(`X ${dx} `, 10, 200);
      this._ctx.fillText(`Y ${dy} `, 10, 220);
      this._ctx.fillRect(dx, dy + this._bobOffset, w, h);
    }

    this._ctx.save();
    this._ctx.translate(dx + w / 2, dy + this._bobOffset + h / 2);
    this._ctx.rotate(this._angle);
    this._ctx.drawImage(this._image, 0, 0, this._image.naturalWidth, this._image.naturalHeight, -w / 2, -h / 2, w, h);
    this._ctx.restore();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Wheel };
}

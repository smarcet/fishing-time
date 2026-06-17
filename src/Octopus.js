class Octopus extends CatchableFish {

  constructor(game, ctx, size, position, image, maxFrameX, maxFrameY, dieFrameX, dieFrameY, spriteFrameSize) {
    super(game, ctx, size, position, image, maxFrameX, maxFrameY, dieFrameX, dieFrameY);
    // spriteFrameSize holds the natural spritesheet cell dimensions, which can differ
    // from the display size when the octopus is rendered at a scaled-down size.
    this._spriteFrameSize = spriteFrameSize || size;
    this._sw = this._spriteFrameSize.getWidth();
    this._sh = this._spriteFrameSize.getHeight();
    this._staggerFrame = ANIM_STAGGER_SLOW;
    this._strength   = FISH_SPECS['octopus'].strength;
    this._escapeRate = FISH_SPECS['octopus'].escape_rate;
    this._bobAmplitude = ANIM_BOB_AMPLITUDE;
    this._bobSpeed = ANIM_BOB_SPEED;
    this._maxAngle = ANIM_MAX_TILT_ANGLE;
    this._bobPhase = 0;
    this._bobOffset = 0;
    this._angle = 0;
  }

  static create(game, ctx, spec) {
    return new Octopus(
      game, ctx, spec.size,
      new Point(0, game.getSize().getHeight() * OCTOPUS_SPAWN_Y_FACTOR),
      spec.image, spec.maxFrameX, spec.maxFrameY, spec.dieFrameX, spec.dieFrameY, spec.spriteFrameSize
    );
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
    const sw = this._sw;
    const sh = this._sh;
    this._ctx.drawImage(this._image, this._dieFrameX * sw, this._dieFrameY * sh, sw, sh, dx, dy, w, h);
  }

  draw() {
    const w  = this._size.getWidth();
    const h  = this._size.getHeight();
    const sw = this._sw;
    const sh = this._sh;
    const dx = this._position.getX();
    const dy = this._position.getY();

    if (this._status === ENEMY_STATUS_CAPTURED) { this.drawCaptured(); return; }

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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Octopus };
}

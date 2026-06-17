class Shark extends CatchableFish {

  constructor(game, ctx, size, position, image, maxFrameX, maxFrameY, dieFrameX, dieFrameY, spriteFrameSize) {
    super(game, ctx, size, position, image, maxFrameX, maxFrameY, dieFrameX, dieFrameY);
    this._spriteFrameSize = spriteFrameSize || size;
    this._sw = this._spriteFrameSize.getWidth();   // 1060
    this._sh = this._spriteFrameSize.getHeight();  // 512
    this._staggerFrame = ANIM_STAGGER_SLOW;
    this._driftSpeed   = SHARK_DRIFT_SPEED;
    this._strength     = FISH_SPECS['shark'].strength;
    this._escapeRate   = FISH_SPECS['shark'].escape_rate;
  }

  static randomSpawnY(canvasHeight, fishHeight, rng = Math.random) {
    const minY = WATER_SURFACE_Y + 200;  // deepest tier - below hammerhead (+100)
    const maxY = Math.max(minY, canvasHeight - fishHeight);
    return minY + rng() * (maxY - minY);
  }

  static create(game, ctx, spec) {
    return new Shark(
      game, ctx, spec.size,
      new Point(
        Shark.randomSpawnX(game.getSize().getWidth(), spec.size.getWidth()),
        Shark.randomSpawnY(game.getSize().getHeight(), spec.size.getHeight())
      ),
      spec.image, spec.maxFrameX, spec.maxFrameY, spec.dieFrameX, spec.dieFrameY, spec.spriteFrameSize
    );
  }

  update() {
    if (this._direction === null) {
      this._direction = this._position.getX() < this._game.getSize().getWidth() / 2 ? 1 : -1;
      this._speedX = this._direction * this._driftSpeed;
    }
    super.update();
  }

  captured(hook) {
    super.captured(hook);
    if (this._direction === null) {
      this._direction = this._position.getX() < this._game.getSize().getWidth() / 2 ? 1 : -1;
    }
  }

  _drawCapturedSprite(dx, dy, w, h) {
    this._ctx.drawImage(
      this._image,
      this._dieFrameX * this._sw, this._dieFrameY * this._sh, this._sw, this._sh,
      dx, dy, w, h
    );
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
      this._ctx.fillText(`X ${dx} Y ${dy}`, 10, 300);
      this._ctx.fillRect(dx, dy, w, h);
    }

    // sprite assumed to face LEFT; flip when direction is 1 (going right)
    const flipX = this._direction === 1 ? -1 : 1;
    this._ctx.save();
    this._ctx.translate(dx + w / 2, dy + h / 2);
    this._ctx.scale(flipX, 1);
    this._ctx.drawImage(this._image, this._frameX * sw, this._frameY * sh, sw, sh, -w / 2, -h / 2, w, h);
    this._ctx.restore();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Shark };
}

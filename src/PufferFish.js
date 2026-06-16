class PufferFish extends CatchableFish {

  constructor(game, ctx, size, position, image, maxFrameX, maxFrameY, dieFrameX, dieFrameY, spriteFrameSize) {
    super(game, ctx, size, position, image, maxFrameX, maxFrameY, dieFrameX, dieFrameY);
    this._spriteFrameSize = spriteFrameSize || size;
    this._sw = this._spriteFrameSize.getWidth();
    this._sh = this._spriteFrameSize.getHeight();
    this._staggerFrame = ANIM_STAGGER_SLOW;
    this._driftSpeed   = PUFFER_FISH_DRIFT_SPEED;
    this._strength     = FISH_SPECS['puffer_fish'].strength;
    this._escapeRate   = FISH_SPECS['puffer_fish'].escape_rate;
  }

  static randomSpawnY(canvasHeight, fishHeight, rng = Math.random) {
    const minY = WATER_SURFACE_Y;
    const maxY = Math.max(minY, canvasHeight - fishHeight);
    return minY + rng() * (maxY - minY);
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
      this._ctx.fillText(`X ${dx} Y ${dy}`, 10, 270);
      this._ctx.fillRect(dx, dy, w, h);
    }

    const flipX = this._direction === 1 ? -1 : 1;
    this._ctx.save();
    this._ctx.translate(dx + w / 2, dy + h / 2);
    this._ctx.scale(flipX, 1);
    this._ctx.drawImage(this._image, this._frameX * sw, this._frameY * sh, sw, sh, -w / 2, -h / 2, w, h);
    this._ctx.restore();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PufferFish };
}

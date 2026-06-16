class ButterflyFish extends CatchableFish {

  constructor(game, ctx, size, position, image, maxFrameX, maxFrameY, dieFrameX, dieFrameY, specKey = 'butterfly_fish') {
    super(game, ctx, size, position, image, maxFrameX, maxFrameY, dieFrameX, dieFrameY);
    this._staggerFrame = ANIM_STAGGER_SLOW;
    const spec = FISH_SPECS[specKey] || FISH_SPECS['butterfly_fish'];
    this._strength   = spec.strength;
    this._escapeRate = spec.escape_rate;
  }

  static randomSpawnY(canvasHeight, fishHeight, rng = Math.random) {
    const minY = WATER_SURFACE_Y;
    const maxY = canvasHeight - fishHeight;
    return minY + rng() * (maxY - minY);
  }

  static randomSpawnX(canvasWidth, fishWidth, rng = Math.random) {
    return rng() * (canvasWidth - fishWidth);
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
    this._ctx.drawImage(this._image, this._frameX * w, 0, w, h, dx, dy, w, h);
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
      this._ctx.fillRect(dx, dy, w, h);
    }

    const flipX = this._direction === 1 ? -1 : 1;
    this._ctx.save();
    this._ctx.translate(dx + w / 2, dy + h / 2);
    this._ctx.scale(flipX, 1);
    this._ctx.drawImage(this._image, this._frameX * w, this._frameY * h, w, h, -w / 2, -h / 2, w, h);
    this._ctx.restore();
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { ButterflyFish };
}

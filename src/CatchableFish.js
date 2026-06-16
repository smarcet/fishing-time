class CatchableFish extends EnemyWithAnimation {
  constructor(game, ctx, size, position, image, maxFrameX, maxFrameY, dieFrameX, dieFrameY) {
    super(game, ctx, size, position, image, maxFrameX, maxFrameY, dieFrameX, dieFrameY);
    this._strength   = 0;  // subclass must set from FISH_SPECS
    this._escapeRate = 0;  // subclass must set from FISH_SPECS
  }

  getFightSpec() {
    return { strength: this._strength, escapeRate: this._escapeRate };
  }

  static randomSpawnX(canvasWidth, fishWidth, rng = Math.random) {
    return rng() * (canvasWidth - fishWidth);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CatchableFish };
}

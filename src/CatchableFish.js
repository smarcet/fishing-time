class CatchableFish extends EnemyWithAnimation {
  constructor(game, ctx, size, position, image, maxFrameX, maxFrameY, dieFrameX, dieFrameY) {
    super(game, ctx, size, position, image, maxFrameX, maxFrameY, dieFrameX, dieFrameY);
    this._strength   = 0;  // set by EnemyFactory.createEnemy() from FISH_DEFINITIONS
    this._escapeRate = 0;  // set by EnemyFactory.createEnemy() from FISH_DEFINITIONS
  }

  getFightSpec() {
    return { strength: this._strength, escapeRate: this._escapeRate };
  }
  
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { CatchableFish };
}

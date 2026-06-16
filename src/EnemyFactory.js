class EnemyFactory {

  constructor() {
    this.specs = [];
    this.specs[ENEMY_TYPE_BUTTERFLY_FISH] = {
      image: (typeof document !== 'undefined') ? document.getElementById('fish1_sprite') : null,
      size: new Size(FISH_FRAME_HEIGHT, FISH_FRAME_WIDTH),
      maxFrameX: FISH_MAX_FRAME_X,
      maxFrameY: 1,
      dieFrameX: 0,
      dieFrameY: 0,
    };
    this.specs[ENEMY_TYPE_DISCARDED_BOTTLE] = {
      image: (typeof document !== 'undefined') ? document.getElementById('bottle_1_sprite') : null,
      size: new Size(92, 76),
      maxFrames: 10,
    };
    this.specs[ENEMY_TYPE_OCTOPUS] = {
      image:  document.getElementById('octopus'),
      size: new Size(244.75, 198.75),
      spriteFrameSize: new Size(489.5, 397.5),
      maxFrameX: 4,
      maxFrameY: 4,
      dieFrameX: 1,
      dieFrameY: 1
    };
    this.specs[ENEMY_TYPE_CRAB] = {
      image: document.getElementById('crab'),
      size: new Size(98, 204),
      spriteFrameSize: new Size(CRAB_FRAME_HEIGHT, CRAB_FRAME_WIDTH),
      maxFrameX: CRAB_MAX_FRAME_X,
      maxFrameY: CRAB_MAX_FRAME_Y,
      dieFrameX: 0,
      dieFrameY: CRAB_DIE_FRAME_Y,
    };
  }

  createEnemy(name, game, ctx) {
    const spec = this.specs[name];
    if (!spec) return null;
    if (name === ENEMY_TYPE_BUTTERFLY_FISH) {
      return new ButterflyFish(
        game, ctx, spec.size,
        new Point(
          ButterflyFish.randomSpawnX(game.getSize().getWidth(), spec.size.getWidth()),
          ButterflyFish.randomSpawnY(game.getSize().getHeight(), spec.size.getHeight())
        ),
        spec.image, spec.maxFrameX, spec.maxFrameY, spec.dieFrameX, spec.dieFrameY
      );
    }
    if (name === ENEMY_TYPE_DISCARDED_BOTTLE) {
      return new DiscardedBottle(
        game, ctx, spec.size,
        new Point(0, 300),
        spec.image, spec.maxFrames
      );
    }
    if (name === ENEMY_TYPE_CRAB) {
      return new Crab(
        game, ctx, spec.size,
        new Point(0, game.getSize().getHeight() * CRAB_SEABED_FACTOR),
        spec.image, spec.maxFrameX, spec.maxFrameY,
        spec.dieFrameX, spec.dieFrameY, spec.spriteFrameSize
      );
    }
    return new Octopus(
      game, ctx, spec.size,
      new Point(0, game.getSize().getHeight() * 0.65),
      spec.image, spec.maxFrameX, spec.maxFrameY,
      spec.dieFrameX, spec.dieFrameY, spec.spriteFrameSize
    );
  }
}

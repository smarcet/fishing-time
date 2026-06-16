class EnemyFactory {

  constructor() {
    this.specs = [];
    this.specs[ENEMY_TYPE_BUTTERFLY_FISH] = {
      image: (typeof document !== 'undefined') ? document.getElementById('butterfly_fish_sprite') : null,
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
      image:  document.getElementById('octopus_sprite'),
      size: new Size(244.75, 198.75),
      spriteFrameSize: new Size(489.5, 397.5),
      maxFrameX: 4,
      maxFrameY: 4,
      dieFrameX: 1,
      dieFrameY: 1
    };
    this.specs[ENEMY_TYPE_CRAB] = {
      image: document.getElementById('crab_sprite'),
      size: new Size(98, 204),
      spriteFrameSize: new Size(CRAB_FRAME_HEIGHT, CRAB_FRAME_WIDTH),
      maxFrameX: CRAB_MAX_FRAME_X,
      maxFrameY: CRAB_MAX_FRAME_Y,
      dieFrameX: 0,
      dieFrameY: CRAB_DIE_FRAME_Y,
    };
    this.specs[ENEMY_TYPE_LION_FISH] = {
      image: (typeof document !== 'undefined') ? document.getElementById('lion_fish_sprite') : null,
      size: new Size(124, 124),
      spriteFrameSize: new Size(LION_FISH_FRAME_HEIGHT, LION_FISH_FRAME_WIDTH),
      maxFrameX: LION_FISH_MAX_FRAME_X,
      maxFrameY: 1,
      dieFrameX: 0,
      dieFrameY: LION_FISH_DIE_FRAME_Y,
    };
    this.specs[ENEMY_TYPE_HAMMERHEAD_SHARK] = {
      image: (typeof document !== 'undefined') ? document.getElementById('hammerhead_shark_sprite') : null,
      size: new Size(348, 600),
      spriteFrameSize: new Size(HAMMERHEAD_SHARK_FRAME_HEIGHT, HAMMERHEAD_SHARK_FRAME_WIDTH),
      maxFrameX: HAMMERHEAD_SHARK_MAX_FRAME_X,
      maxFrameY: 1,
      dieFrameX: 0,
      dieFrameY: HAMMERHEAD_SHARK_DIE_FRAME_Y,
    };
    this.specs[ENEMY_TYPE_SWORDFISH] = {
      image: (typeof document !== 'undefined') ? document.getElementById('swordfish_sprite') : null,
      size: new Size(125 * 1.5, 310 * 1.5),
      spriteFrameSize: new Size(SWORDFISH_FRAME_HEIGHT, SWORDFISH_FRAME_WIDTH),
      maxFrameX: SWORDFISH_MAX_FRAME_X,
      maxFrameY: 1,
      dieFrameX: 0,
      dieFrameY: SWORDFISH_DIE_FRAME_Y,
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
    if (name === ENEMY_TYPE_LION_FISH) {
      return new LionFish(
        game, ctx, spec.size,
        new Point(
          LionFish.randomSpawnX(game.getSize().getWidth(), spec.size.getWidth()),
          LionFish.randomSpawnY(game.getSize().getHeight(), spec.size.getHeight())
        ),
        spec.image, spec.maxFrameX, spec.maxFrameY,
        spec.dieFrameX, spec.dieFrameY, spec.spriteFrameSize
      );
    }
    if (name === ENEMY_TYPE_HAMMERHEAD_SHARK) {
      return new HammerHeadShark(
        game, ctx, spec.size,
        new Point(
          HammerHeadShark.randomSpawnX(game.getSize().getWidth(), spec.size.getWidth()),
          HammerHeadShark.randomSpawnY(game.getSize().getHeight(), spec.size.getHeight())
        ),
        spec.image, spec.maxFrameX, spec.maxFrameY,
        spec.dieFrameX, spec.dieFrameY, spec.spriteFrameSize
      );
    }
    if (name === ENEMY_TYPE_SWORDFISH) {
      return new SwordFish(
        game, ctx, spec.size,
        new Point(
          SwordFish.randomSpawnX(game.getSize().getWidth(), spec.size.getWidth()),
          SwordFish.randomSpawnY(game.getSize().getHeight(), spec.size.getHeight())
        ),
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

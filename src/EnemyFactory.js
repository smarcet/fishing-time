class EnemyFactory {

  constructor() {
    this.specs = [];
    this.specs['octopus'] = {
      image:  document.getElementById('octopus'),
      size: new Size(244.75, 198.75),
      spriteFrameSize: new Size(489.5, 397.5),
      maxFrameX: 4,
      maxFrameY: 4,
      dieFrameX: 1,
      dieFrameY: 1
    };
    this.specs['crab'] = {
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
    if (name === 'crab') {
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

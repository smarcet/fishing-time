// DOM element IDs - matched to <img id="..."> in main.html
const DOM_ID_BUTTERFLY_FISH   = 'butterfly_fish_sprite';
const DOM_ID_BOTTLE           = 'bottle_1_sprite';
const DOM_ID_OCTOPUS          = 'octopus_sprite';
const DOM_ID_CRAB             = 'crab_sprite';
const DOM_ID_LION_FISH        = 'lion_fish_sprite';
const DOM_ID_HAMMERHEAD_SHARK = 'hammerhead_shark_sprite';
const DOM_ID_SWORDFISH        = 'swordfish_sprite';
const DOM_ID_TUNA             = 'tuna_sprite';
const DOM_ID_CLOWN_FISH       = 'clown_fish_sprite';
const DOM_ID_SHARK            = 'shark_sprite';

// Shared sprite layout - all CatchableFish-based enemies cycle only row 0 (swim);
// row 1 is the die row, accessed directly via dieFrameY (not through the frame cycle).
const SPRITE_SWIM_MAX_FRAME_Y = 1;
const SPRITE_DIE_FRAME_X      = 0;  // all die animations start at column 0

// DiscardedBottle display and animation
const BOTTLE_DISPLAY_H  = 92;
const BOTTLE_DISPLAY_W  = 76;
const BOTTLE_MAX_FRAMES = 10;

// ButterflyFish - die frame is on the same row as swim (no separate die row)
const BUTTERFLY_FISH_DIE_FRAME_X = 0;
const BUTTERFLY_FISH_DIE_FRAME_Y = 0;

// Octopus display, sprite frame dimensions, and animation layout
const OCTOPUS_DISPLAY_H      = 244.75;
const OCTOPUS_DISPLAY_W      = 198.75;
const OCTOPUS_FRAME_H        = 489.5;
const OCTOPUS_FRAME_W        = 397.5;
const OCTOPUS_MAX_FRAME_X    = 4;
const OCTOPUS_MAX_FRAME_Y    = 4;
const OCTOPUS_DIE_FRAME_X    = 1;
const OCTOPUS_DIE_FRAME_Y    = 1;
const OCTOPUS_SPAWN_Y_FACTOR = 0.65;  // vertical spawn position as a fraction of canvas height

// Display sizes - only used by EnemyFactory when constructing enemy instances.
// Sprite frame dimensions for these enemies live in constants.js (LION_FISH_FRAME_*, etc.)
const CRAB_DISPLAY_H             = 98;
const CRAB_DISPLAY_W             = 204;
const LION_FISH_DISPLAY_H        = 124;
const LION_FISH_DISPLAY_W        = 124;
const HAMMERHEAD_SHARK_DISPLAY_H = 348;
const HAMMERHEAD_SHARK_DISPLAY_W = 600;
const SWORDFISH_DISPLAY_H        = 125 * 1.5;
const SWORDFISH_DISPLAY_W        = 310 * 1.5;
const TUNA_DISPLAY_H             = 225;
const TUNA_DISPLAY_W             = 384;
const CLOWN_FISH_DISPLAY_H       = 114;
const CLOWN_FISH_DISPLAY_W       = 107;
const SHARK_DISPLAY_H            = 256;  // 512 / 2 - half canonical cell height
const SHARK_DISPLAY_W            = 530;  // 1060 / 2 - half canonical cell width

class EnemyFactory {

  constructor() {
    this.specs = [];
    this.specs[ENEMY_TYPE_BUTTERFLY_FISH] = {
      image: (typeof document !== 'undefined') ? document.getElementById(DOM_ID_BUTTERFLY_FISH) : null,
      size: new Size(FISH_FRAME_HEIGHT, FISH_FRAME_WIDTH),
      maxFrameX: FISH_MAX_FRAME_X,
      maxFrameY: SPRITE_SWIM_MAX_FRAME_Y,
      dieFrameX: BUTTERFLY_FISH_DIE_FRAME_X,
      dieFrameY: BUTTERFLY_FISH_DIE_FRAME_Y,
    };
    this.specs[ENEMY_TYPE_DISCARDED_BOTTLE] = {
      image: (typeof document !== 'undefined') ? document.getElementById(DOM_ID_BOTTLE) : null,
      size: new Size(BOTTLE_DISPLAY_H, BOTTLE_DISPLAY_W),
      maxFrames: BOTTLE_MAX_FRAMES,
    };
    this.specs[ENEMY_TYPE_OCTOPUS] = {
      image: (typeof document !== 'undefined') ? document.getElementById(DOM_ID_OCTOPUS) : null,
      size: new Size(OCTOPUS_DISPLAY_H, OCTOPUS_DISPLAY_W),
      spriteFrameSize: new Size(OCTOPUS_FRAME_H, OCTOPUS_FRAME_W),
      maxFrameX: OCTOPUS_MAX_FRAME_X,
      maxFrameY: OCTOPUS_MAX_FRAME_Y,
      dieFrameX: OCTOPUS_DIE_FRAME_X,
      dieFrameY: OCTOPUS_DIE_FRAME_Y,
    };
    this.specs[ENEMY_TYPE_CRAB] = {
      image: (typeof document !== 'undefined') ? document.getElementById(DOM_ID_CRAB) : null,
      size: new Size(CRAB_DISPLAY_H, CRAB_DISPLAY_W),
      spriteFrameSize: new Size(CRAB_FRAME_HEIGHT, CRAB_FRAME_WIDTH),
      maxFrameX: CRAB_MAX_FRAME_X,
      maxFrameY: CRAB_MAX_FRAME_Y,
      dieFrameX: SPRITE_DIE_FRAME_X,
      dieFrameY: CRAB_DIE_FRAME_Y,
    };
    this.specs[ENEMY_TYPE_LION_FISH] = {
      image: (typeof document !== 'undefined') ? document.getElementById(DOM_ID_LION_FISH) : null,
      size: new Size(LION_FISH_DISPLAY_H, LION_FISH_DISPLAY_W),
      spriteFrameSize: new Size(LION_FISH_FRAME_HEIGHT, LION_FISH_FRAME_WIDTH),
      maxFrameX: LION_FISH_MAX_FRAME_X,
      maxFrameY: SPRITE_SWIM_MAX_FRAME_Y,
      dieFrameX: SPRITE_DIE_FRAME_X,
      dieFrameY: LION_FISH_DIE_FRAME_Y,
    };
    this.specs[ENEMY_TYPE_HAMMERHEAD_SHARK] = {
      image: (typeof document !== 'undefined') ? document.getElementById(DOM_ID_HAMMERHEAD_SHARK) : null,
      size: new Size(HAMMERHEAD_SHARK_DISPLAY_H, HAMMERHEAD_SHARK_DISPLAY_W),
      spriteFrameSize: new Size(HAMMERHEAD_SHARK_FRAME_HEIGHT, HAMMERHEAD_SHARK_FRAME_WIDTH),
      maxFrameX: HAMMERHEAD_SHARK_MAX_FRAME_X,
      maxFrameY: SPRITE_SWIM_MAX_FRAME_Y,
      dieFrameX: SPRITE_DIE_FRAME_X,
      dieFrameY: HAMMERHEAD_SHARK_DIE_FRAME_Y,
    };
    this.specs[ENEMY_TYPE_SWORDFISH] = {
      image: (typeof document !== 'undefined') ? document.getElementById(DOM_ID_SWORDFISH) : null,
      size: new Size(SWORDFISH_DISPLAY_H, SWORDFISH_DISPLAY_W),
      spriteFrameSize: new Size(SWORDFISH_FRAME_HEIGHT, SWORDFISH_FRAME_WIDTH),
      maxFrameX: SWORDFISH_MAX_FRAME_X,
      maxFrameY: SPRITE_SWIM_MAX_FRAME_Y,
      dieFrameX: SPRITE_DIE_FRAME_X,
      dieFrameY: SWORDFISH_DIE_FRAME_Y,
    };
    this.specs[ENEMY_TYPE_TUNA] = {
      image: (typeof document !== 'undefined') ? document.getElementById(DOM_ID_TUNA) : null,
      size: new Size(TUNA_DISPLAY_H, TUNA_DISPLAY_W),
      spriteFrameSize: new Size(TUNA_FRAME_HEIGHT, TUNA_FRAME_WIDTH),
      maxFrameX: TUNA_MAX_FRAME_X,
      maxFrameY: SPRITE_SWIM_MAX_FRAME_Y,
      dieFrameX: SPRITE_DIE_FRAME_X,
      dieFrameY: TUNA_DIE_FRAME_Y,
    };
    this.specs[ENEMY_TYPE_CLOWN_FISH] = {
      image: (typeof document !== 'undefined') ? document.getElementById(DOM_ID_CLOWN_FISH) : null,
      size: new Size(CLOWN_FISH_DISPLAY_H, CLOWN_FISH_DISPLAY_W),
      spriteFrameSize: new Size(CLOWN_FISH_FRAME_HEIGHT, CLOWN_FISH_FRAME_WIDTH),
      maxFrameX: CLOWN_FISH_MAX_FRAME_X,
      maxFrameY: SPRITE_SWIM_MAX_FRAME_Y,
      dieFrameX: SPRITE_DIE_FRAME_X,
      dieFrameY: CLOWN_FISH_DIE_FRAME_Y,
    };
    this.specs[ENEMY_TYPE_SHARK] = {
      image: (typeof document !== 'undefined') ? document.getElementById(DOM_ID_SHARK) : null,
      size: new Size(SHARK_DISPLAY_H, SHARK_DISPLAY_W),
      spriteFrameSize: new Size(SHARK_FRAME_HEIGHT, SHARK_FRAME_WIDTH),
      maxFrameX: SHARK_MAX_FRAME_X,
      maxFrameY: SPRITE_SWIM_MAX_FRAME_Y,
      dieFrameX: SPRITE_DIE_FRAME_X,
      dieFrameY: SHARK_DIE_FRAME_Y,
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
        new Point(0, WATER_SURFACE_Y),
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
    if (name === ENEMY_TYPE_TUNA) {
      return new Tuna(
        game, ctx, spec.size,
        new Point(
          Tuna.randomSpawnX(game.getSize().getWidth(), spec.size.getWidth()),
          Tuna.randomSpawnY(game.getSize().getHeight(), spec.size.getHeight())
        ),
        spec.image, spec.maxFrameX, spec.maxFrameY,
        spec.dieFrameX, spec.dieFrameY, spec.spriteFrameSize
      );
    }
    if (name === ENEMY_TYPE_CLOWN_FISH) {
      return new ClownFish(
        game, ctx, spec.size,
        new Point(
          ClownFish.randomSpawnX(game.getSize().getWidth(), spec.size.getWidth()),
          ClownFish.randomSpawnY(game.getSize().getHeight(), spec.size.getHeight())
        ),
        spec.image, spec.maxFrameX, spec.maxFrameY,
        spec.dieFrameX, spec.dieFrameY, spec.spriteFrameSize
      );
    }
    if (name === ENEMY_TYPE_SHARK) {
      return new Shark(
        game, ctx, spec.size,
        new Point(
          Shark.randomSpawnX(game.getSize().getWidth(), spec.size.getWidth()),
          Shark.randomSpawnY(game.getSize().getHeight(), spec.size.getHeight())
        ),
        spec.image, spec.maxFrameX, spec.maxFrameY,
        spec.dieFrameX, spec.dieFrameY, spec.spriteFrameSize
      );
    }
    return new Octopus(
      game, ctx, spec.size,
      new Point(0, game.getSize().getHeight() * OCTOPUS_SPAWN_Y_FACTOR),
      spec.image, spec.maxFrameX, spec.maxFrameY,
      spec.dieFrameX, spec.dieFrameY, spec.spriteFrameSize
    );
  }
}

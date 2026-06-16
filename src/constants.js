const KEY_ARROW_UP = 'ArrowUp';
const KEY_ARROW_DOWN = 'ArrowDown';
const KEY_ARROW_LEFT = 'ArrowLeft';
const KEY_ARROW_RIGHT = 'ArrowRight';
const KEY_SPACE = ' ';
const AllowedKeys = [KEY_ARROW_UP,  KEY_ARROW_DOWN, KEY_ARROW_LEFT, KEY_ARROW_RIGHT, KEY_SPACE];

const ANIM_BOB_AMPLITUDE   = 12;     // px - vertical sine wave height
const ANIM_BOB_SPEED       = 0.08;   // rad/tick - phase advance per frame (~1.3s period at 60fps)
const ANIM_MAX_TILT_ANGLE  = 0.1745; // rad - max rock angle (~10 deg)
const ANIM_STAGGER_SLOW    = 6;      // ticks per sprite frame (bottle, octopus)
const DRIFT_SPEED_SLOW     = 0.6;    // px/tick (trash/bottle)
const DRIFT_SPEED_DEFAULT  = 1.5;    // px/tick (fish, octopus default)

const HOOK_PIVOT_X_OFFSET      = 45;   // px - rod-tip x offset from player left edge (idle)
const HOOK_PIVOT_Y_FACTOR      = 0.6;  // fraction of player height - rod-tip y (idle)
const HOOK_CAST_PIVOT_X_OFFSET = 12;   // px - rod-tip x offset from player left edge (cast/catch)
const HOOK_CAST_PIVOT_Y_FACTOR = 0.65; // fraction of player height - rod-tip y (cast/catch)
const HOOK_REST_LENGTH      = 60;     // px - rope length while idle
const HOOK_MAX_SWING_ANGLE  = 0.5236; // rad - max pendulum angle from vertical (~30 deg)
const HOOK_SWING_SPEED      = 0.04;   // rad/tick - swing phase advance (~2.6s period at 60fps)
const HOOK_CAST_SPEED       = 5;      // px/tick - rope extension speed while casting
const HOOK_REEL_SPEED       = 5;      // px/tick - rope retraction speed while reeling (empty hook)
const HOOK_CATCH_REEL_SPEED = 3;      // px/tick - rope retraction speed while reeling a catch (slower for animation)
const HOOK_MAX_DEPTH_FACTOR = 0.95;   // fraction of canvas height - deepest the hook can descend

const WATER_SURFACE_Y   = 300;  // px - y of the water surface; entities spawn at or below this line
const FISH_FRAME_WIDTH  = 100;  // px - fish spritesheet cell width (= render width)
const FISH_FRAME_HEIGHT = 82;   // px - fish spritesheet cell height (= render height)
const FISH_MAX_FRAME_X  = 10;   // columns in the fish1_sprite spritesheet

const CRAB_FRAME_WIDTH   = 408;   // px - natural sprite cell width
const CRAB_FRAME_HEIGHT  = 197;   // px - natural sprite cell height
const CRAB_MAX_FRAME_X   = 10;    // columns in spritesheet (move row)
const CRAB_MAX_FRAME_Y   = 1;     // only cycle move row; die row accessed directly via dieFrameY
const CRAB_DIE_FRAME_Y   = 1;     // row index for captured/die animation
const CRAB_DRIFT_SPEED   = 4.0;   // px/tick - 2.5x fish speed, hardest enemy to catch
const CRAB_SEABED_FACTOR = 0.85;  // canvas-height fraction for spawn Y (seabed)

const LION_FISH_FRAME_WIDTH  = 452;  // px - spritesheet cell width (die-frame dimensions, used as canonical)
const LION_FISH_FRAME_HEIGHT = 437;  // px - spritesheet cell height
const LION_FISH_MAX_FRAME_X  = 10;   // 10 frames per row (guard is < maxFrameX-1, so frames 0-9)
const LION_FISH_DIE_FRAME_Y  = 1;    // row 0 = move, row 1 = die (captured animation)
const LION_FISH_DRIFT_SPEED  = 2.0;  // px/tick - mid-water, between butterfly (1.5) and crab (4.0)

const PLAYER_ANIM_STAGGER      = 5;   // ticks per sprite frame (boat idle/cast)
const PLAYER_CATCH_MAX_FRAME_X = 3;   // 0-indexed: 4 columns in catch spritesheet
const PLAYER_CATCH_MAX_FRAME_Y = 6;   // 0-indexed: 7 rows in catch spritesheet (28 frames)

const PARALLAX_GAME_SPEED = 5;         // px/tick base speed for parallax layers

// Capture animation phases (string enum returned by Hook.getCapturePhase())
const CAPTURE_PHASE_RISING   = 'RISING';
const CAPTURE_PHASE_THROWING = 'THROWING';

// Capture animation timing/geometry
const CAPTURE_GLOW_SPEED = 0.12;       // rad/tick for sin-driven glow pulse (~0.87 s period at 60 fps)
const CAPTURE_ESCAPE_PARTICLES = 20;   // number of red particles on escape
const CAPTURE_THROW_THRESHOLD = 0.78; // rope-progress fraction where THROWING phase begins
const CAPTURE_THROW_ARC_Y     = 50;   // px height at parabola peak

// Struggle tunables - search "TUNE" to find all knobs
const HOOK_STRUGGLE_REEL_POWER      = 20;    // escape_progress reduction per Space press - TUNE
const HOOK_STRUGGLE_MAX_ESCAPE      = 100;   // ceiling; fish breaks free at this value - TUNE
const HOOK_REEL_DISTANCE_PER_PRESS  = 15;    // rope shrink (px) per Space press - TUNE

// Fish species lookup: strength * escape_rate * dt_sec = progress per second
const FISH_SPECS = {
  butterfly_fish: { strength: 5,  escape_rate: 1.5 },  // easy - used by ButterflyFish
  lion_fish:      { strength: 15, escape_rate: 2.5 },  // medium - used by LionFish
  // tuna: reserved for a future TunaFish entity - NOT used at launch
  shark:          { strength: 60, escape_rate: 3.0 },  // hard - reserved for future SharkFish
  octopus:        { strength: 20, escape_rate: 1.8 },  // moderate - used by Octopus
  crab:           { strength: 40, escape_rate: 2.2 },  // hard - used by Crab
};

// Hook status string constants
const HOOK_STATUS_IDLE             = 'IDLE';
const HOOK_STATUS_CAST             = 'CAST';
const HOOK_STATUS_HOOKED           = 'HOOKED';
const HOOK_STATUS_RETRIEVING_EMPTY = 'RETRIEVING_EMPTY';
// Enemy type constants
const ENEMY_TYPE_BUTTERFLY_FISH   = 'butterfly_fish';
const ENEMY_TYPE_LION_FISH        = 'lion_fish';
const ENEMY_TYPE_DISCARDED_BOTTLE = 'discarded_bottle';
const ENEMY_TYPE_OCTOPUS          = 'octopus';
const ENEMY_TYPE_CRAB             = 'crab';

const ENEMY_ESCAPE_SPEED_MULTIPLIER = 3;  // sprint speed after breaking free - TUNE

// Enemy / capture status string constants
const ENEMY_STATUS_CAPTURED = 'CAPTURED';

const BUBBLE_DIE_DURATION      = 30;   // frames for ring explosion (~0.5 s at 60 fps)
const BUBBLE_DIE_THRESHOLD_Y   = 380;  // px - y at which bubble starts dying (~80 px below water surface)
const BUBBLE_BATCH_SIZE        = 15;   // bubbles spawned per batch
const BUBBLE_SPEED_Y           = 0.5;  // px/frame - rise speed
const BUBBLE_SIZE_MIN          = 16;   // px - minimum bubble diameter
const BUBBLE_SIZE_MAX          = 64;   // px - maximum bubble diameter
const BUBBLE_SPAWN_X_MIN       = 200;  // px - minimum x spawn position
const BUBBLE_RING_COUNT        = 3;    // number of expanding rings in death animation
const BUBBLE_RING_STAGGER      = 0.15; // fractional delay between successive rings (0-1)

// Player state string constants
const PLAYER_STATE_IDLE     = 'IDLE';
const PLAYER_STATE_MOVING_R = 'MOVING_R';
const PLAYER_STATE_MOVING_L = 'MOVING_L';
const PLAYER_STATE_CAST     = 'CAST';
const PLAYER_STATE_REEL     = 'REEL';

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    KEY_ARROW_UP, KEY_ARROW_DOWN, KEY_ARROW_LEFT, KEY_ARROW_RIGHT, KEY_SPACE, AllowedKeys,
    ANIM_BOB_AMPLITUDE, ANIM_BOB_SPEED, ANIM_MAX_TILT_ANGLE, ANIM_STAGGER_SLOW,
    DRIFT_SPEED_SLOW, DRIFT_SPEED_DEFAULT,
    HOOK_PIVOT_X_OFFSET, HOOK_PIVOT_Y_FACTOR, HOOK_CAST_PIVOT_X_OFFSET, HOOK_CAST_PIVOT_Y_FACTOR,
    HOOK_REST_LENGTH, HOOK_MAX_SWING_ANGLE, HOOK_SWING_SPEED, HOOK_CAST_SPEED,
    HOOK_REEL_SPEED, HOOK_CATCH_REEL_SPEED, HOOK_MAX_DEPTH_FACTOR,
    WATER_SURFACE_Y, FISH_FRAME_WIDTH, FISH_FRAME_HEIGHT, FISH_MAX_FRAME_X,
    CRAB_FRAME_WIDTH, CRAB_FRAME_HEIGHT, CRAB_MAX_FRAME_X, CRAB_MAX_FRAME_Y,
    CRAB_DIE_FRAME_Y, CRAB_DRIFT_SPEED, CRAB_SEABED_FACTOR,
    LION_FISH_FRAME_WIDTH, LION_FISH_FRAME_HEIGHT, LION_FISH_MAX_FRAME_X,
    LION_FISH_DIE_FRAME_Y, LION_FISH_DRIFT_SPEED,
    PLAYER_ANIM_STAGGER, PLAYER_CATCH_MAX_FRAME_X, PLAYER_CATCH_MAX_FRAME_Y,
    PARALLAX_GAME_SPEED,
    CAPTURE_PHASE_RISING, CAPTURE_PHASE_THROWING,
    CAPTURE_GLOW_SPEED, CAPTURE_ESCAPE_PARTICLES, CAPTURE_THROW_THRESHOLD, CAPTURE_THROW_ARC_Y,
    HOOK_STRUGGLE_REEL_POWER, HOOK_STRUGGLE_MAX_ESCAPE, HOOK_REEL_DISTANCE_PER_PRESS,
    FISH_SPECS,
    HOOK_STATUS_IDLE, HOOK_STATUS_CAST, HOOK_STATUS_HOOKED, HOOK_STATUS_RETRIEVING_EMPTY,
    ENEMY_TYPE_BUTTERFLY_FISH, ENEMY_TYPE_LION_FISH, ENEMY_TYPE_DISCARDED_BOTTLE, ENEMY_TYPE_OCTOPUS, ENEMY_TYPE_CRAB,
    ENEMY_ESCAPE_SPEED_MULTIPLIER, ENEMY_STATUS_CAPTURED,
    PLAYER_STATE_IDLE, PLAYER_STATE_MOVING_R, PLAYER_STATE_MOVING_L,
    PLAYER_STATE_CAST, PLAYER_STATE_REEL,
    BUBBLE_DIE_DURATION, BUBBLE_DIE_THRESHOLD_Y, BUBBLE_BATCH_SIZE,
    BUBBLE_SPEED_Y, BUBBLE_SIZE_MIN, BUBBLE_SIZE_MAX, BUBBLE_SPAWN_X_MIN,
    BUBBLE_RING_COUNT, BUBBLE_RING_STAGGER,
  };
}

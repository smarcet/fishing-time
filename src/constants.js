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

const WATER_SURFACE_Y = 300;  // px - y of the water surface; entities spawn at or below this line

const CRAB_DRIFT_SPEED       = 4.0;   // px/tick - 2.5x fish speed, hardest enemy to catch
const CRAB_SEABED_FACTOR     = 0.85;  // canvas-height fraction for spawn Y (seabed)
const OCTOPUS_SPAWN_Y_FACTOR = 0.65;  // canvas-height fraction for spawn Y (mid-deep)
const CRAB_REWARD_GLOW_COLOR = 'rgba(255, 215, 0, 0.95)';
const CRAB_REWARD_GLOW_SHADOW_BLUR_MIN = 20;
const CRAB_REWARD_GLOW_SHADOW_BLUR_MAX = 120;
const CRAB_REWARD_GLOW_PULSE_SPEED = 0.06;
const CRAB_REWARD_GLOW_ALPHA_MIN = 0.65;
const CRAB_REWARD_GLOW_ALPHA_MAX = 1.0;
const CRAB_REWARD_GLOW_SCALE_MIN = 1.08;
const CRAB_REWARD_GLOW_SCALE_MAX = 1.22;

const LION_FISH_DRIFT_SPEED      = 2.0;  // px/tick
const HAMMERHEAD_SHARK_DRIFT_SPEED = 3.5;  // px/tick
const SHARK_DRIFT_SPEED          = 4.0;  // px/tick
const SWORDFISH_DRIFT_SPEED      = 4.5;  // px/tick
const TUNA_DRIFT_SPEED           = 4.0;  // px/tick
const CLOWN_FISH_DRIFT_SPEED     = 1.5;  // px/tick
const JELLY_FISH_DRIFT_SPEED     = 0.8;  // px/tick
const PUFFER_FISH_DRIFT_SPEED    = 1.5;  // px/tick

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

// Fish species lookup: strength * escape_rate * dt_sec = progress per second.
let FISH_SPECS = {};

// Game event names
const EVENT_ENEMY_CAPTURED   = 'enemyCaptured';
const EVENT_ENEMY_ESCAPED    = 'enemyEscaped';
const EVENT_ENEMY_EVADED     = 'enemyEvaded';
const EVENT_ENEMY_HOOKED     = 'enemyHooked';
const EVENT_ROD_CASTED       = 'rodCasted';
const EVENT_REEL_RETRIEVING  = 'reelRetrieving';
const EVENT_HOOK_IDLE        = 'hookIdle';
const EVENT_REEL_POWER_CHANGED = 'reelPowerChanged';
const EVENT_TIMER_TIMEUP       = 'timerTimeUp';
const EVENT_CAST_REQUESTED     = 'castRequested';
const EVENT_REEL_TAP           = 'reelTap';
const EVENT_REEL_START         = 'reelStart';
const EVENT_REEL_STOP          = 'reelStop';
const EVENT_TIME_BONUS         = 'timeBonus';
const TOUCH_REEL_STOP_DELAY_MS = 80;
const TOUCH_DUPLICATE_TAP_GUARD_MS = 30;

const GAME_NEEDED_SCORE = 500;

// Hook status string constants
const HOOK_STATUS_IDLE             = 'IDLE';
const HOOK_STATUS_CAST             = 'CAST';
const HOOK_STATUS_HOOKED           = 'HOOKED';
const HOOK_STATUS_RETRIEVING_EMPTY = 'RETRIEVING_EMPTY';
// Enemy type constants
const ENEMY_TYPE_BUTTERFLY_FISH    = 'butterfly_fish';
const ENEMY_TYPE_LION_FISH         = 'lion_fish';
const ENEMY_TYPE_HAMMERHEAD_SHARK  = 'hammerhead_shark';
const ENEMY_TYPE_SWORDFISH         = 'sword_fish';
const ENEMY_TYPE_TUNA              = 'tuna';
const ENEMY_TYPE_CLOWN_FISH        = 'clown_fish';
const ENEMY_TYPE_DISCARDED_BOTTLE  = 'discarded_bottle';
const ENEMY_TYPE_OCTOPUS           = 'octopus';
const ENEMY_TYPE_CRAB              = 'crab';
const ENEMY_TYPE_SHARK             = 'shark';
const ENEMY_TYPE_RED_APPLE         = 'red_apple';
const ENEMY_TYPE_JELLY_FISH        = 'jelly_fish';
const ENEMY_TYPE_WHEEL             = 'wheel';
const ENEMY_TYPE_PUFFER_FISH       = 'puffer_fish';
const ENEMY_TYPE_SHOE              = 'shoe';
const ENEMY_TYPE_FISH_BONE         = 'fish_bone';
const ENEMY_TYPE_CLOCK             = 'clock';

const FISH_RARITY_COMMON    = 'common';
const FISH_RARITY_UNCOMMON  = 'uncommon';
const FISH_RARITY_RARE      = 'rare';
const FISH_RARITY_EPIC      = 'epic';
const FISH_RARITY_LEGENDARY = 'legendary';

const FISH_LANE_SURFACE = 'surface';
const FISH_LANE_UPPER   = 'upper';
const FISH_LANE_MIDDLE  = 'middle';
const FISH_LANE_DEEP    = 'deep';
const FISH_LANE_BOTTOM  = 'bottom';

const FISH_CLASS_BUTTERFLY_FISH   = 'ButterflyFish';
const FISH_CLASS_LION_FISH        = 'LionFish';
const FISH_CLASS_HAMMERHEAD_SHARK = 'HammerHeadShark';
const FISH_CLASS_SWORDFISH        = 'SwordFish';
const FISH_CLASS_TUNA             = 'Tuna';
const FISH_CLASS_CLOWN_FISH       = 'ClownFish';
const FISH_CLASS_DISCARDED_BOTTLE = 'DiscardedBottle';
const FISH_CLASS_OCTOPUS          = 'Octopus';
const FISH_CLASS_CRAB             = 'Crab';
const FISH_CLASS_SHARK            = 'Shark';
const FISH_CLASS_RED_APPLE        = 'RedApple';
const FISH_CLASS_JELLY_FISH       = 'JellyFish';
const FISH_CLASS_WHEEL            = 'Wheel';
const FISH_CLASS_PUFFER_FISH      = 'PufferFish';
const FISH_CLASS_SHOE             = 'Shoe';
const FISH_CLASS_FISH_BONE        = 'FishBone';
const FISH_CLASS_CLOCK            = 'Clock';
const CLOCK_TIME_BONUS_SECONDS    = 10;

const FISH_TRAFFIC_DIRECTION_RIGHT = 1;
const FISH_TRAFFIC_DIRECTION_LEFT  = -1;
const FISH_TRAFFIC_DEFAULT_PRESEED_PER_LANE = 2;
const FISH_TRAFFIC_SEED_X_MIN_FACTOR = 0.2;
const FISH_TRAFFIC_SEED_X_RANGE_FACTOR = 0.6;
const FISH_TRAFFIC_MIN_TIMER_JITTER = 1;
const FISH_TRAFFIC_COOLDOWN_READY = 0;
const FISH_TRAFFIC_QUEUE_START_INDEX = 0;
const FISH_TRAFFIC_TIMER_TICK = 1;
const FISH_TRAFFIC_LAST_INDEX_OFFSET = 1;
const FISH_TRAFFIC_WEIGHT_THRESHOLD = 0;
const FISH_TRAFFIC_MAX_ACTIVE_ONE = 1;
const MOBILE_SHORT_EDGE_MAX = 820;

const FISH_LANES = {
  [FISH_LANE_SURFACE]: { yMin: 0.34, yMax: 0.44, direction: FISH_TRAFFIC_DIRECTION_RIGHT, spawnInterval: 90 },
  [FISH_LANE_UPPER]:   { yMin: 0.44, yMax: 0.56, direction: FISH_TRAFFIC_DIRECTION_LEFT,  spawnInterval: 120 },
  [FISH_LANE_MIDDLE]:  { yMin: 0.56, yMax: 0.68, direction: FISH_TRAFFIC_DIRECTION_RIGHT, spawnInterval: 150 },
  [FISH_LANE_DEEP]:    { yMin: 0.68, yMax: 0.82, direction: FISH_TRAFFIC_DIRECTION_LEFT,  spawnInterval: 210 },
  [FISH_LANE_BOTTOM]:  { yMin: 0.82, yMax: 0.95, direction: FISH_TRAFFIC_DIRECTION_RIGHT, spawnInterval: 270 },
};

// Single source of truth for all per-species data (gameplay + render geometry).
// EnemyFactory reads domId/display*/frame*/maxFrame*/dieFrame*/maxFrames to build specs.
// FishSpawner reads id/lanes/rarity/score/strength/escapeRate/speed*/spawnWeight/spawnFrequency.
const FISH_DEFINITIONS = [
  {
    id: ENEMY_TYPE_CLOWN_FISH,
    className: FISH_CLASS_CLOWN_FISH,
    domId: 'clown_fish_sprite',
    displayH: 114,  displayW: 107,
    frameH: 321,    frameW: 342,
    maxFrameX: 10,  maxFrameY: 1,
    dieFrameX: 0,   dieFrameY: 1,
    rarity: FISH_RARITY_COMMON,
    lanes: [FISH_LANE_SURFACE, FISH_LANE_UPPER, FISH_LANE_MIDDLE],
    score: 5,
    strength: 5,
    escapeRate: 1.2,
    speedMin: 1.2,
    speedMax: CLOWN_FISH_DRIFT_SPEED,
    spawnWeight: 10,
    spawnFrequency: 80,
    isTrash: false,
  },
  {
    id: ENEMY_TYPE_JELLY_FISH,
    className: FISH_CLASS_JELLY_FISH,
    domId: 'jelly_fish_sprite',
    displayH: 106,  displayW: 80,
    frameH: 294,    frameW: 221,
    maxFrameX: 10,  maxFrameY: 1,
    dieFrameX: 0,   dieFrameY: 1,
    rarity: FISH_RARITY_COMMON,
    lanes: [FISH_LANE_SURFACE, FISH_LANE_UPPER, FISH_LANE_MIDDLE],
    score: -25,
    strength: 5,
    escapeRate: 1.0,
    speedMin: 0.5,
    speedMax: JELLY_FISH_DRIFT_SPEED,
    spawnWeight: 8,
    spawnFrequency: 90,
    isTrash: false,
  },
  {
    id: ENEMY_TYPE_BUTTERFLY_FISH,
    className: FISH_CLASS_BUTTERFLY_FISH,
    domId: 'butterfly_fish_sprite',
    displayH: 82,  displayW: 100,
    frameH: 82,    frameW: 100,
    maxFrameX: 10, maxFrameY: 1,
    dieFrameX: 0,  dieFrameY: 0,   // die frame on swim row (no separate die row)
    rarity: FISH_RARITY_COMMON,
    lanes: [FISH_LANE_SURFACE, FISH_LANE_UPPER, FISH_LANE_MIDDLE],
    score: 10,
    strength: 5,
    escapeRate: 1.5,
    speedMin: 1.2,
    speedMax: DRIFT_SPEED_DEFAULT,
    spawnWeight: 8,
    spawnFrequency: 95,
    isTrash: false,
  },
  {
    id: ENEMY_TYPE_RED_APPLE,
    className: FISH_CLASS_RED_APPLE,
    domId: 'red_apple_sprite',
    displayH: 60,  displayW: 35,
    maxFrames: 1,
    rarity: FISH_RARITY_COMMON,
    lanes: [FISH_LANE_SURFACE, FISH_LANE_BOTTOM],
    score: -5,
    strength: 0,
    escapeRate: 0,
    speedMin: 0.4,
    speedMax: DRIFT_SPEED_SLOW,
    spawnWeight: 6,
    spawnFrequency: 120,
    isTrash: true,
  },
  {
    id: ENEMY_TYPE_DISCARDED_BOTTLE,
    className: FISH_CLASS_DISCARDED_BOTTLE,
    domId: 'bottle_1_sprite',
    displayH: 92,  displayW: 76,
    maxFrames: 10,
    rarity: FISH_RARITY_COMMON,
    lanes: [FISH_LANE_SURFACE, FISH_LANE_UPPER, FISH_LANE_MIDDLE, FISH_LANE_BOTTOM],
    score: -5,
    strength: 0,
    escapeRate: 0,
    speedMin: 0.4,
    speedMax: DRIFT_SPEED_SLOW,
    spawnWeight: 6,
    spawnFrequency: 120,
    isTrash: true,
  },
  {
    id: ENEMY_TYPE_FISH_BONE,
    className: FISH_CLASS_FISH_BONE,
    domId: 'fish_bone_sprite',
    displayH: 40,  displayW: 100,
    maxFrames: 2,
    rarity: FISH_RARITY_COMMON,
    lanes: [FISH_LANE_SURFACE, FISH_LANE_UPPER],
    score: -5,
    strength: 0,
    escapeRate: 0,
    speedMin: 0.4,
    speedMax: DRIFT_SPEED_SLOW,
    spawnWeight: 5,
    spawnFrequency: 150,
    isTrash: true,
  },
  {
    id: ENEMY_TYPE_WHEEL,
    className: FISH_CLASS_WHEEL,
    domId: 'wheel_sprite',
    displayH: 76,  displayW: 84,
    maxFrames: 1,
    rarity: FISH_RARITY_COMMON,
    lanes: [FISH_LANE_SURFACE, FISH_LANE_BOTTOM],
    score: -5,
    strength: 0,
    escapeRate: 0,
    speedMin: 0.4,
    speedMax: DRIFT_SPEED_SLOW,
    spawnWeight: 4,
    spawnFrequency: 180,
    isTrash: true,
  },
  {
    id: ENEMY_TYPE_SHOE,
    className: FISH_CLASS_SHOE,
    domId: 'shoe_sprite',
    displayH: 55,  displayW: 84,
    maxFrames: 1,
    rarity: FISH_RARITY_COMMON,
    lanes: [FISH_LANE_SURFACE, FISH_LANE_BOTTOM],
    score: -5,
    strength: 0,
    escapeRate: 0,
    speedMin: 0.4,
    speedMax: DRIFT_SPEED_SLOW,
    spawnWeight: 4,
    spawnFrequency: 180,
    isTrash: true,
  },
  {
    id: ENEMY_TYPE_CLOCK,
    className: FISH_CLASS_CLOCK,
    domId: 'clock_sprite',
    displayH: 85,  displayW: 110,
    maxFrames: 1,
    rarity: FISH_RARITY_UNCOMMON,
    lanes: [FISH_LANE_SURFACE, FISH_LANE_UPPER, FISH_LANE_MIDDLE],
    score: 50,
    strength: 0,
    escapeRate: 0,
    speedMin: 0.4,
    speedMax: DRIFT_SPEED_SLOW,
    spawnWeight: 3,
    spawnFrequency: 150,
    isTrash: true,
  },
  {
    id: ENEMY_TYPE_PUFFER_FISH,
    className: FISH_CLASS_PUFFER_FISH,
    domId: 'puffer_fish_sprite',
    displayH: 152,  displayW: 179,
    frameH: 305,    frameW: 358,
    maxFrameX: 10,  maxFrameY: 1,
    dieFrameX: 0,   dieFrameY: 1,
    rarity: FISH_RARITY_UNCOMMON,
    lanes: [FISH_LANE_SURFACE, FISH_LANE_UPPER, FISH_LANE_MIDDLE],
    score: 25,
    strength: 30,
    escapeRate: 2.2,
    speedMin: 1.2,
    speedMax: PUFFER_FISH_DRIFT_SPEED,
    spawnWeight: 4,
    spawnFrequency: 190,
    isTrash: false,
  },
  {
    id: ENEMY_TYPE_CRAB,
    className: FISH_CLASS_CRAB,
    domId: 'crab_sprite',
    displayH: 98,   displayW: 204,
    frameH: 197,    frameW: 408,
    maxFrameX: 10,  maxFrameY: 1,
    dieFrameX: 0,   dieFrameY: 1,
    rarity: FISH_RARITY_UNCOMMON,
    lanes: [FISH_LANE_BOTTOM],
    score: 1000,
    strength: 40,
    escapeRate: 2.2,
    speedMin: 3.0,
    speedMax: CRAB_DRIFT_SPEED,
    spawnWeight: 2,
    spawnFrequency: 600,
    maxActive: FISH_TRAFFIC_MAX_ACTIVE_ONE,
    isTrash: false,
  },
  {
    id: ENEMY_TYPE_LION_FISH,
    className: FISH_CLASS_LION_FISH,
    domId: 'lion_fish_sprite',
    displayH: 124,  displayW: 124,
    frameH: 437,    frameW: 452,
    maxFrameX: 10,  maxFrameY: 1,
    dieFrameX: 0,   dieFrameY: 1,
    rarity: FISH_RARITY_UNCOMMON,
    lanes: [FISH_LANE_UPPER, FISH_LANE_MIDDLE, FISH_LANE_DEEP],
    score: 15,
    strength: 15,
    escapeRate: 2.5,
    speedMin: 1.5,
    speedMax: LION_FISH_DRIFT_SPEED,
    spawnWeight: 4,
    spawnFrequency: 220,
    isTrash: false,
  },
  {
    id: ENEMY_TYPE_TUNA,
    className: FISH_CLASS_TUNA,
    domId: 'tuna_sprite',
    displayH: 225,  displayW: 384,
    frameH: 300,    frameW: 512,
    maxFrameX: 8,   maxFrameY: 1,
    dieFrameX: 0,   dieFrameY: 1,
    rarity: FISH_RARITY_UNCOMMON,
    lanes: [FISH_LANE_MIDDLE, FISH_LANE_DEEP],
    score: 250,
    strength: 60,
    escapeRate: 3.0,
    speedMin: 3.0,
    speedMax: TUNA_DRIFT_SPEED,
    spawnWeight: 3,
    spawnFrequency: 260,
    isTrash: false,
  },
  {
    id: ENEMY_TYPE_OCTOPUS,
    className: FISH_CLASS_OCTOPUS,
    domId: 'octopus_sprite',
    displayH: 244.75,  displayW: 198.75,
    frameH: 489.5,     frameW: 397.5,
    maxFrameX: 4,      maxFrameY: 4,
    dieFrameX: 1,      dieFrameY: 1,
    rarity: FISH_RARITY_RARE,
    lanes: [FISH_LANE_DEEP, FISH_LANE_BOTTOM],
    score: 100,
    strength: 20,
    escapeRate: 1.8,
    speedMin: 1.0,
    speedMax: DRIFT_SPEED_DEFAULT,
    spawnWeight: 2,
    spawnFrequency: 360,
    isTrash: false,
  },
  {
    id: ENEMY_TYPE_SWORDFISH,
    className: FISH_CLASS_SWORDFISH,
    domId: 'swordfish_sprite',
    displayH: 187.5,  displayW: 465,
    frameH: 416,      frameW: 1033,
    maxFrameX: 16,    maxFrameY: 1,
    dieFrameX: 0,     dieFrameY: 1,
    rarity: FISH_RARITY_RARE,
    lanes: [FISH_LANE_DEEP, FISH_LANE_BOTTOM],
    score: 150,
    strength: 50,
    escapeRate: 2.0,
    speedMin: 3.5,
    speedMax: SWORDFISH_DRIFT_SPEED,
    spawnWeight: 2,
    spawnFrequency: 390,
    isTrash: false,
  },
  {
    id: ENEMY_TYPE_SHARK,
    className: FISH_CLASS_SHARK,
    domId: 'shark_sprite',
    displayH: 256,  displayW: 530,
    frameH: 512,    frameW: 1060,
    maxFrameX: 10,  maxFrameY: 1,
    dieFrameX: 0,   dieFrameY: 1,
    rarity: FISH_RARITY_EPIC,
    lanes: [FISH_LANE_BOTTOM],
    score: 500,
    strength: 60,
    escapeRate: 2.0,
    speedMin: 3.0,
    speedMax: SHARK_DRIFT_SPEED,
    spawnWeight: 1,
    spawnFrequency: 600,
    isTrash: false,
  },
  {
    id: ENEMY_TYPE_HAMMERHEAD_SHARK,
    className: FISH_CLASS_HAMMERHEAD_SHARK,
    domId: 'hammerhead_shark_sprite',
    displayH: 348,  displayW: 600,
    frameH: 463,    frameW: 798,
    maxFrameX: 10,  maxFrameY: 1,
    dieFrameX: 0,   dieFrameY: 1,
    rarity: FISH_RARITY_LEGENDARY,
    lanes: [FISH_LANE_BOTTOM],
    score: 700,
    strength: 50,
    escapeRate: 2.0,
    speedMin: 2.8,
    speedMax: HAMMERHEAD_SHARK_DRIFT_SPEED,
    spawnWeight: 0.5,
    spawnFrequency: 900,
    isTrash: false,
  },
];

FISH_SPECS = Object.freeze(
  FISH_DEFINITIONS
    .filter(def => !def.isTrash)
    .reduce((specs, def) => {
      specs[def.id] = {
        strength: def.strength,
        escape_rate: def.escapeRate,
      };
      return specs;
    }, {})
);

const FISH_SCORE_MAP = Object.freeze(
  FISH_DEFINITIONS.reduce((scores, def) => {
    scores[def.className] = def.score;
    return scores;
  }, {})
);

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

const GAMEPLAY_PROFILE_DESKTOP = Object.freeze({
  name: 'desktop',
  isMobile: false,
  preseedPerLane: FISH_TRAFFIC_DEFAULT_PRESEED_PER_LANE,
  spawnIntervalMultiplier: 1,
  densityMultiplier: 1,
  spriteScale: 1,
  playerScale: 1,
  hudScale: 1,
  playerYOffset: 0,
  bubbleSizeScale: 1,
  bubbleDieThresholdFactor: null,
  waterSurfaceFactor: null,
  bubbleBatchSize: BUBBLE_BATCH_SIZE,
  maxActiveTraffic: Infinity,
  maxActiveLargeFish: Infinity,
  speciesCooldownMultipliers: Object.freeze({}),
  guaranteedSpeciesIntervals: Object.freeze({}),
  guaranteedSpeciesInitialOffsets: Object.freeze({}),
});

const GAMEPLAY_PROFILE_MOBILE = Object.freeze({
  name: 'mobile',
  isMobile: true,
  preseedPerLane: 1,
  spawnIntervalMultiplier: 1.55,
  densityMultiplier: 0.72,
  spriteScale: 0.48,
  playerScale: 0.62,
  hudScale: 0.42,
  playerYOffset: -44,
  playerYOffsetShortEdgeBase: 390,
  playerYOffsetShortEdgeSlope: 0.24,
  playerYOffsetMax: 112,
  bubbleSizeScale: 0.45,
  bubbleDieThresholdFactor: 0.42,
  waterSurfaceFactor: 0.28,
  bubbleBatchSize: Math.max(1, Math.floor(BUBBLE_BATCH_SIZE * 0.35)),
  maxActiveTraffic: 8,
  maxActiveLargeFish: 3,
  speciesCooldownMultipliers: Object.freeze({
    [ENEMY_TYPE_CRAB]: 0.35,
    [ENEMY_TYPE_HAMMERHEAD_SHARK]: 0.60,
    [ENEMY_TYPE_SHARK]: 0.60,
  }),
  guaranteedSpeciesIntervals: Object.freeze({
    [ENEMY_TYPE_CRAB]: 600,
    [ENEMY_TYPE_HAMMERHEAD_SHARK]: 1200,
    [ENEMY_TYPE_SHARK]: 1200,
  }),
  guaranteedSpeciesInitialOffsets: Object.freeze({
    [ENEMY_TYPE_CRAB]: 600,
    [ENEMY_TYPE_HAMMERHEAD_SHARK]: 300,
    [ENEMY_TYPE_SHARK]: 900,
  }),
});

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
    WATER_SURFACE_Y,
    CRAB_DRIFT_SPEED, CRAB_SEABED_FACTOR, OCTOPUS_SPAWN_Y_FACTOR,
    CRAB_REWARD_GLOW_COLOR,
    CRAB_REWARD_GLOW_SHADOW_BLUR_MIN, CRAB_REWARD_GLOW_SHADOW_BLUR_MAX,
    CRAB_REWARD_GLOW_PULSE_SPEED, CRAB_REWARD_GLOW_ALPHA_MIN, CRAB_REWARD_GLOW_ALPHA_MAX,
    CRAB_REWARD_GLOW_SCALE_MIN, CRAB_REWARD_GLOW_SCALE_MAX,
    LION_FISH_DRIFT_SPEED, HAMMERHEAD_SHARK_DRIFT_SPEED, SHARK_DRIFT_SPEED,
    SWORDFISH_DRIFT_SPEED, TUNA_DRIFT_SPEED, CLOWN_FISH_DRIFT_SPEED,
    JELLY_FISH_DRIFT_SPEED, PUFFER_FISH_DRIFT_SPEED,
    PLAYER_ANIM_STAGGER, PLAYER_CATCH_MAX_FRAME_X, PLAYER_CATCH_MAX_FRAME_Y,
    PARALLAX_GAME_SPEED,
    CAPTURE_PHASE_RISING, CAPTURE_PHASE_THROWING,
    CAPTURE_GLOW_SPEED, CAPTURE_ESCAPE_PARTICLES, CAPTURE_THROW_THRESHOLD, CAPTURE_THROW_ARC_Y,
    HOOK_STRUGGLE_REEL_POWER, HOOK_STRUGGLE_MAX_ESCAPE, HOOK_REEL_DISTANCE_PER_PRESS,
    FISH_SPECS,
    HOOK_STATUS_IDLE, HOOK_STATUS_CAST, HOOK_STATUS_HOOKED, HOOK_STATUS_RETRIEVING_EMPTY,
    ENEMY_TYPE_BUTTERFLY_FISH, ENEMY_TYPE_LION_FISH, ENEMY_TYPE_HAMMERHEAD_SHARK, ENEMY_TYPE_SWORDFISH, ENEMY_TYPE_TUNA, ENEMY_TYPE_CLOWN_FISH, ENEMY_TYPE_DISCARDED_BOTTLE, ENEMY_TYPE_OCTOPUS, ENEMY_TYPE_CRAB, ENEMY_TYPE_SHARK, ENEMY_TYPE_RED_APPLE, ENEMY_TYPE_JELLY_FISH, ENEMY_TYPE_WHEEL, ENEMY_TYPE_PUFFER_FISH, ENEMY_TYPE_SHOE, ENEMY_TYPE_FISH_BONE, ENEMY_TYPE_CLOCK,
    FISH_RARITY_COMMON, FISH_RARITY_UNCOMMON, FISH_RARITY_RARE, FISH_RARITY_EPIC, FISH_RARITY_LEGENDARY,
    FISH_LANE_SURFACE, FISH_LANE_UPPER, FISH_LANE_MIDDLE, FISH_LANE_DEEP, FISH_LANE_BOTTOM,
    FISH_CLASS_BUTTERFLY_FISH, FISH_CLASS_LION_FISH, FISH_CLASS_HAMMERHEAD_SHARK,
    FISH_CLASS_SWORDFISH, FISH_CLASS_TUNA, FISH_CLASS_CLOWN_FISH,
    FISH_CLASS_DISCARDED_BOTTLE, FISH_CLASS_OCTOPUS, FISH_CLASS_CRAB,
    FISH_CLASS_SHARK, FISH_CLASS_RED_APPLE, FISH_CLASS_JELLY_FISH,
    FISH_CLASS_WHEEL, FISH_CLASS_PUFFER_FISH, FISH_CLASS_SHOE, FISH_CLASS_FISH_BONE, FISH_CLASS_CLOCK,
    CLOCK_TIME_BONUS_SECONDS,
    FISH_TRAFFIC_DIRECTION_RIGHT, FISH_TRAFFIC_DIRECTION_LEFT,
    FISH_TRAFFIC_DEFAULT_PRESEED_PER_LANE, FISH_TRAFFIC_SEED_X_MIN_FACTOR,
    FISH_TRAFFIC_SEED_X_RANGE_FACTOR, FISH_TRAFFIC_MIN_TIMER_JITTER,
    FISH_TRAFFIC_COOLDOWN_READY, FISH_TRAFFIC_QUEUE_START_INDEX,
    FISH_TRAFFIC_TIMER_TICK, FISH_TRAFFIC_LAST_INDEX_OFFSET,
    FISH_TRAFFIC_WEIGHT_THRESHOLD, FISH_TRAFFIC_MAX_ACTIVE_ONE,
    MOBILE_SHORT_EDGE_MAX, GAMEPLAY_PROFILE_DESKTOP, GAMEPLAY_PROFILE_MOBILE,
    FISH_LANES, FISH_DEFINITIONS, FISH_SCORE_MAP,
    ENEMY_ESCAPE_SPEED_MULTIPLIER, ENEMY_STATUS_CAPTURED,
    PLAYER_STATE_IDLE, PLAYER_STATE_MOVING_R, PLAYER_STATE_MOVING_L,
    PLAYER_STATE_CAST, PLAYER_STATE_REEL,
    BUBBLE_DIE_DURATION, BUBBLE_DIE_THRESHOLD_Y, BUBBLE_BATCH_SIZE,
    BUBBLE_SPEED_Y, BUBBLE_SIZE_MIN, BUBBLE_SIZE_MAX, BUBBLE_SPAWN_X_MIN,
    BUBBLE_RING_COUNT, BUBBLE_RING_STAGGER,
    EVENT_ENEMY_CAPTURED, EVENT_ENEMY_ESCAPED, EVENT_ENEMY_EVADED,
    EVENT_ENEMY_HOOKED, EVENT_ROD_CASTED, EVENT_REEL_RETRIEVING, EVENT_HOOK_IDLE, EVENT_REEL_POWER_CHANGED, EVENT_TIMER_TIMEUP,
    EVENT_CAST_REQUESTED, EVENT_REEL_TAP, EVENT_REEL_START, EVENT_REEL_STOP, EVENT_TIME_BONUS,
    TOUCH_REEL_STOP_DELAY_MS, TOUCH_DUPLICATE_TAP_GUARD_MS,
    GAME_NEEDED_SCORE,
  };
}

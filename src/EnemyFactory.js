class EnemyFactory {

  constructor(profile = GAMEPLAY_PROFILE_DESKTOP) {
    this._profile = profile || GAMEPLAY_PROFILE_DESKTOP;
    this._registry = {
      [ENEMY_TYPE_BUTTERFLY_FISH]:   ButterflyFish,
      [ENEMY_TYPE_CLOWN_FISH]:       ClownFish,
      [ENEMY_TYPE_JELLY_FISH]:       JellyFish,
      [ENEMY_TYPE_PUFFER_FISH]:      PufferFish,
      [ENEMY_TYPE_LION_FISH]:        LionFish,
      [ENEMY_TYPE_CRAB]:             Crab,
      [ENEMY_TYPE_LOBSTER]:          Lobster,
      [ENEMY_TYPE_OCTOPUS]:          Octopus,
      [ENEMY_TYPE_SHARK]:            Shark,
      [ENEMY_TYPE_HAMMERHEAD_SHARK]: HammerHeadShark,
      [ENEMY_TYPE_SWORDFISH]:        SwordFish,
      [ENEMY_TYPE_TUNA]:             Tuna,
      [ENEMY_TYPE_DISCARDED_BOTTLE]: DiscardedBottle,
      [ENEMY_TYPE_RED_APPLE]:        RedApple,
      [ENEMY_TYPE_WHEEL]:            Wheel,
      [ENEMY_TYPE_SHOE]:             Shoe,
      [ENEMY_TYPE_FISH_BONE]:        FishBone,
      [ENEMY_TYPE_CHEST_WITH_JEWELS]: ChestWithJewels,
      [ENEMY_TYPE_CLOCK]:            Clock,
    };
    this.specs = {};
    FISH_DEFINITIONS.forEach(def => {
      const Cls = this._registry[def.id];
      const entry = {
        image: typeof document !== 'undefined' ? document.getElementById(def.domId) : null,
        size: new Size(def.displayH, def.displayW),
      };
      if (!(Cls.prototype instanceof CatchableFish)) {
        entry.maxFrames = def.maxFrames;
      } else {
        entry.spriteFrameSize = new Size(def.frameH, def.frameW);
        entry.maxFrameX = def.maxFrameX;
        entry.maxFrameY = def.maxFrameY;
        entry.dieFrameX = def.dieFrameX;
        entry.dieFrameY = def.dieFrameY;
        entry.strength   = def.strength;
        entry.escapeRate = def.escapeRate;
      }
      entry.captureRotation           = def.captureRotation;
      entry.captureOffsetX            = def.captureOffsetX;
      entry.captureOffsetY            = def.captureOffsetY;
      entry.struggleSpeed             = def.struggleSpeed;
      entry.struggleRotationAmplitude = def.struggleRotationAmplitude;
      entry.struggleOffsetAmplitude   = def.struggleOffsetAmplitude;
      this.specs[def.id] = entry;
    });
    this._applyProfileScale();
  }

  setProfile(profile) {
    this._profile = profile || GAMEPLAY_PROFILE_DESKTOP;
    this._applyProfileScale();
  }

  _applyProfileScale() {
    const scale = this._profile.spriteScale || 1;
    Object.keys(this.specs).forEach(key => {
      const spec = this.specs[key];
      if (!spec || !spec.size) return;
      if (!spec.baseSize) spec.baseSize = spec.size;
      spec.size = new Size(
        spec.baseSize.getHeight() * scale,
        spec.baseSize.getWidth() * scale
      );
    });
  }

  createEnemy(name, game, ctx) {
    const spec = this.specs[name];
    const Cls  = this._registry[name];
    if (!spec || !Cls) return null;
    const enemy = Cls.create(game, ctx, spec);
    if (enemy) {
      enemy._captureRotation           = spec.captureRotation;
      enemy._captureOffsetX            = spec.captureOffsetX;
      enemy._captureOffsetY            = spec.captureOffsetY;
      enemy._struggleSpeed             = spec.struggleSpeed ?? 0;
      enemy._struggleRotationAmplitude = spec.struggleRotationAmplitude ?? 0;
      enemy._struggleOffsetAmplitude   = spec.struggleOffsetAmplitude ?? 0;
      if (enemy instanceof CatchableFish) {
        enemy._strength   = spec.strength;
        enemy._escapeRate = spec.escapeRate;
      }
    }
    return enemy;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { EnemyFactory };
}

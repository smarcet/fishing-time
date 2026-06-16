'use strict';
if (typeof module !== 'undefined' && module.exports) {
  const _c = require('./src/constants');
  Object.assign(global, _c);
  const { Size }               = require('./src/Size');               global.Size               = Size;
  const { Point }              = require('./src/Point');              global.Point              = Point;
  const { GameObject }         = require('./src/GameObject');         global.GameObject         = GameObject;
  const { InputHandler }       = require('./src/InputHandler');       global.InputHandler       = InputHandler;
  const { Enemy }              = require('./src/Enemy');              global.Enemy              = Enemy;
  const { EnemyWithAnimation } = require('./src/EnemyWithAnimation'); global.EnemyWithAnimation = EnemyWithAnimation;
  const { CatchableFish }      = require('./src/CatchableFish');      global.CatchableFish      = CatchableFish;
  const { InertObject }        = require('./src/InertObject');        global.InertObject        = InertObject;
  const { DiscardedBottle }    = require('./src/DiscardedBottle');    global.DiscardedBottle    = DiscardedBottle;
  const { Octopus }            = require('./src/Octopus');            global.Octopus            = Octopus;
  const { Crab }               = require('./src/Crab');               global.Crab               = Crab;
  const { ButterflyFish }      = require('./src/ButterflyFish');      global.ButterflyFish      = ButterflyFish;
  const { LionFish }           = require('./src/LionFish');           global.LionFish           = LionFish;
  const { HammerHeadShark }   = require('./src/HammerHeadShark');   global.HammerHeadShark   = HammerHeadShark;
  const { SwordFish }         = require('./src/SwordFish');         global.SwordFish         = SwordFish;
  const { Hook }               = require('./src/Hook');               global.Hook               = Hook;
  const { Player }             = require('./src/Player');             global.Player             = Player;
  const { Bubble }             = require('./src/Bubble');             global.Bubble             = Bubble;
  module.exports = { Size, Point, GameObject, Enemy, EnemyWithAnimation, CatchableFish, InertObject, DiscardedBottle, Octopus, Crab, ButterflyFish, LionFish, HammerHeadShark, SwordFish, Hook, Player, Bubble };
}

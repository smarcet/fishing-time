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
  const { Trash }              = require('./src/Trash');              global.Trash              = Trash;
  const { Octopus }            = require('./src/Octopus');            global.Octopus            = Octopus;
  const { Crab }               = require('./src/Crab');               global.Crab               = Crab;
  const { Fish }               = require('./src/Fish');               global.Fish               = Fish;
  const { Hook }               = require('./src/Hook');               global.Hook               = Hook;
  const { Player }             = require('./src/Player');             global.Player             = Player;
  module.exports = { Size, Point, GameObject, Enemy, EnemyWithAnimation, Trash, Octopus, Crab, Fish, Hook, Player };
}

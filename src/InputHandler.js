class InputHandler {
  constructor(game) {
    this._game = game;

    window.addEventListener('keydown', (e) => {
      console.log(`InputHandler keydown`, e.key);
      if(AllowedKeys.indexOf(e.key) > -1)
        this._game.addKey(e.key);
    });

    window.addEventListener('keyup', (e) => {
       console.log(e.key);
       this._game.removeKey(e.key);
    });
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { InputHandler };
}

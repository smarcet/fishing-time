'use strict';

class InputHandler extends KeyboardInputSystem {
  constructor(targetOrGame = (typeof window !== 'undefined' ? window : null)) {
    const target = targetOrGame && typeof targetOrGame.addEventListener === 'function'
      ? targetOrGame
      : (typeof window !== 'undefined' ? window : null);
    super(target);
    this._legacyGame = target === targetOrGame ? null : targetOrGame;
    this.attach();
  }

  _onKeyDown(event) {
    super._onKeyDown(event);
    if (!this._legacyGame || !event || event.key === KEY_SPACE || !this._enabled) return;
    if (AllowedKeys.indexOf(event.key) > -1 && typeof this._legacyGame.addKey === 'function') {
      this._legacyGame.addKey(event.key);
    }
  }

  _onKeyUp(event) {
    super._onKeyUp(event);
    if (!this._legacyGame || !event || event.key === KEY_SPACE) return;
    if (AllowedKeys.indexOf(event.key) > -1 && typeof this._legacyGame.removeKey === 'function') {
      this._legacyGame.removeKey(event.key);
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { InputHandler };
}

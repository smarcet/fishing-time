'use strict';

class KeyboardInputSystem extends InputSystem {
  constructor(target = (typeof window !== 'undefined' ? window : null)) {
    super(target);
    this._keys = [];
    this._handleKeyDown = (event) => this._onKeyDown(event);
    this._handleKeyUp = (event) => this._onKeyUp(event);
  }

  attach() {
    if (this._attached || !this._target) return;
    this._target.addEventListener('keydown', this._handleKeyDown);
    this._target.addEventListener('keyup', this._handleKeyUp);
    this._attached = true;
  }

  destroy() {
    if (this._attached && this._target) {
      this._target.removeEventListener('keydown', this._handleKeyDown);
      this._target.removeEventListener('keyup', this._handleKeyUp);
    }
    this._keys = [];
    this._attached = false;
  }

  setEnabled(enabled) {
    super.setEnabled(enabled);
    if (!this._enabled) this._keys = [];
  }

  hasKey(key) {
    return this._enabled && this._keys.indexOf(key) > -1;
  }

  _onKeyDown(event) {
    if (!this._enabled || !event || AllowedKeys.indexOf(event.key) === -1) return;
    if (typeof event.preventDefault === 'function') event.preventDefault();

    if (event.key === KEY_SPACE) {
      if (event.repeat) return;
      this._dispatch(EVENT_CAST_REQUESTED);
      this._dispatch(EVENT_REEL_START);
      this._dispatch(EVENT_REEL_TAP);
      return;
    }

    if (this._keys.indexOf(event.key) === -1) {
      this._keys.push(event.key);
    }
  }

  _onKeyUp(event) {
    if (!event || AllowedKeys.indexOf(event.key) === -1) return;
    if (typeof event.preventDefault === 'function') event.preventDefault();

    if (event.key === KEY_SPACE) {
      this._dispatch(EVENT_REEL_STOP);
      return;
    }

    const index = this._keys.indexOf(event.key);
    if (index > -1) this._keys.splice(index, 1);
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { KeyboardInputSystem };
}

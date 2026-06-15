class Size {
  constructor(h, w) {
    this._h = h;
    this._w = w;
  }

  getWidth(){return this._w}
  getHeight(){return this._h;}
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Size };
}

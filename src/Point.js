class Point {
  constructor(x, y) {
    this._x = x;
    this._y = y;
  }

  getX(){return this._x}
  getY(){return this._y;}
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { Point };
}

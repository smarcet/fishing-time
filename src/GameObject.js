class GameObject {

  constructor(ctx, size, position = new Point(0, 0)) {
    this._size = size;
    this._ctx = ctx;
    this._position = position;
    this._isLive = true;
  }

  getPosition(){
    return this._position;
  }

  getSize(){
    return this._size;
  }

  update(){}

  draw(){}

  markDead(){ this._isLive = false};

  isLive(){ return this._isLive;}
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { GameObject };
}

class Bubble extends GameObject {
  constructor(game, ctx, size, position) {
    super(ctx, size, position)
    this._game = game;
    this._speedY  = 0.5;
    this._speedX  = 0;
    this._image = document.getElementById('bubble');
  }

  update(){
    super.update();
    const formerPosition = this._position;
    this._position = new Point(formerPosition.getX() ,formerPosition.getY() - this._speedY);
  }

  draw(){
    this._ctx.drawImage(this._image, this._position.getX(), this._position.getY(), this._size.getWidth(), this._size.getHeight());
  }

}

class Layer {
  constructor(image, width, height, speedModifier) {
    this.x = 0;
    this.y = 0;
    this.image = image;
    this.width = width;
    this.height = height;
    this.speedModifier = speedModifier;
    this.speed = PARALLAX_GAME_SPEED * this.speedModifier;
  }

  update() {
    if (this.x <= -this.width) this.x = 0;
    this.x = this.x - this.speed;
  }

  draw(ctx) {
    ctx.drawImage(this.image, this.x, this.y, this.width, this.height);
    ctx.drawImage(this.image, this.x + this.width, this.y, this.width, this.height);
  }
}

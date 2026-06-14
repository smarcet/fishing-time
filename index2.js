const gameSpeed = 5;
let gameFrame = 0;

class Layer {
  constructor(image, width , height, speedModifier) {
    this.x= 0;
    this.y = 0;
    this.image = image;
    this.width = width;
    this.height = height;
    this.speedModifier = speedModifier;
    this.speed = gameSpeed * this.speedModifier;
  }

  update(){
    this.speed = gameSpeed * this.speedModifier;
    if(this.x <= -this.width){
      this.x = 0;
    }
    this.x = this.x - this.speed;
  }

  draw(ctx){
    ctx.drawImage(this.image, this.x, this.y ,this.width, this.height);
    ctx.drawImage(this.image, this.x + this.width, this.y ,this.width, this.height);
  }
}
window.addEventListener('load', function(){
  const canvas = document.getElementById("canvas1");
  const ctx = canvas.getContext('2d');
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;


  let lastTime = 0
  let x = 0

  const layers = [
    new Layer(document.getElementById("sky"), 1920,1080, 0.0),
    new Layer(document.getElementById("cloud"), 1920,1080, 0.1),
    new Layer(document.getElementById("ocean"), 1920,1080, 0.2),
    new Layer(document.getElementById("ocean1"), 1920,1080, 0.0),
    new Layer(document.getElementById("ocean2"), 1920,1080, 0.0),
    new Layer(document.getElementById("ground"), 1920,1080, 0.0),
    new Layer(document.getElementById("ground2"), 1920,1080, 0.0),
    new Layer(document.getElementById("ground3"), 1920,1080, 0.0)
  ]

  function animationLoop(timestamp){
    const deltaTime = timestamp - lastTime;
    lastTime = timestamp;
    ctx.clearRect(0, 0, canvas.width,   canvas.height);
    layers.forEach( l=> {
      l.update();
      l.draw(ctx);
    })
    requestAnimationFrame(animationLoop);
    ++gameFrame;
  }

  animationLoop(0);

});

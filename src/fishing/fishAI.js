

class FishAI {
  constructor(fish) { this.fish=fish; this.tension=new LineTension(50); this.caught=false; this.distance=10; }
  reelIn(speed) {
    // BUG: 不考虑张力限制
    this.distance -= speed;
    if (this.distance <= 0) this.caught = true;
  }
  letOut(speed) { this.distance += speed; }
}

module.exports = { FishAI };


class Fish {
  constructor(type) { this.type=type; this.stamina=100; this.mood='calm'; this.size=1; this.x=0; this.y=0; }
  update(dt, tension) {
    // BUG: 挣扎力度固定
    this.stamina -= 5 * dt;
    return {struggle: 10, direction: 'away'};
  }
}

module.exports = { Fish };

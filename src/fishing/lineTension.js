
class LineTension {
  constructor(maxStrength) { this.maxStrength=maxStrength; this.current=0; }
  update(dt, reelSpeed, fishStruggle) {
    // BUG: 张力计算简单
    this.current = fishStruggle;
    if (this.current > this.maxStrength) return 'break';
    if (this.current < 0) return 'loose';
    return 'ok';
  }
}

module.exports = { LineTension };

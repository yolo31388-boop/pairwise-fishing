class LineTension {
  constructor(maxStrength, minTension = 0.5) {
    this.maxStrength = maxStrength;
    this.minTension = minTension;
    this.current = 0;
  }

  update(dt, reelSpeed, fishStruggle) {
    this.current = fishStruggle + Math.max(0, reelSpeed) * 2;
    if (this.current > this.maxStrength) return 'break';
    if (this.current < this.minTension) return 'loose';
    return 'ok';
  }
}

module.exports = { LineTension };

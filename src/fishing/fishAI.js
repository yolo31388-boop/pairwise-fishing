const { LineTension } = require('./lineTension.js');

const AUTO_RELEASE_RATIO = 0.6;

class FishAI {
  constructor(fish, env = {}) {
    this.fish = fish;
    this.tension = new LineTension(50);
    this.caught = false;
    this.escaped = false;
    this.lineBroken = false;
    this.hooked = true;
    this.fish.hooked = true;
    this.fish.mood = 'tense';
    this.distance = 10;
    this.reelAngle = 45;
    this.env = env;
    this.progress = 0;
  }

  castLine(env = this.env, roll = 0.5) {
    const p = this.fish.getBiteProbability(env);
    this.hooked = roll < p;
    this.fish.hooked = this.hooked;
    if (this.hooked) {
      this.fish.mood = 'tense';
      this.escaped = false;
      this.lineBroken = false;
    }
    return this.hooked;
  }

  checkHook() {
    const struggle = this.fish.struggleForce();
    const anglePenalty = Math.abs(this.reelAngle - 45) / 45 * 0.2;
    const looseBonus = this.tension.current < this.tension.minTension ? 0.3 : 0;
    return Math.min(0.95, Math.max(0, 0.02 + struggle * 0.01 + anglePenalty + looseBonus));
  }

  reelIn(speed, dt = 1) {
    if (!this.hooked || this.caught || this.lineBroken) return;
    this.fish.update(dt, this.tension.current);
    const struggle = this.fish.struggleForce() * this._envStruggleMultiplier();
    const blended = 0.5 * this.tension.current + 0.5 * (struggle + Math.max(0, speed) * 2);
    const status = this.tension.update(0, 0, blended);
    if (status === 'break') {
      this.lineBroken = true;
      this.hooked = false;
      return;
    }
    const ratio = this.tension.current / this.tension.maxStrength;
    if (ratio > AUTO_RELEASE_RATIO) {
      this.distance += (ratio - AUTO_RELEASE_RATIO) * Math.max(0, speed) * 2;
    } else {
      this.distance -= speed * (1 - ratio);
    }
    if (this.fish.state === 'tired') this.distance -= 0.5 * dt;
    this._syncProgress();
    if (this.distance <= 0) {
      this.distance = 0;
      this.caught = true;
      this._syncProgress();
    }
  }

  letOut(speed, dt = 1) {
    if (!this.hooked || this.caught || this.lineBroken) return;
    this.distance += speed;
    this.fish.recover(dt);
    const status = this.tension.update(0, 0, this.tension.current * 0.5);
    if (status === 'loose') {
      this.escaped = true;
      this.hooked = false;
    }
    this._syncProgress();
  }

  update(dt, roll = 1) {
    if (!this.hooked || this.caught) return;
    const result = this.fish.update(dt, this.tension.current);
    const struggle = result.struggle * this._envStruggleMultiplier();
    const status = this.tension.update(dt, 0, struggle);
    if (status === 'break') {
      this.lineBroken = true;
      this.hooked = false;
      return;
    }
    if (status === 'loose') {
      this.escaped = true;
      this.hooked = false;
      return;
    }
    if (roll < this.checkHook()) {
      this.escaped = true;
      this.hooked = false;
      return;
    }
    const move = Math.min(2, struggle * 0.05) * dt;
    if (result.direction === 'away') this.distance += move;
    else if (result.direction === 'toward') this.distance -= move;
    this._syncProgress();
    if (this.distance <= 0) {
      this.distance = 0;
      this.caught = true;
      this._syncProgress();
    }
  }

  _envStruggleMultiplier() {
    let mul = 1;
    if (this.env.current === 'strong') mul *= 1.3;
    else if (this.env.current === 'weak') mul *= 0.9;
    const water = this.env.water || this.env.depth;
    if (water === 'deep') mul *= 1.1;
    return mul;
  }

  _syncProgress() {
    this.progress = Math.min(1, Math.max(0, 1 - this.distance / 10));
  }
}

module.exports = { FishAI };

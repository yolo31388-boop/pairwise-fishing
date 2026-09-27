const SPECIES = {
  carp:   { size: 1, maxStamina: 100, strength: 8,  pattern: 'steady', baseBite: 0.5 },
  salmon: { size: 2, maxStamina: 120, strength: 12, pattern: 'dart',   baseBite: 0.4 },
  tuna:   { size: 3, maxStamina: 160, strength: 16, pattern: 'steady', baseBite: 0.3 },
  shark:  { size: 5, maxStamina: 220, strength: 24, pattern: 'burst',  baseBite: 0.2 },
};

const MOOD_MULTIPLIER = { calm: 0.5, tense: 1.0, frenzied: 1.5 };

class Fish {
  constructor(type) {
    const spec = SPECIES[type] || SPECIES.carp;
    this.type = type;
    this.size = spec.size;
    this.maxStamina = spec.maxStamina;
    this.stamina = spec.maxStamina;
    this.strength = spec.strength;
    this.pattern = spec.pattern;
    this.baseBite = spec.baseBite;
    this.mood = 'calm';
    this.hooked = false;
    this.state = 'fleeing';
    this.elapsed = 0;
    this.x = 0;
    this.y = 0;
  }

  get staminaRatio() {
    return Math.max(0, this.stamina) / this.maxStamina;
  }

  struggleForce() {
    const moodMul = MOOD_MULTIPLIER[this.mood] || 1;
    let patternMul = 1;
    if (this.pattern === 'burst') patternMul = 1 + 0.5 * Math.sin(this.elapsed * 4);
    else if (this.pattern === 'dart') patternMul = (Math.floor(this.elapsed * 2) % 2 === 0) ? 1.3 : 0.7;
    return this.strength * this.size * (0.2 + 0.8 * this.staminaRatio) * moodMul * patternMul;
  }

  update(dt, tension = 0) {
    this.elapsed += dt;
    this._updateMood(tension);
    const struggle = this.struggleForce();
    const drain = (2 + struggle * 0.3 + Math.max(0, tension) * 0.05) * dt;
    this.stamina = Math.max(0, this.stamina - drain);
    this._updateState();
    return { struggle, direction: this.direction() };
  }

  recover(dt) {
    this.stamina = Math.min(this.maxStamina, this.stamina + 5 * dt);
    if (this.hooked && this.mood === 'calm') this.mood = 'tense';
    this._updateState();
  }

  direction() {
    if (this.state === 'tired') return 'toward';
    if (this.state === 'fleeing') return 'away';
    return 'sideways';
  }

  getBiteProbability(env = {}) {
    let p = this.baseBite;
    const time = env.time || 'noon';
    if (time === 'dawn' || time === 'dusk') p += 0.2;
    else if (time === 'night') p += 0.1;
    const water = env.water || env.depth || 'shallow';
    if (water === 'deep') p += 0.05 * this.size;
    else p -= 0.02 * this.size;
    if (env.current === 'strong') p -= 0.1;
    else if (env.current === 'weak') p += 0.05;
    return Math.min(0.95, Math.max(0.05, p));
  }

  _updateMood(tension) {
    let mood;
    if (tension > 30) mood = 'frenzied';
    else if (tension > 5) mood = 'tense';
    else mood = 'calm';
    if (this.hooked && mood === 'calm') mood = 'tense';
    this.mood = mood;
  }

  _updateState() {
    if (this.staminaRatio <= 0.15) this.state = 'tired';
    else if (this.mood === 'frenzied') this.state = 'fleeing';
    else this.state = 'struggling';
  }
}

module.exports = { Fish, SPECIES };

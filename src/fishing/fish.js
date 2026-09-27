// 鱼：拥有体力、情绪（平静/紧张/狂暴）、状态（逃跑/挣扎/疲劳）。
// 挣扎力度由剩余体力、情绪、鱼的大小和鱼种力量共同决定，不是固定值。

const SPECIES = {
  carp:   { stamina: 60,  strength: 8,  size: 1.0, pattern: 'steady',   bite: 0.5 },
  bass:   { stamina: 80,  strength: 12, size: 1.4, pattern: 'bursts',   bite: 0.45 },
  catfish:{ stamina: 120, strength: 18, size: 2.2, pattern: 'dives',    bite: 0.3 },
  shark:  { stamina: 200, strength: 30, size: 4.0, pattern: 'frenzied', bite: 0.15 }
};

const MOOD_FACTOR = { calm: 0.5, tense: 1.0, frenzied: 1.6 };
const TIME_BITE = { dawn: 1.3, day: 1.0, dusk: 1.2, night: 0.6 };

class Fish {
  constructor(type = 'carp') {
    const base = SPECIES[type] || SPECIES.carp;
    this.type = SPECIES[type] ? type : 'carp';
    this.maxStamina = base.stamina;
    this.stamina = base.stamina;
    this.baseStrength = base.strength;
    this.size = base.size;
    this.pattern = base.pattern;
    this.baseBite = base.bite;
    this.mood = 'calm';          // calm | tense | frenzied
    this.state = 'flee';         // flee | struggle | exhausted
    this.hooked = false;
    this.x = 0;
    this.y = 0;
    this.env = { depth: 0, current: 0, time: 'day' };
    this._stepCount = 0;
  }

  setEnvironment(env = {}) {
    this.env = {
      depth: env.depth || 0,        // 水深（米）
      current: env.current || 0,    // 水流强度 0~1
      time: env.time || 'day'       // dawn | day | dusk | night
    };
    return this.env;
  }

  onHook() {
    this.hooked = true;
    if (this.mood === 'calm') this.mood = 'tense';
  }

  staminaFraction() {
    return Math.max(0, Math.min(1, this.stamina / this.maxStamina));
  }

  // 情绪随紧张程度升级，绝不主动回落
  escalateMood(pressure) {
    if (this.mood === 'frenzied') return this.mood;
    if (pressure >= 0.9) this.mood = 'frenzied';
    else if (this.mood === 'calm') this.mood = 'tense';
    return this.mood;
  }

  _patternMultiplier() {
    if (this.pattern === 'bursts') {
      // 周期性爆发：每 3 步一次强力冲刺
      return this._stepCount % 3 === 2 ? 1.7 : 0.7;
    }
    if (this.pattern === 'dives') return this._stepCount % 4 === 3 ? 1.5 : 0.95;
    if (this.pattern === 'frenzied') return 1.1 + 0.3 * Math.min(1, this._stepCount / 5);
    return 1.0; // steady
  }

  _envMultiplier() {
    // 水深、水流都会增强鱼的挣扎
    return 1 + this.env.depth * 0.01 + this.env.current * 0.25;
  }

  deriveState() {
    const f = this.staminaFraction();
    if (f <= 0.15) this.state = 'exhausted';
    else if (f <= 0.5) this.state = 'struggle';
    else this.state = 'flee';
    return this.state;
  }

  // 实时行为：基于体力的挣扎力度 + 基于状态的移动方向（非随机）
  update(dt = 1, tension = 0) {
    if (!Number.isFinite(dt) || dt <= 0) dt = 1;
    if (this.hooked) {
      this.escalateMood(Math.max(1 - this.staminaFraction(), tension / 50));
    }
    this.deriveState();

    const fraction = this.staminaFraction();
    const staminaTerm = 0.15 + 0.85 * fraction;        // 体力越低挣扎越弱
    let struggle = this.baseStrength *
      this.size *
      staminaTerm *
      MOOD_FACTOR[this.mood] *
      this._patternMultiplier() *
      this._envMultiplier();
    if (this.state === 'exhausted') struggle = 0;

    // 移动方向由当前状态决定，而不是随机方向
    let direction;
    if (this.state === 'flee') direction = 'away';       // 逃跑：远离玩家
    else if (this.state === 'struggle') direction = 'dive'; // 挣扎：下潜
    else direction = 'toward';                           // 疲劳：被拖向玩家

    // 挣扎本身持续消耗体力，狂暴/紧张时消耗更快
    const drain = (3 + this.baseStrength * 0.25) * MOOD_FACTOR[this.mood] * dt;
    this.stamina = Math.max(0, this.stamina - drain);
    if (this.stamina === 0) this.deriveState();

    this._stepCount++;
    this.lastStruggle = struggle;
    this.lastDirection = direction;
    return { struggle, direction, state: this.state, mood: this.mood };
  }

  // 放线：体力缓慢恢复；钩上的鱼情绪必须保持紧张，不能回到平静
  recover(dt = 1) {
    if (!Number.isFinite(dt) || dt <= 0) dt = 1;
    this.stamina = Math.min(this.maxStamina, this.stamina + 4 * dt);
    if (this.hooked && this.mood === 'calm') this.mood = 'tense';
    this.deriveState();
    return this.stamina;
  }

  // 上钩概率受鱼种、时间、水深、水流影响
  getBiteProbability(env = this.env) {
    const depthPenalty = env.depth ? Math.max(0.5, 1 - env.depth * 0.02) : 1;
    const currentPenalty = 1 - (env.current || 0) * 0.3;
    const timeMod = TIME_BITE[env.time] || 1;
    return Math.max(0, Math.min(1, this.baseBite * timeMod * depthPenalty * currentPenalty));
  }
}

module.exports = { Fish, SPECIES };

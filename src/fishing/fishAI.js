const { LineTension } = require('./lineTension');

const STEP = 0.1;          // 每个公开动作推进的模拟时长（秒）
const AUTO_PAY_RATIO = 0.8; // 张力达到鱼线强度 80% 时自动放线

class FishAI {
  constructor(fish, lineStrength = 50, minTension = 0) {
    this.fish = fish;
    this.tension = new LineTension(lineStrength, minTension);
    this.distance = 10;
    this.caught = false;
    this.escaped = false;
    this.broken = false;
    this.hooked = false;
    this.angle = 0.5;            // 收线角度 0（顺直）~1（垂直）
    this.autoReleased = false;
    this.lastStatus = 'ok';
  }

  // 抛竿：环境因素决定鱼是否上钩；上钩后初始化收线状态
  castLine(env = {}) {
    if (env) this.fish.setEnvironment(env);
    this.tension.reset();
    this.distance = 10;
    this.caught = false;
    this.escaped = false;
    this.broken = false;
    this.autoReleased = false;
    const bite = this.fish.getBiteProbability(this.fish.env);
    this.hooked = Math.random() < bite;
    if (this.hooked) this.fish.onHook();
    return this.hooked;
  }

  get active() {
    return this.hooked && !this.caught && !this.escaped && !this.broken;
  }

  // 脱钩概率：鱼挣扎越猛、收线角度越偏，概率越高
  hookEscapeProbability(angle = this.angle) {
    const struggle = this.fish.lastStruggle || 0;
    const struggleTerm = struggle / (struggle + this.tension.maxStrength);
    // 鱼不挣扎（疲劳）时无法脱钩；挣扎越猛、角度越偏概率越高
    return Math.max(0, Math.min(1, struggleTerm * (0.6 + 0.4 * angle)));
  }

  // 单次掷骰判定是否脱钩
  checkHook(angle = this.angle) {
    return Math.random() < this.hookEscapeProbability(angle);
  }

  // 收线速度受当前张力限制：张力越高，实际收线速度越低
  _effectiveReelSpeed(speed) {
    const load = Math.max(0, Math.min(1, this.tension.current / this.tension.maxStrength));
    return Math.max(0, speed) * (1 - load);
  }

  // 鱼基于状态产生的位移：逃跑远离玩家、挣扎下潜拉扯、疲劳漂向玩家
  _fishMovement(behavior) {
    const t = this.fish.lastStruggle / 10;
    if (behavior.direction === 'away') return t;
    if (behavior.direction === 'dive') return t * 0.5;
    return -(0.5 + t); // exhausted：向玩家漂移
  }

  reelIn(speed) {
    return this._step(Math.max(0, speed), false);
  }

  letOut(speed) {
    return this._step(Math.max(0, speed), true);
  }

  // 无线轮操作时推进鱼与张力的模拟
  update(dt = STEP) {
    return this._step(0, false, dt);
  }

  _step(rawSpeed, payingOut, dt = STEP) {
    if (this.caught || this.escaped || this.broken) return this.lastStatus;
    if (!this.hooked) {
      this.hooked = true;
      this.fish.onHook();
    }

    const behavior = this.fish.update(dt, this.tension.current);

    let reelSpeed = 0;
    let payout = 0;
    if (payingOut) {
      payout = rawSpeed;
    } else {
      // 张力过高：禁止继续收线并自动放线，防止断线
      if (this.tension.current >= this.tension.maxStrength * AUTO_PAY_RATIO) {
        this.autoReleased = true;
        payout = Math.max(2, rawSpeed);
      } else {
        reelSpeed = this._effectiveReelSpeed(rawSpeed);
      }
    }

    const status = this.tension.update(dt, reelSpeed, this.fish.lastStruggle);

    // 距离变化：收线拉近、放线放远、鱼按状态位移（收线闭合按当次有效速度计）
    const fishMove = this._fishMovement(behavior);
    if (payingOut || payout > 0) {
      this.distance += payout * dt + fishMove;
      this.fish.recover(dt); // 放线时鱼缓慢恢复体力，但情绪保持紧张
    } else {
      this.distance -= reelSpeed;
      this.distance += fishMove;
    }
    this.distance = Math.max(0, this.distance);

    if (status === 'break') {
      this.broken = true;
      this.lastStatus = 'break';
      return 'break';
    }
    if (status === 'loose') {
      this.escaped = true;
      this.lastStatus = 'loose';
      return 'loose';
    }

    if (this.distance <= 0) {
      this.caught = true;
      this.lastStatus = 'caught';
      return 'caught';
    }

    this.lastStatus = 'ok';
    return 'ok';
  }
}

module.exports = { FishAI };

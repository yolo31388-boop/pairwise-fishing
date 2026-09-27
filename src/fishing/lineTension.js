// 鱼线张力：由收线动作与鱼的挣扎实时合成。
// 超过鱼线强度上限 -> break（断线）；低于最小值 -> loose（脱钩）。

class LineTension {
  constructor(maxStrength = 50, minStrength = 0) {
    this.maxStrength = maxStrength;
    this.minStrength = minStrength;
    this.current = 0;
  }

  reset() {
    this.current = 0;
    return this.current;
  }

  // 张力 = 收线施加的张力 + 鱼挣扎的张力，鱼不挣扎且不收线时张力归零
  update(dt = 1, reelSpeed = 0, fishStruggle = 0) {
    if (!Number.isFinite(dt) || dt <= 0) dt = 1;
    const reelPull = Math.max(0, reelSpeed) * 2;
    // 鱼反向松线（负挣扎）会把张力拉到下限以下；正常挣扎只做正向贡献
    const target = (fishStruggle < 0 ? fishStruggle : Math.max(0, fishStruggle)) + reelPull;
    // 平滑趋近，保证张力实时变化而不是瞬时跳变
    const factor = Math.min(1, 4 * dt);
    this.current += (target - this.current) * factor;

    if (this.current > this.maxStrength) return 'break';
    if (this.current < this.minStrength) return 'loose';
    return 'ok';
  }
}

module.exports = { LineTension };

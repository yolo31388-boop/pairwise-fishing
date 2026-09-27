
const { Fish } = require('../src/fishing/fish.js');
const { LineTension } = require('../src/fishing/lineTension.js');
const { FishAI } = require('../src/fishing/fishAI.js');

describe('钓鱼鱼AI', () => {
  test('鱼体力消耗', () => {
    const fish = new Fish('carp');
    fish.update(1, 10);
    expect(fish.stamina).toBeLessThan(100);
  });
  test('挣扎力度基于体力', () => {
    const fish = new Fish('carp');
    const s1 = fish.update(0, 10).struggle;
    fish.stamina = 10;
    const s2 = fish.update(0, 10).struggle;
    expect(s2).toBeLessThan(s1);
  });
  test('放线体力恢复', () => {
    const fish = new Fish('carp');
    fish.stamina = 50;
    fish.mood = 'tense';
    fish.recover(1);
    expect(fish.stamina).toBeGreaterThan(50);
  });
  test('张力上限断线', () => {
    const lt = new LineTension(10);
    expect(lt.update(0, 0, 20)).toBe('break');
  });
  test('张力下限脱钩', () => {
    const lt = new LineTension(50);
    expect(lt.update(0, 0, -5)).toBe('loose');
  });
  test('收线速度受限', () => {
    const ai = new FishAI(new Fish('carp'));
    ai.tension.current = 45;
    ai.reelIn(5);
    expect(ai.distance).toBeGreaterThan(5);
  });
  test('鱼移动方向状态', () => {
    const fish = new Fish('carp');
    fish.mood = 'frenzied';
    const r = fish.update(0, 10);
    expect(r.direction).toBeDefined();
  });
  test('不同鱼种属性', () => {
    const carp = new Fish('carp');
    const shark = new Fish('shark');
    expect(shark.size).toBeGreaterThan(carp.size);
  });
  test('脱钩概率', () => {
    const ai = new FishAI(new Fish('carp'));
    ai.tension.current = 1;
    expect(ai.checkHook()).toBeDefined();
  });
  test('钓鱼进度距离', () => {
    const ai = new FishAI(new Fish('carp'));
    ai.distance = 1;
    ai.reelIn(2);
    expect(ai.caught).toBe(true);
  });
  test('环境因素影响', () => {
    const fish = new Fish('carp');
    expect(fish.getBiteProbability({time:'dawn', water:'deep'})).toBeDefined();
  });
  test('体力为零后易钓起', () => {
    const ai = new FishAI(new Fish('carp'));
    ai.fish.stamina = 0;
    ai.reelIn(1);
    expect(ai.distance).toBeLessThan(9);
  });
});

describe('钓鱼鱼AI 不变量恢复', () => {
  test('收线持续消耗体力且耗尽后钳制为零', () => {
    const fish = new Fish('carp');
    fish.onHook();
    let prev = fish.stamina;
    for (let i = 0; i < 40; i++) {
      fish.update(1, 10);
      expect(fish.stamina).toBeLessThanOrEqual(prev);
      prev = fish.stamina;
    }
    expect(fish.stamina).toBe(0);
    fish.update(1, 10);
    expect(fish.stamina).toBe(0);
  });

  test('挣扎力度随剩余体力单调变化，零体力不挣扎', () => {
    const fish = new Fish('catfish');
    fish.onHook();
    fish.mood = 'tense';
    fish.stamina = fish.maxStamina;
    const full = fish.update(1, 0).struggle;
    fish.stamina = fish.maxStamina * 0.3;
    const low = fish.update(1, 0).struggle;
    fish.stamina = 0;
    const none = fish.update(1, 0).struggle;
    expect(low).toBeLessThan(full);
    expect(none).toBe(0);
  });

  test('放线时体力缓慢恢复但情绪保持紧张', () => {
    const fish = new Fish('bass');
    fish.onHook();
    fish.stamina = 40;
    fish.mood = 'tense';
    fish.recover(1);
    expect(fish.stamina).toBeGreaterThan(40);
    expect(fish.mood).not.toBe('calm');
    for (let i = 0; i < 100; i++) fish.recover(1);
    expect(fish.stamina).toBeLessThanOrEqual(fish.maxStamina);
    expect(fish.mood).not.toBe('calm');
  });

  test('张力超过鱼线强度上限必然断线', () => {
    const ai = new FishAI(new Fish('catfish'), 20);
    let status = 'ok';
    for (let i = 0; i < 6 && status === 'ok'; i++) status = ai.reelIn(8);
    expect(ai.broken).toBe(true);
    expect(status).toBe('break');
  });

  test('张力低于最小值时脱钩', () => {
    const ai = new FishAI(new Fish('carp'), 50, 5);
    ai.tension.current = 8;
    ai.fish.stamina = 0;
    ai.update(0.1);
    expect(ai.update(0.1)).toBe('loose');
    expect(ai.escaped).toBe(true);
  });

  test('收线速度随张力升高而受限', () => {
    const loose = new FishAI(new Fish('carp'), 50);
    loose.tension.current = 0;
    expect(loose._effectiveReelSpeed(10)).toBeCloseTo(10);
    const tight = new FishAI(new Fish('carp'), 50);
    tight.tension.current = 45;
    expect(tight._effectiveReelSpeed(10)).toBeLessThan(2);
  });

  test('张力过高时自动放线而不是硬收', () => {
    const ai = new FishAI(new Fish('carp'), 12);
    ai.reelIn(10);
    ai.reelIn(10);
    const distanceBefore = ai.distance;
    ai.tension.current = 11;
    ai.reelIn(10);
    expect(ai.autoReleased).toBe(true);
    expect(ai.distance).toBeGreaterThan(distanceBefore);
    expect(ai.broken).toBe(false);
  });

  test('移动方向由状态决定而非随机', () => {
    const fish = new Fish('bass');
    fish.onHook();
    fish.stamina = fish.maxStamina;
    expect(fish.update(1, 0).direction).toBe('away');
    fish.stamina = fish.maxStamina * 0.4;
    expect(fish.update(1, 0).direction).toBe('dive');
    fish.stamina = 0;
    expect(fish.update(1, 0).direction).toBe('toward');
    const again = fish.update(1, 0).direction;
    expect(again).toBe('toward');
  });

  test('不同鱼种基础体力、力量、大小、挣扎模式均不同', () => {
    const carp = new Fish('carp');
    const bass = new Fish('bass');
    const shark = new Fish('shark');
    expect(shark.maxStamina).toBeGreaterThan(bass.maxStamina);
    expect(bass.maxStamina).toBeGreaterThan(carp.maxStamina);
    expect(shark.baseStrength).toBeGreaterThan(carp.baseStrength);
    expect(bass.pattern).not.toBe(carp.pattern);
  });

  test('脱钩概率随挣扎力度和收线角度变化', () => {
    const ai = new FishAI(new Fish('carp'), 50);
    ai.fish.stamina = 0;
    ai.fish.update(1, 0);
    expect(ai.hookEscapeProbability(1)).toBe(0);
    const strong = new FishAI(new Fish('catfish'), 50);
    strong.fish.onHook();
    strong.fish.mood = 'frenzied';
    strong.fish.stamina = strong.fish.maxStamina;
    strong.fish.update(1, 0);
    expect(strong.hookEscapeProbability(1)).toBeGreaterThan(strong.hookEscapeProbability(0));
    expect(strong.hookEscapeProbability(1)).toBeGreaterThan(0.4);
  });

  test('疲劳鱼收线过程永不脱钩', () => {
    const ai = new FishAI(new Fish('bass'), 50);
    ai.fish.stamina = 0;
    for (let i = 0; i < 30 && !ai.caught; i++) ai.reelIn(2);
    expect(ai.escaped).toBe(false);
  });

  test('钓鱼进度完全基于距离，距离为零才钓起', () => {
    const ai = new FishAI(new Fish('carp'), 50);
    ai.fish.stamina = 0;
    ai.distance = 3;
    ai.reelIn(1);
    expect(ai.caught).toBe(false);
    expect(ai.distance).toBeGreaterThan(0);
    ai.distance = 0;
    ai.fish.stamina = 0;
    ai.caught = false;
    expect(ai.reelIn(1)).toBe('caught');
  });

  test('环境因素改变上钩概率和挣扎强度', () => {
    const good = new Fish('carp');
    const bad = new Fish('carp');
    expect(good.getBiteProbability({ time: 'dawn', depth: 2, current: 0 }))
      .toBeGreaterThan(bad.getBiteProbability({ time: 'night', depth: 40, current: 1 }));
    const calm = new Fish('bass');
    calm.onHook(); calm.mood = 'tense'; calm.setEnvironment({ depth: 0, current: 0 });
    const rough = new Fish('bass');
    rough.onHook(); rough.mood = 'tense'; rough.setEnvironment({ depth: 30, current: 1 });
    calm.stamina = calm.maxStamina;
    rough.stamina = rough.maxStamina;
    expect(rough.update(1, 0).struggle).toBeGreaterThan(calm.update(1, 0).struggle);
  });

  test('体力耗尽后鱼可被稳定收线钓起且不断线', () => {
    const ai = new FishAI(new Fish('catfish'), 30);
    ai.fish.stamina = 0;
    let status = 'ok';
    for (let i = 0; i < 40 && status === 'ok'; i++) status = ai.reelIn(2);
    expect(status).toBe('caught');
    expect(ai.caught).toBe(true);
    expect(ai.broken).toBe(false);
    expect(ai.escaped).toBe(false);
  });
});

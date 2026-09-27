
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

describe('钓鱼引擎不变量', () => {
  test('收线时体力持续消耗', () => {
    const ai = new FishAI(new Fish('carp'));
    const s0 = ai.fish.stamina;
    ai.reelIn(1);
    const s1 = ai.fish.stamina;
    ai.reelIn(1);
    const s2 = ai.fish.stamina;
    expect(s1).toBeLessThan(s0);
    expect(s2).toBeLessThan(s1);
  });
  test('挣扎力度随体力单调下降', () => {
    const fish = new Fish('carp');
    fish.mood = 'tense';
    fish.stamina = 80;
    const s80 = fish.update(0, 10).struggle;
    fish.stamina = 40;
    const s40 = fish.update(0, 10).struggle;
    fish.stamina = 10;
    const s10 = fish.update(0, 10).struggle;
    expect(s40).toBeLessThan(s80);
    expect(s10).toBeLessThan(s40);
  });
  test('情绪状态影响挣扎力度', () => {
    const mk = (tension) => {
      const fish = new Fish('carp');
      fish.update(0, tension);
      return fish.update(0, tension).struggle;
    };
    const calm = mk(0);
    const tense = mk(10);
    const frenzied = mk(40);
    expect(tense).toBeGreaterThan(calm);
    expect(frenzied).toBeGreaterThan(tense);
  });
  test('放线恢复体力但情绪保持紧张', () => {
    const ai = new FishAI(new Fish('carp'));
    ai.fish.stamina = 40;
    ai.fish.mood = 'calm';
    ai.tension.current = 20;
    ai.letOut(1);
    expect(ai.fish.stamina).toBeGreaterThan(40);
    expect(ai.fish.mood).not.toBe('calm');
  });
  test('张力超过上限断线', () => {
    const ai = new FishAI(new Fish('carp'));
    ai.reelIn(100);
    expect(ai.lineBroken).toBe(true);
    expect(ai.caught).toBe(false);
    expect(ai.hooked).toBe(false);
  });
  test('张力低于下限脱钩', () => {
    const ai = new FishAI(new Fish('carp'));
    ai.tension.current = 0.4;
    ai.letOut(1);
    expect(ai.escaped).toBe(true);
    expect(ai.hooked).toBe(false);
  });
  test('高张力下收线自动放线', () => {
    const ai = new FishAI(new Fish('carp'));
    ai.tension.current = 45;
    const before = ai.distance;
    ai.reelIn(5);
    expect(ai.distance).toBeGreaterThan(before);
    expect(ai.lineBroken).toBe(false);
  });
  test('收线速度受张力限制', () => {
    const low = new FishAI(new Fish('carp'));
    low.tension.current = 0;
    low.reelIn(3);
    const high = new FishAI(new Fish('carp'));
    high.tension.current = 20;
    high.reelIn(3);
    expect(10 - high.distance).toBeLessThan(10 - low.distance);
  });
  test('鱼移动方向由状态决定', () => {
    const fleeing = new Fish('carp');
    expect(fleeing.update(0, 40).direction).toBe('away');
    const struggling = new Fish('carp');
    expect(struggling.update(0, 10).direction).toBe('sideways');
    const tired = new Fish('carp');
    tired.stamina = 5;
    expect(tired.update(0, 10).direction).toBe('toward');
  });
  test('不同鱼种基础属性不同', () => {
    const carp = new Fish('carp');
    const shark = new Fish('shark');
    expect(shark.maxStamina).toBeGreaterThan(carp.maxStamina);
    expect(shark.strength).toBeGreaterThan(carp.strength);
    expect(shark.pattern).not.toBe(carp.pattern);
    shark.mood = carp.mood = 'tense';
    expect(shark.struggleForce()).toBeGreaterThan(carp.struggleForce());
  });
  test('脱钩概率随挣扎和角度变化', () => {
    const fresh = new FishAI(new Fish('carp'));
    fresh.tension.current = 20;
    const tired = new FishAI(new Fish('carp'));
    tired.fish.stamina = 0;
    tired.tension.current = 20;
    expect(fresh.checkHook()).toBeGreaterThan(tired.checkHook());
    const angled = new FishAI(new Fish('carp'));
    angled.tension.current = 20;
    angled.reelAngle = 90;
    const straight = new FishAI(new Fish('carp'));
    straight.tension.current = 20;
    straight.reelAngle = 45;
    expect(angled.checkHook()).toBeGreaterThan(straight.checkHook());
  });
  test('钓鱼进度基于距离', () => {
    const ai = new FishAI(new Fish('carp'));
    ai.distance = 3;
    ai.reelIn(10);
    expect(ai.distance).toBe(0);
    expect(ai.caught).toBe(true);
    expect(ai.progress).toBe(1);
  });
  test('环境影响上钩概率与挣扎', () => {
    const fish = new Fish('carp');
    const dawn = fish.getBiteProbability({ time: 'dawn', water: 'deep' });
    const noon = fish.getBiteProbability({ time: 'noon', water: 'shallow' });
    expect(dawn).toBeGreaterThan(noon);
    const calm = new FishAI(new Fish('carp'), {});
    calm.update(1);
    const rough = new FishAI(new Fish('carp'), { current: 'strong', water: 'deep' });
    rough.update(1);
    expect(rough.tension.current).toBeGreaterThan(calm.tension.current);
  });
  test('体力耗尽后更容易钓起', () => {
    const fresh = new FishAI(new Fish('carp'));
    fresh.reelIn(1);
    const tired = new FishAI(new Fish('carp'));
    tired.fish.stamina = 0;
    tired.reelIn(1);
    expect(10 - tired.distance).toBeGreaterThan(10 - fresh.distance);
  });
  test('抛竿用上钩概率判定', () => {
    const ai = new FishAI(new Fish('carp'));
    expect(ai.castLine({ time: 'dawn', water: 'deep' }, 0)).toBe(true);
    expect(ai.castLine({ time: 'noon', water: 'shallow' }, 0.99)).toBe(false);
  });
});

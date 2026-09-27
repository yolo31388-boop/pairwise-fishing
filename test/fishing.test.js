
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

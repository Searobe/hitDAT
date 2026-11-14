import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EX, levelFor, legsPlan, pumpPlan, buildSteps, estimateMinutes, stepSeconds, legsDone, doneOn, describe,
  REST_SET, REST_SIDE,
} from '../legs.js';
import { FIG, figureSvg } from '../figures.js';

test('mức theo số buổi chân đã tập: 6 buổi lên một mức, tối đa mức 3', () => {
  assert.equal(levelFor(0), 1);
  assert.equal(levelFor(5), 1);
  assert.equal(levelFor(6), 2);
  assert.equal(levelFor(11), 2);
  assert.equal(levelFor(12), 3);
  assert.equal(levelFor(99), 3);
});

test('mức 1: 2 hiệp × 10; mức 2: 3 hiệp × 12; mức 3: biến thể một chân', () => {
  const by = (lv) => Object.fromEntries(legsPlan(lv).map((i) => [i.ex, i]));
  assert.deepEqual([by(1).bridge.sets, by(1).bridge.n], [2, 10]);
  assert.deepEqual([by(1).squat.sets, by(1).squat.n], [2, 10]);
  assert.deepEqual([by(2).bridge.sets, by(2).bridge.n], [3, 12]);
  assert.deepEqual([by(2).clam.sets, by(2).clam.n], [3, 12]);
  assert.ok(by(3).calf1 && by(3).bridge1 && by(3).split);
});

test('mọi động tác trong kế hoạch đều có mô tả và hình', () => {
  for (const lv of [1, 2, 3]) {
    for (const item of [...legsPlan(lv), ...pumpPlan()]) {
      const ex = EX[item.ex];
      assert.ok(ex, item.ex);
      assert.ok(ex.how.length >= 2 && ex.avoid);
      assert.ok(FIG[item.ex], `thiếu hình ${item.ex}`);
      assert.match(figureSvg(item.ex), /^<svg[\s\S]*<animate[\s\S]*<\/svg>$/);
    }
  }
});

test('chuỗi bước: động tác hai bên làm phải rồi trái, có đổi bên và nghỉ giữa hiệp', () => {
  const steps = buildSteps([{ ex: 'clam', sets: 2, n: 10 }]);
  assert.deepEqual(steps.map((s) => s.type + (s.side || '')), ['intro', 'work1', 'rest', 'work2', 'rest', 'work1', 'rest', 'work2']);
  assert.deepEqual(steps.filter((s) => s.type === 'rest').map((s) => s.sec), [REST_SIDE, REST_SET, REST_SIDE]);
});

test('chuỗi bước: không nghỉ sau hiệp cuối của động tác', () => {
  const steps = buildSteps([{ ex: 'calf', sets: 2, n: 15 }, { ex: 'ankle', sets: 1, n: 20 }]);
  assert.deepEqual(steps.map((s) => s.type), ['intro', 'work', 'rest', 'work', 'intro', 'work']);
});

test('thời lượng: giữ tính theo giây, đếm lượt tính theo nhịp', () => {
  assert.equal(stepSeconds({ type: 'work', ex: 'fig4', n: 30 }), 30);
  assert.equal(stepSeconds({ type: 'work', ex: 'bridge', n: 10 }), 30);
  assert.equal(stepSeconds({ type: 'rest', sec: 5 }), 5);
});

test('thời lượng ước tính: buổi chân 8–16 phút, bài bơm máu khoảng 2 phút', () => {
  for (const lv of [1, 2, 3]) {
    const m = estimateMinutes(buildSteps(legsPlan(lv)));
    assert.ok(m >= 8 && m <= 16, `mức ${lv}: ${m} phút`);
  }
  const p = estimateMinutes(buildSteps(pumpPlan(), 10));
  assert.ok(p >= 1 && p <= 3, `bơm máu: ${p} phút`);
});

test('đếm buổi chân và kiểm đã tập trong ngày', () => {
  const h = [{ type: 'legs', date: '2026-11-14' }, { type: 'pump', date: '2026-11-15' }, { type: 'session', date: '2026-11-15' }];
  assert.equal(legsDone(h), 1);
  assert.equal(doneOn(h, 'pump', '2026-11-15'), true);
  assert.equal(doneOn(h, 'legs', '2026-11-15'), false);
});

test('mô tả liều tập', () => {
  assert.equal(describe({ ex: 'clam', sets: 2, n: 10 }), '2 × 10 lượt mỗi bên');
  assert.equal(describe({ ex: 'fig4', sets: 1, n: 30 }), '30 giây mỗi bên');
  assert.equal(describe({ ex: 'ankle', sets: 1, n: 20 }), '20 lượt');
});

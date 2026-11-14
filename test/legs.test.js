import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EX, legsLevel, legsPlan, pumpPlan, buildSteps, estimateMinutes, stepSeconds, legsDone, doneOn, describe,
  REST_SET, REST_SIDE,
} from '../legs.js';
import { FIG, figureSvg } from '../figures.js';

const L = (...feels) => feels.map((feel) => ({ type: 'legs', feel: feel || undefined }));

test('mức chân: buổi «vừa» hoặc chưa trả lời +1 điểm, đủ 6 điểm lên một mức, tối đa mức 3', () => {
  assert.deepEqual(legsLevel([]), { level: 1, points: 0, toNext: 6 });
  assert.equal(legsLevel(L('ok', '', 'ok', 'ok', 'ok')).level, 1);
  assert.deepEqual(legsLevel(L('ok', 'ok', 'ok', 'ok', 'ok', 'ok')), { level: 2, points: 6, toNext: 6 });
  assert.equal(legsLevel(L(...Array(12).fill('ok'))).level, 3);
  assert.deepEqual(legsLevel(L(...Array(40).fill('ok'))), { level: 3, points: 12, toNext: 0 });
});

test('mức chân: «nhẹ» +2 điểm nên 3 buổi là lên mức', () => {
  assert.equal(legsLevel(L('easy', 'easy')).level, 1);
  assert.equal(legsLevel(L('easy', 'easy', 'easy')).level, 2);
});

test('mức chân: «nặng» không cộng điểm; hai buổi nặng liền thì lùi về đầu mức dưới', () => {
  assert.equal(legsLevel(L('ok', 'ok', 'hard')).points, 2);
  const lv2 = L(...Array(8).fill('ok')); // mức 2, 8 điểm
  assert.deepEqual(legsLevel([...lv2, ...L('hard')]), { level: 2, points: 8, toNext: 4 });
  assert.deepEqual(legsLevel([...lv2, ...L('hard', 'hard')]), { level: 1, points: 0, toNext: 6 });
  // nặng – vừa – nặng không tính là liền nhau
  assert.equal(legsLevel([...lv2, ...L('hard', 'ok', 'hard')]).level, 2);
  // đang ở mức 1 thì không lùi thêm
  assert.deepEqual(legsLevel(L('ok', 'hard', 'hard')), { level: 1, points: 0, toNext: 6 });
});

test('mức chân: bài bơm máu và buổi hít đất không tính điểm', () => {
  assert.equal(legsLevel([{ type: 'pump' }, { type: 'session' }, { type: 'test' }]).points, 0);
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

test('mỗi động tác có tên nhóm cơ và hình tô đúng các mức cơ đó', () => {
  for (const id of Object.keys(FIG)) {
    const levels = new Set(EX[id].muscles.map((m) => m[0]));
    assert.ok(levels.size >= 1, id);
    const svg = figureSvg(id);
    for (const lvl of levels) assert.ok(svg.includes(`class="mus ${lvl}"`), `${id} thiếu vùng cơ ${lvl} trên hình`);
    for (const m of FIG[id].m) assert.ok(levels.has(m.lvl), `${id}: hình tô ${m.lvl} nhưng không có tên`);
  }
});

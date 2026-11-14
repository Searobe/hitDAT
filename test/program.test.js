import test from 'node:test';
import assert from 'node:assert/strict';
import {
  planSession, restFor, addDays, initialState, applyTest, applySession,
  upcoming, makeRepDetector, chooseCalibration, GOAL,
} from '../program.js';

test('kế hoạch buổi: 5 hiệp, người hít được 10 cái', () => {
  assert.deepEqual(planSession(10, 0).sets, [6, 8, 5, 5, 6]);
  assert.deepEqual(planSession(10, 2).sets, [8, 10, 7, 7, 8]);
});

test('kế hoạch buổi: không hiệp nào bằng 0, không hiệp nào vượt mức tối đa', () => {
  for (let T = 3; T <= 120; T++) {
    for (let d = 0; d < 3; d++) {
      const { sets } = planSession(T, d);
      assert.equal(sets.length, 5);
      for (const n of sets) {
        assert.ok(n >= 1, `T=${T} d=${d}`);
        assert.ok(n <= T, `T=${T} d=${d} hiệp ${n} vượt mức tối đa`);
      }
    }
  }
});

test('buổi sau trong tuần không nhẹ hơn buổi trước', () => {
  for (let T = 3; T <= 120; T++) {
    const tot = [0, 1, 2].map((d) => planSession(T, d).sets.reduce((a, b) => a + b));
    assert.ok(tot[0] <= tot[1] && tot[1] <= tot[2], `T=${T}`);
  }
});

test('thời gian nghỉ theo độ dài hiệp', () => {
  assert.equal(restFor(10), 60);
  assert.equal(restFor(25), 90);
  assert.equal(restFor(50), 120);
});

test('cộng ngày qua tháng, qua năm', () => {
  assert.equal(addDays('2026-11-30', 2), '2026-12-02');
  assert.equal(addDays('2026-12-31', 2), '2027-01-02');
});

test('bài thử đầu: xếp mức và hẹn nghỉ 1 ngày', () => {
  const s = applyTest(initialState(), 12, '2026-11-14');
  assert.equal(s.T, 12);
  assert.equal(s.pending, 'session');
  assert.equal(s.nextDate, '2026-11-16');
  assert.equal(s.achieved, false);
});

test('bài thử dưới 3 cái vẫn có kế hoạch tập', () => {
  const s = applyTest(initialState(), 0, '2026-11-14');
  assert.equal(s.T, 3);
  assert.deepEqual(planSession(s.T, 0).sets, [2, 3, 2, 2, 2]);
});

function runWeek(s, date, how) {
  for (let d = 0; d < 3; d++) {
    const plan = planSession(s.T, s.day).sets;
    s = applySession(s, how(plan, d), date);
    date = s.nextDate;
  }
  return s;
}

test('đạt tuần thì tăng 12%, sau 2 tuần thì thử lại', () => {
  let s = applyTest(initialState(), 20, '2026-11-14');
  s = runWeek(s, s.nextDate, (p) => p);
  assert.equal(s.T, 22);
  assert.equal(s.week, 2);
  assert.equal(s.pending, 'session');
  s = runWeek(s, s.nextDate, (p) => p);
  assert.equal(s.T, 25);
  assert.equal(s.pending, 'test');
});

test('hiệp cuối buổi nặng vượt 1,5 lần thì tăng 20%', () => {
  let s = applyTest(initialState(), 20, '2026-11-14');
  s = runWeek(s, s.nextDate, (p) => [p[0], p[1], p[2], p[3], p[4] * 2]);
  assert.equal(s.T, 24);
});

test('hụt tuần thì giữ mức, hụt hai tuần liền thì lùi 10%', () => {
  let s = applyTest(initialState(), 20, '2026-11-14');
  const fail = (p) => [p[0], p[1] - 1, p[2], p[3], 0];
  s = runWeek(s, s.nextDate, fail);
  assert.equal(s.T, 20);
  s = runWeek(s, s.nextDate, fail);
  assert.equal(s.T, 18);
});

test('đạt 2 trong 3 buổi vẫn tính đạt tuần', () => {
  let s = applyTest(initialState(), 20, '2026-11-14');
  s = runWeek(s, s.nextDate, (p, d) => (d === 0 ? p.map(() => 1) : p));
  assert.equal(s.T, 22);
});

test('thử lại xếp mức theo đúng kết quả; đủ 100 thì hoàn thành', () => {
  let s = applyTest(initialState(), 20, '2026-11-14');
  s = applyTest(s, 35, '2026-11-30');
  assert.equal(s.T, 35);
  assert.equal(s.achieved, false);
  s = applyTest(s, GOAL, '2026-12-14');
  assert.equal(s.achieved, true);
});

test('lịch sắp tới: còn lại của tuần, kèm bài thử khi tới hạn', () => {
  let s = applyTest(initialState(), 20, '2026-11-14');
  let u = upcoming(s);
  assert.deepEqual(u.map((x) => x.type), ['session', 'session', 'session']);
  assert.deepEqual(u.map((x) => x.date), ['2026-11-16', '2026-11-18', '2026-11-20']);
  s = runWeek(s, s.nextDate, (p) => p);
  u = upcoming(s);
  assert.deepEqual(u.map((x) => x.type), ['session', 'session', 'session', 'test']);
  s = runWeek(s, s.nextDate, (p) => p);
  assert.deepEqual(upcoming(s).map((x) => x.type), ['test']);
});

test('lịch sử ghi đủ kế hoạch, số thật, tổng', () => {
  let s = applyTest(initialState(), 10, '2026-11-14');
  s = applySession(s, [6, 8, 5, 5, 9], '2026-11-16');
  const h = s.history.at(-1);
  assert.deepEqual(h.plan, [6, 8, 5, 5, 6]);
  assert.equal(h.total, 33);
  assert.equal(h.passed, true);
});

test('bộ đếm camera: mỗi lần hạ đếm đúng một lượt, không đếm trùng khi nhiễu', () => {
  const det = makeRepDetector();
  const signal = [1, 0.9, 0.5, 0.3, 0.35, 0.2, 0.5, 0.6, 0.8, 1, 0.3, 0.45, 0.38, 0.9, 1];
  const count = signal.filter((x) => det.feed(x)).length;
  assert.equal(count, 2);
});

test('hiệu chỉnh: chọn đặc trưng tách rõ nhất, từ chối khi hai tư thế giống nhau', () => {
  const c = chooseCalibration({ luma: 180, sd: 40 }, { luma: 60, sd: 30 });
  assert.equal(c.feature, 'luma');
  assert.equal(chooseCalibration({ luma: 120, sd: 40 }, { luma: 110, sd: 38 }), null);
  const c2 = chooseCalibration({ luma: 120, sd: 50 }, { luma: 115, sd: 10 });
  assert.equal(c2.feature, 'sd');
});

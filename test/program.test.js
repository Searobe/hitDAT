import test from 'node:test';
import assert from 'node:assert/strict';
import {
  planSession, restFor, addDays, initialState, applyTest, applySession,
  upcoming, makeRepDetector, chooseCalibration, GOAL, applyLower, canLower,
  sessionPassed, lastSetMode, RESERVE_REPS, comeback, LONG_BREAK_DAYS,
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

test('cài đặt mặc định: màn hướng dẫn động tác chân đợi bấm «Bắt đầu» (không tự vào tập)', () => {
  assert.equal(initialState().settings.legsAuto, false);
});

test('tự giảm mức tập: hạ 10%, ít nhất 1 cái, không dưới mức thấp nhất, ghi lịch sử', () => {
  let s = applyTest(initialState(), 40, '2026-11-20');
  const before = structuredClone(s);
  s = applyLower(s, '2026-11-21');
  assert.equal(s.T, 36);
  assert.deepEqual(s.history.at(-1), { type: 'adjust', date: '2026-11-21', from: 40, to: 36 });
  // không đụng lịch tuần
  assert.equal(s.day, before.day);
  assert.equal(s.nextDate, before.nextDate);
  assert.equal(s.pending, 'session');
  // trạng thái gốc giữ nguyên (hàm thuần)
  assert.equal(before.T, 40);
  // mức nhỏ: vẫn hạ ít nhất 1
  assert.equal(applyLower(applyTest(initialState(), 5, '2026-11-20'), '2026-11-21').T, 4);
  // tới mức thấp nhất thì không hạ nữa, không ghi lịch sử
  const floor = applyTest(initialState(), 3, '2026-11-20');
  assert.equal(canLower(floor), false);
  assert.equal(applyLower(floor, '2026-11-21'), floor);
  // bài thử sau đó vẫn xếp lại theo kết quả thật
  assert.equal(applyTest(s, 38, '2026-11-25').T, 38);
});

// ---- Mốc 3: nghỉ dài quay lại, hiệp cuối chừa sức ----

test('hiệp cuối: buổi nhẹ và buổi vừa chừa 1–2 cái, buổi nặng hít hết sức', () => {
  assert.equal(lastSetMode(0), 'reserve');
  assert.equal(lastSetMode(1), 'reserve');
  assert.equal(lastSetMode(2), 'max');
  assert.deepEqual(RESERVE_REPS, [1, 2]);
});

test('hiệp cuối chừa sức không đổi luật: đúng mức tối thiểu vẫn đạt buổi, tuần vẫn tăng 12%', () => {
  let s = applyTest(initialState(), 20, '2026-11-01');
  for (let d = 0; d < 3; d++) {
    const plan = planSession(s.T, s.day).sets;
    assert.equal(sessionPassed(plan, plan), true);
    s = applySession(s, plan, s.nextDate);
    assert.equal(s.history.at(-1).passed, true);
  }
  assert.equal(s.T, 22); // 20 × 1,12 = 22,4 → 22
});

test('luật lên mức không đổi: nhảy 20% chỉ xét hiệp cuối buổi nặng', () => {
  const run3 = (extra) => {
    let s = applyTest(initialState(), 20, '2026-11-01');
    for (let d = 0; d < 3; d++) {
      const plan = planSession(s.T, s.day).sets;
      const done = [...plan];
      done[4] = Math.ceil(plan[4] * extra[d]);
      s = applySession(s, done, s.nextDate);
    }
    return s.T;
  };
  assert.equal(run3([2, 2, 1]), 22); // hít dư ở buổi nhẹ, buổi vừa: không nhảy 20%
  assert.equal(run3([1, 1, 1.5]), 24); // buổi nặng vượt 1,5 lần: 20 × 1,2
  assert.equal(run3([1, 1, 1.4]), 22);
});

test('luật lên mức không đổi: hụt tuần giữ mức, hụt hai tuần liền lùi 10%', () => {
  let s = applyTest(initialState(), 20, '2026-11-01');
  for (let d = 0; d < 3; d++) s = applySession(s, [0, 0, 0, 0, 0], s.nextDate);
  assert.equal(s.T, 20);
  s.pending = 'session';
  for (let d = 0; d < 3; d++) s = applySession(s, [0, 0, 0, 0, 0], s.nextDate);
  assert.equal(s.T, 18);
});

test('nghỉ dài: trễ dưới 7 ngày không gợi ý, từ 7 ngày thì gợi ý hạ 10%', () => {
  const s = applyTest(initialState(), 40, '2026-11-01'); // ngày nên tập: 03/11
  assert.equal(LONG_BREAK_DAYS, 7);
  assert.equal(comeback(s, '2026-11-03'), null);
  assert.equal(comeback(s, '2026-11-09'), null); // trễ 6 ngày
  assert.deepEqual(comeback(s, '2026-11-10'), { days: 7, lowerTo: 36 });
  assert.deepEqual(comeback(s, '2026-12-03'), { days: 30, lowerTo: 36 });
  assert.equal(comeback(s, '2026-11-02'), null); // chưa tới ngày
});

test('nghỉ dài: chỉ gợi ý, không tự đổi gì', () => {
  const s = applyTest(initialState(), 40, '2026-11-01');
  const before = JSON.stringify(s);
  comeback(s, '2026-12-25');
  assert.equal(JSON.stringify(s), before);
});

test('nghỉ dài: không gợi ý khi chưa thử lần nào hoặc buổi kế là bài thử', () => {
  assert.equal(comeback(initialState(), '2026-12-01'), null);
  const s = applyTest(initialState(), 40, '2026-11-01');
  s.pending = 'test';
  assert.equal(comeback(s, '2026-12-01'), null);
});

test('nghỉ dài: đã hạ mức trong đợt trễ thì thôi gợi ý; hạ mức từ trước đó thì vẫn gợi ý', () => {
  const s = applyTest(initialState(), 40, '2026-11-01');
  const lowered = applyLower(s, '2026-11-20');
  assert.equal(lowered.T, 36);
  assert.equal(comeback(lowered, '2026-11-20'), null);
  assert.equal(comeback(lowered, '2026-11-25'), null);
  const early = applyLower(s, '2026-11-02'); // hạ trước ngày nên tập
  assert.deepEqual(comeback(early, '2026-11-20'), { days: 17, lowerTo: 32 });
  // tập xong một buổi thì ngày nên tập dời đi, hết trễ
  const done = applySession(lowered, planSession(36, 0).sets, '2026-11-20');
  assert.equal(comeback(done, '2026-11-22'), null);
});

test('nghỉ dài: đang ở mức thấp nhất thì không còn lựa chọn hạ mức', () => {
  const s = applyTest(initialState(), 3, '2026-11-01');
  assert.deepEqual(comeback(s, '2026-11-20'), { days: 17, lowerTo: null });
});

test('nghỉ dài: bài thử lại xếp mức theo kết quả thật và hết trễ', () => {
  const s = applyTest(initialState(), 40, '2026-11-01');
  const again = applyTest(s, 31, '2026-11-20');
  assert.equal(again.T, 31);
  assert.equal(comeback(again, '2026-11-22'), null);
  assert.equal(again.history.length, 2); // lịch sử cũ còn nguyên
});

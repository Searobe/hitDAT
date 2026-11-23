import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, applyTest, applySession, planSession } from '../program.js';
import { todayPlan, legsResume, legsSteps } from '../today.js';
import { historyGroups } from '../progress.js';

const trained = () => applyTest(initialState(), 20, '2026-11-01'); // buổi kế: 03/11

test('việc chính: chưa thử lần nào thì là bài thử đầu tiên', () => {
  assert.equal(todayPlan(initialState(), '2026-11-01').main, 'first');
});

test('việc chính: tới ngày hít đất thì là buổi hít đất', () => {
  const s = trained();
  const p = todayPlan(s, s.nextDate);
  assert.equal(p.main, 'push');
  assert.equal(p.early, false);
  assert.equal(p.next.type, 'session');
  assert.equal(todayPlan(s, '2026-12-01').main, 'push'); // trễ lịch vẫn là buổi hít đất
});

test('việc chính: ngày nghỉ hít đất, chưa tập chân thì là buổi chân', () => {
  const s = trained();
  const p = todayPlan(s, '2026-11-02');
  assert.equal(p.early, true);
  assert.equal(p.main, 'legs');
});

test('việc chính: vừa tập hít đất hôm nay thì không đẩy thêm buổi chân', () => {
  const s = trained();
  const p = todayPlan(s, '2026-11-01');
  assert.equal(p.pushToday, true);
  assert.equal(p.main, 'rest');
});

test('việc chính: ngày nghỉ đã tập chân thì hết việc chính', () => {
  const s = trained();
  s.history.push({ type: 'legs', date: '2026-11-02', level: 1, minutes: 12, skipped: 0 });
  assert.equal(todayPlan(s, '2026-11-02').main, 'rest');
});

test('việc chính: buổi hít đất đang dở đứng trước mọi việc khác', () => {
  const s = trained();
  s.active = { kind: 'push', date: s.nextDate, T: s.T, day: s.day, done: [10, 9] };
  const p = todayPlan(s, s.nextDate);
  assert.equal(p.main, 'push-resume');
  assert.deepEqual(p.pushActive.done, [10, 9]);
  assert.equal(p.lowerTo, null); // đang dở thì không mời giảm mức
  assert.equal(todayPlan(s, '2026-11-09').main, 'push'); // qua ngày thì buổi dở hết hạn
});

test('việc chính: buổi chân đang dở nối lại được trong ngày, đúng động tác', () => {
  const s = trained();
  const steps = legsSteps('legs', 1);
  const i = steps.findIndex((x, k) => k > 0 && x.type === 'intro'); // đầu động tác thứ hai
  s.active = { kind: 'legs', date: '2026-11-02', level: 1, i, skipped: 0, elapsed: 60000 };
  const p = todayPlan(s, '2026-11-02');
  assert.equal(p.main, 'legs-resume');
  assert.equal(p.legsActive.at, 2);
  assert.equal(p.legsActive.total, steps.filter((x) => x.type === 'intro').length);
  s.active.level = 2; // mức đã đổi thì không nối
  assert.equal(legsResume(s, '2026-11-02'), null);
  s.active = { kind: 'legs', date: '2026-11-02', level: 1, i: steps.length, skipped: 0 }; // bước lưu nằm ngoài bài
  assert.equal(legsResume(s, '2026-11-02'), null);
});

test('giảm mức: chỉ mời khi buổi kế là buổi tập và còn giảm được', () => {
  const s = trained();
  const p = todayPlan(s, s.nextDate);
  assert.ok(p.lowerTo < s.T);
  const low = applyTest(initialState(), 3, '2026-11-01');
  assert.equal(todayPlan(low, low.nextDate).lowerTo, null);
});

test('lịch sử đầy đủ: không sót dòng nào, mới nhất trước, gom theo tháng', () => {
  let s = trained();
  for (let k = 0; k < 18; k++) s = applySession(s, planSession(s.T, s.day).sets, s.nextDate);
  s.history.push({ type: 'pump', date: s.history.at(-1).date, level: 1, minutes: 2, skipped: 0 });
  const all = historyGroups(s.history);
  const flat = all.groups.flatMap((g) => g.rows);
  assert.equal(all.rest, 0);
  assert.equal(flat.length, s.history.length);
  assert.equal(new Set(flat).size, s.history.length);
  assert.equal(flat[0].type, 'pump'); // cùng ngày: dòng ghi sau đứng trước
  for (let k = 1; k < flat.length; k++) assert.ok(flat[k - 1].date >= flat[k].date);
  assert.ok(all.groups.length >= 2);
  assert.equal(all.groups.at(-1).label, 'Tháng 11/2026');
  for (const g of all.groups) for (const h of g.rows) assert.equal(h.date.slice(0, 7), g.month);
});

test('lịch sử đầy đủ: hiện từng phần, báo đúng số dòng còn lại', () => {
  const history = Array.from({ length: 45 }, (_, k) => ({ type: 'pump', date: `2026-10-${String(1 + (k % 28)).padStart(2, '0')}` }));
  const part = historyGroups(history, 30);
  assert.equal(part.groups.flatMap((g) => g.rows).length, 30);
  assert.equal(part.rest, 15);
  assert.equal(historyGroups(history, 60).rest, 0);
  assert.deepEqual(historyGroups([]), { groups: [], rest: 0 });
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { pushBars, activityGrid, gridSummary } from '../progress.js';

// Giống dữ liệu thật trên máy: thử 20, bơm máu, chân, buổi nhẹ 58, chân.
const H = [
  { type: 'test', date: '2026-11-14', count: 20 },
  { type: 'pump', date: '2026-11-14', minutes: 2 },
  { type: 'legs', date: '2026-11-15', level: 1, minutes: 10 },
  { type: 'session', date: '2026-11-16', done: [12, 14, 10, 10, 12], total: 58, passed: true },
  { type: 'legs', date: '2026-11-17', level: 1, minutes: 12 },
];

test('cột hít đất: buổi tập lấy tổng, bài thử lấy số một hơi, bỏ buổi chân', () => {
  assert.deepEqual(pushBars(H), [
    { date: '2026-11-14', kind: 'test', value: 20 },
    { date: '2026-11-16', kind: 'session', value: 58, passed: true },
  ]);
});

test('cột hít đất: chỉ giữ số lần gần nhất', () => {
  const many = Array.from({ length: 15 }, (_, i) => ({ type: 'test', date: `2026-10-${String(i + 1).padStart(2, '0')}`, count: i }));
  const b = pushBars(many, 10);
  assert.equal(b.length, 10);
  assert.equal(b[0].value, 5);
  assert.equal(b[9].value, 14);
});

test('lịch 4 tuần: bắt đầu thứ hai, tuần cuối chứa hôm nay, đánh dấu đúng ngày', () => {
  const g = activityGrid(H, '2026-11-17', 4); // 17/11/2026 là thứ ba
  assert.equal(g.length, 4);
  assert.ok(g.every((r) => r.length === 7));
  assert.equal(g[0][0].date, '2026-10-26'); // thứ hai
  assert.equal(g[3][1].date, '2026-11-17');
  assert.ok(g[3][1].today && g[3][1].legs && !g[3][1].push);
  assert.ok(g[3][2].future && !g[3][1].future);
  const d14 = g.flat().find((c) => c.date === '2026-11-14');
  assert.ok(d14.push && d14.pump && !d14.legs);
  assert.ok(g.flat().find((c) => c.date === '2026-11-16').push);
});

test('lịch: hôm nay là chủ nhật thì là ô cuối của tuần cuối', () => {
  const g = activityGrid([], '2026-11-22', 2);
  assert.equal(g[1][6].date, '2026-11-22');
  assert.equal(g[0][0].date, '2026-11-09');
});

test('tóm tắt lịch: số ngày có tập và tổng số cái hít đất', () => {
  const g = activityGrid(H, '2026-11-17', 4);
  assert.deepEqual(gridSummary(H, g), { days: 4, reps: 78 });
});

test('lần tự giảm mức không tính là ngày tập, không thành cột', () => {
  const history = [
    { type: 'test', date: '2026-11-16', count: 40 },
    { type: 'adjust', date: '2026-11-17', from: 40, to: 36 },
  ];
  assert.equal(pushBars(history).length, 1);
  const grid = activityGrid(history, '2026-11-20', 1);
  const day17 = grid.flat().find((c) => c.date === '2026-11-17');
  assert.equal(day17.push || day17.legs || day17.pump, false);
  assert.deepEqual(gridSummary(history, grid), { days: 1, reps: 40 });
});

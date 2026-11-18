// Số liệu cho ô «Quá trình tập» ở trang chính. Hàm thuần, không đụng giao diện.
import { addDays } from './program.js';

// Mỗi lần hít đất (buổi tập hoặc bài thử) là một cột, mới nhất ở cuối.
// Buổi tập: cột = tổng số cái cả buổi. Bài thử: cột = số cái một hơi.
export function pushBars(history, limit = 10) {
  return history
    .filter((h) => h.type === 'session' || h.type === 'test')
    .slice(-limit)
    .map((h) => (h.type === 'test'
      ? { date: h.date, kind: 'test', value: h.count }
      : { date: h.date, kind: 'session', value: h.total, passed: h.passed }));
}

// Thứ trong tuần, tuần bắt đầu thứ hai: 0 = thứ hai … 6 = chủ nhật.
function weekday(ds) {
  const [y, m, d] = ds.split('-').map(Number);
  return (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
}

// Lịch `weeks` tuần gần nhất, tuần cuối chứa `endDate`. Mỗi ngày ghi đã tập gì.
export function activityGrid(history, endDate, weeks = 4) {
  const start = addDays(endDate, -weekday(endDate) - 7 * (weeks - 1));
  const byDate = new Map();
  for (const h of history) {
    const k = h.type === 'session' || h.type === 'test' ? 'push' : h.type;
    if (!byDate.has(h.date)) byDate.set(h.date, new Set());
    byDate.get(h.date).add(k);
  }
  const rows = [];
  for (let w = 0; w < weeks; w++) {
    const row = [];
    for (let d = 0; d < 7; d++) {
      const date = addDays(start, w * 7 + d);
      const did = byDate.get(date) || new Set();
      row.push({
        date, future: date > endDate, today: date === endDate,
        push: did.has('push'), legs: did.has('legs'), pump: did.has('pump'),
      });
    }
    rows.push(row);
  }
  return rows;
}

// Tóm tắt các ngày trong lịch (không tính ngày chưa tới).
export function gridSummary(history, grid) {
  const from = grid[0][0].date;
  const to = grid.flat().filter((c) => !c.future).pop().date;
  const inRange = history.filter((h) => h.date >= from && h.date <= to);
  return {
    days: new Set(inRange.map((h) => h.date)).size,
    reps: inRange.reduce((a, h) => a + (h.type === 'session' ? h.total : h.type === 'test' ? h.count : 0), 0),
  };
}

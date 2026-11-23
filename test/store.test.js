import test from 'node:test';
import assert from 'node:assert/strict';
import { initialState, applyTest, applySession, planSession } from '../program.js';
import { readStored, parseBackup, backupDue, resumable, normalize, daysBetween } from '../store.js';

const trained = () => applyTest(initialState(), 20, '2026-11-01');

test('đọc dữ liệu lưu: máy chưa có gì thì ra trạng thái đầu, không báo lỗi', () => {
  const r = readStored(null);
  assert.equal(r.problem, null);
  assert.deepEqual(r.state, initialState());
});

test('đọc dữ liệu lưu: giữ nguyên lịch sử, bù trường mới còn thiếu', () => {
  const old = trained();
  delete old.backupAt; delete old.active; delete old.settings.legsAuto;
  const r = readStored(JSON.stringify(old));
  assert.equal(r.problem, null);
  assert.equal(r.state.T, 20);
  assert.equal(r.state.history.length, 1);
  assert.equal(r.state.backupAt, null);
  assert.equal(r.state.active, null);
  assert.equal(r.state.settings.legsAuto, false);
});

test('đọc dữ liệu lưu: chuỗi hỏng hoặc sai hình dạng thì báo «hong» để bên gọi cất bản gốc', () => {
  for (const raw of ['{"v":1,"history":', 'null', '[]', '{"v":1}', '{"v":1,"history":[{"type":"test"}]}', '{"v":1,"history":[],"T":"20"}', '{"v":0,"history":[]}']) {
    assert.equal(readStored(raw).problem, 'hong', raw);
  }
});

test('đọc dữ liệu lưu: dữ liệu của bản app mới hơn thì báo «ban-la», không coi là hỏng', () => {
  assert.equal(readStored('{"v":2,"history":[],"moi":true}').problem, 'ban-la');
});

test('file sao lưu: đọc lại đúng thứ đã xuất, bỏ buổi đang dở', () => {
  const s = { ...trained(), active: { kind: 'push', date: '2026-11-03', T: 20, day: 0, done: [5] } };
  const r = parseBackup(JSON.stringify(s, null, 2));
  assert.equal(r.ok, true);
  assert.deepEqual(r.state, { ...s, active: null });
  assert.deepEqual(r.summary, { entries: 1, first: '2026-11-01', last: '2026-11-01' });
});

test('file sao lưu: file lạ, file hỏng, file bản mới hơn đều bị từ chối kèm lý do', () => {
  for (const text of ['xin chào', '{"a":1}', '{"v":1,"history":"x"}', '{"v":3,"history":[]}']) {
    const r = parseBackup(text);
    assert.equal(r.ok, false, text);
    assert.ok(r.why.length > 10);
  }
});

test('file sao lưu của máy chưa tập gì vẫn hợp lệ', () => {
  const r = parseBackup(JSON.stringify(initialState()));
  assert.equal(r.ok, true);
  assert.deepEqual(r.summary, { entries: 0, first: null, last: null });
});

test('normalize không nhận mức tập vô nghĩa', () => {
  assert.equal(normalize({ v: 1, history: [], T: 0 }), null);
  assert.equal(normalize({ v: 1, history: [], T: NaN }), null);
  assert.ok(normalize({ v: 1, history: [], T: null }));
});

test('số ngày giữa hai ngày, qua cả tháng và năm', () => {
  assert.equal(daysBetween('2026-11-23', '2026-11-23'), 0);
  assert.equal(daysBetween('2026-11-23', '2026-12-23'), 30);
  assert.equal(daysBetween('2026-12-31', '2027-01-01'), 1);
});

test('nhắc sao lưu: đủ 5 dòng lịch sử mà chưa sao lưu lần nào', () => {
  const s = trained();
  assert.equal(backupDue(s, '2026-11-02'), false); // mới 1 dòng
  for (let i = 0; i < 4; i++) s.history.push({ type: 'pump', date: '2026-11-0' + (2 + i) });
  assert.equal(backupDue(s, '2026-11-06'), true);
});

test('nhắc sao lưu: sau 30 ngày và có tập thêm mới nhắc lại', () => {
  const s = trained();
  for (let i = 0; i < 4; i++) s.history.push({ type: 'pump', date: '2026-11-0' + (2 + i) });
  s.backupAt = '2026-11-06';
  assert.equal(backupDue(s, '2026-12-05'), false); // 29 ngày
  assert.equal(backupDue(s, '2026-12-06'), false); // 30 ngày nhưng không tập thêm
  s.history.push({ type: 'pump', date: '2026-11-06' }); // cùng ngày sao lưu: coi như đã có trong file
  assert.equal(backupDue(s, '2026-12-06'), false);
  s.history.push({ type: 'pump', date: '2026-11-20' });
  assert.equal(backupDue(s, '2026-12-05'), false);
  assert.equal(backupDue(s, '2026-12-06'), true);
});

test('buổi hít đất dở: nối lại được trong cùng ngày khi đúng buổi kế', () => {
  const s = trained();
  s.active = { kind: 'push', date: '2026-11-03', T: 20, day: 0, done: [8, 10] };
  assert.equal(resumable(s, '2026-11-03'), s.active);
  assert.equal(resumable(s, '2026-11-04'), null); // sang ngày khác
});

test('buổi hít đất dở: mức, buổi hoặc lịch đã đổi thì không nối lại', () => {
  const base = trained();
  const a = { kind: 'push', date: '2026-11-03', T: 20, day: 0, done: [8] };
  assert.equal(resumable({ ...base, active: a, T: 18 }, '2026-11-03'), null);
  assert.equal(resumable({ ...base, active: a, day: 1 }, '2026-11-03'), null);
  assert.equal(resumable({ ...base, active: a, pending: 'test' }, '2026-11-03'), null);
  // Buổi đã được ghi xong: chương trình sang buổi kế nên bản dở cũ không còn khớp.
  const done = applySession({ ...base, active: a }, planSession(20, 0).sets, '2026-11-03');
  assert.equal(resumable(done, '2026-11-03'), null);
});

test('buổi hít đất dở: số hiệp đã xong phải từ 1 tới 4 và là số đếm', () => {
  const s = trained();
  for (const done of [[], [1, 2, 3, 4, 5], [3, -1], [2.5], 'x']) {
    s.active = { kind: 'push', date: '2026-11-03', T: 20, day: 0, done };
    assert.equal(resumable(s, '2026-11-03'), null, JSON.stringify(done));
  }
});

test('buổi chân dở: nối lại trong cùng ngày, từ bước đã lưu', () => {
  const s = trained();
  s.active = { kind: 'legs', date: '2026-11-03', level: 1, i: 6, skipped: 0, elapsed: 90000 };
  assert.equal(resumable(s, '2026-11-03'), s.active);
  assert.equal(resumable(s, '2026-11-04'), null);
  s.active = { kind: 'legs', date: '2026-11-03', level: 1, i: 0, skipped: 0 };
  assert.equal(resumable(s, '2026-11-03'), null); // chưa làm gì thì không có gì để nối
  s.active = { kind: 'la', date: '2026-11-03', i: 3, skipped: 0 };
  assert.equal(resumable(s, '2026-11-03'), null);
});

// Đọc – kiểm dữ liệu lưu, file sao lưu, buổi đang dở. Hàm thuần, không đụng DOM hay localStorage.
// Giải thích ở docs/ke-hoach/2026-11-23-lam-lai.md (mốc 1).
import { initialState } from './program.js';

export const KEY = 'hitdat.v1';
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const isObj = (x) => x != null && typeof x === 'object' && !Array.isArray(x);
const isCount = (x) => Number.isInteger(x) && x >= 0;

// Ghép dữ liệu đã lưu với mặc định. Trả null nếu không phải dữ liệu của app bản 1.
export function normalize(s) {
  if (!isObj(s) || s.v !== 1) return null;
  if (!Array.isArray(s.history) || !s.history.every((h) => isObj(h) && typeof h.type === 'string' && DATE.test(h.date))) return null;
  if (s.T != null && !(Number.isFinite(s.T) && s.T >= 1)) return null;
  const base = initialState();
  return { ...base, ...s, settings: { ...base.settings, ...(isObj(s.settings) ? s.settings : {}) } };
}

// Đọc chuỗi lấy từ localStorage. problem:
//   null     — đọc được (hoặc máy chưa có gì)
//   'hong'   — có dữ liệu nhưng không đọc được: bên gọi phải cất bản gốc trước khi ghi đè
//   'ban-la' — dữ liệu của bản app mới hơn: bên gọi không được ghi đè
export function readStored(raw) {
  if (raw == null) return { state: initialState(), problem: null };
  let s = null;
  try { s = JSON.parse(raw); } catch {}
  if (isObj(s) && Number.isFinite(s.v) && s.v > 1) return { state: initialState(), problem: 'ban-la' };
  const state = normalize(s);
  return state ? { state, problem: null } : { state: initialState(), problem: 'hong' };
}

// Đọc file sao lưu. Buổi đang dở không đi theo file.
export function parseBackup(text) {
  let s = null;
  try { s = JSON.parse(text); } catch {
    return { ok: false, why: 'File này không phải file sao lưu của app (không đọc được).' };
  }
  if (isObj(s) && Number.isFinite(s.v) && s.v > 1) {
    return { ok: false, why: 'File sao lưu thuộc bản app mới hơn. Hãy mở lại app để cập nhật rồi khôi phục.' };
  }
  const state = normalize(s);
  if (!state) return { ok: false, why: 'File này không phải file sao lưu của app.' };
  state.active = null;
  const dates = state.history.map((h) => h.date).sort();
  return { ok: true, state, summary: { entries: state.history.length, first: dates[0] || null, last: dates.at(-1) || null } };
}

export function daysBetween(a, b) {
  const t = (ds) => { const [y, m, d] = ds.split('-').map(Number); return Date.UTC(y, m - 1, d); };
  return Math.round((t(b) - t(a)) / 86400000);
}

// Nhắc sao lưu: đã có ít nhất 5 dòng lịch sử mà chưa sao lưu lần nào,
// hoặc lần sao lưu gần nhất đã quá 30 ngày và từ đó có tập thêm.
export const BACKUP_MIN_ENTRIES = 5;
export const BACKUP_EVERY_DAYS = 30;
export function backupDue(state, today) {
  if (state.history.length < BACKUP_MIN_ENTRIES) return false;
  if (!state.backupAt) return true;
  return daysBetween(state.backupAt, today) >= BACKUP_EVERY_DAYS && state.history.some((h) => h.date > state.backupAt);
}

// Buổi đang dở còn tập tiếp được không. Chỉ nối lại trong cùng ngày.
// Hít đất: { kind: 'push', date, T, day, done } — phải khớp đúng buổi kế của chương trình.
// Tập chân: { kind: 'legs' | 'pump', date, level, i, skipped, elapsed } — i là bước sẽ làm tiếp.
export function resumable(state, today) {
  const a = state.active;
  if (!isObj(a) || a.date !== today) return null;
  if (a.kind === 'push') {
    if (state.pending !== 'session' || a.T !== state.T || a.day !== state.day) return null;
    if (!Array.isArray(a.done) || a.done.length < 1 || a.done.length > 4 || !a.done.every(isCount)) return null;
    return a;
  }
  if (a.kind === 'legs' || a.kind === 'pump') {
    if (!isCount(a.i) || a.i < 1 || !isCount(a.skipped)) return null;
    return a;
  }
  return null;
}

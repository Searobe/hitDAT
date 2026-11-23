// Dữ liệu đang dùng và việc ghi – đọc localStorage. Luật đọc – kiểm nằm ở store.js.
import { KEY, readStored } from './store.js';

export const KEY_BAD = 'hitdat.hong'; // bản gốc không đọc được, cất lại để không mất
export const KEY_PREV = 'hitdat.truoc'; // dữ liệu ngay trước lần khôi phục / xoá gần nhất

// db.state bị thay nguyên cả đối tượng sau mỗi buổi tập, nên các màn luôn đọc qua db.state.
// db.readOnly: dữ liệu trên máy thuộc bản app mới hơn — không ghi đè, chờ app cập nhật.
export const db = { state: null, readOnly: false };

function load() {
  let raw = null;
  try { raw = localStorage.getItem(KEY); } catch {}
  const r = readStored(raw);
  if (r.problem === 'ban-la') db.readOnly = true;
  if (r.problem === 'hong') { try { localStorage.setItem(KEY_BAD, raw); } catch {} }
  return r.state;
}
export function save() {
  if (db.readOnly) return;
  try { localStorage.setItem(KEY, JSON.stringify(db.state)); } catch {}
}
export function stash(key, text) {
  try { localStorage.setItem(key, text); } catch {}
}
export const peek = (key) => { try { return localStorage.getItem(key); } catch { return null; } };
export function drop(key) {
  try { localStorage.removeItem(key); } catch {}
}
db.state = load();

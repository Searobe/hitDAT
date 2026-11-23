// Ngày tháng và chữ dùng chung cho các màn. Hàm thuần (trừ today() đọc giờ máy).
export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const THU = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
// Ngày có thứ: «Thứ tư 25/11».
export function fmtDay(ds) {
  const [y, m, d] = ds.split('-').map(Number);
  return `${THU[new Date(y, m - 1, d).getDay()]} ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
}
// Ngày nên tập: đã tới hoặc đã qua thì là «Hôm nay».
export function fmtDate(ds, t = today()) {
  if (!ds) return '';
  return ds <= t ? 'Hôm nay' : fmtDay(ds);
}
export function fmtPast(ds) {
  const [, m, d] = ds.split('-');
  return `${d}/${m}`;
}
export function fmtFull(ds) {
  const [y, m, d] = ds.split('-');
  return `${d}/${m}/${y}`;
}
export const setsText = (sets) => sets.map((n, i) => (i === sets.length - 1 ? `${n}+` : n)).join(' · ');
export const DAY_NAME = ['Buổi nhẹ', 'Buổi vừa', 'Buổi nặng'];
// Lời dặn cho hiệp cuối sau khi đã đủ mức tối thiểu (mode: xem lastSetMode ở program.js).
export const lastSetAfter = (mode) => (mode === 'max' ? 'hít tiếp tới hết sức' : 'dừng khi còn hít được 1–2 cái nữa');
export const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

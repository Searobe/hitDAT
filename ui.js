// Khung giao diện dùng chung: thanh thẻ, dựng màn, màn tập phủ kín, hộp xác nhận, đồng hồ.
// Nguồn tra cho cách làm: docs/ke-hoach/2026-11-23-lam-lai.md (mốc 2).
import { db, save } from './data.js';
import { camera } from './camera.js';
import { startFigures } from './figures.js';
import { esc } from './format.js';

const $app = document.getElementById('app');
const $tabs = document.getElementById('tabs');

// Buổi đang chạy. workout: buổi hít đất hoặc đánh dấu «đang trong buổi»; legs: trình dẫn tập chân.
export const run = { workout: null, legs: null };

// ---------- Chuyển màn ----------
// Các màn đăng ký theo tên để file này không phải nhập ngược các file màn.
const routes = {};
const TABS = ['today', 'progress', 'settings'];
let current = 'today';
let credit = '';
export function setCredit(html) { credit = html; }
export function route(name, fn) { routes[name] = fn; }
export function show(name, opts = {}) {
  run.workout = null;
  run.legs = null;
  current = name;
  routes[name](opts);
}
// Vẽ lại màn đang mở, giữ nguyên chỗ đang cuộn.
export const refresh = () => show(current, { keep: true });

export function render(html, { tab = 'today', keep = false } = {}) {
  const y = window.scrollY;
  document.body.classList.remove('in-stage');
  $app.innerHTML = html + credit;
  for (const b of $tabs.querySelectorAll('[data-tab]')) {
    if (b.dataset.tab === tab) b.setAttribute('aria-current', 'page'); else b.removeAttribute('aria-current');
  }
  window.scrollTo(0, keep ? y : 0);
  startFigures($app);
}
export function on(id, fn, ev = 'click') {
  const el = document.getElementById(id);
  if (el) el.addEventListener(ev, fn);
}
// Màn đếm giờ chỉ đổi con số, không dựng lại cả màn: nút giữ nguyên nên chạm không bị mất giữa chừng.
export function setNum(n) {
  const el = document.getElementById('num');
  if (el) el.textContent = n;
}
// Công tắc: ô đánh dấu có vai trò «switch», nằm trong một dòng danh sách, nhãn không đổi theo trạng thái.
export const toggle = (id, onNow, title, sub = '', disabled = false) => `
  <label class="item sw"><span><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</span>
    <input type="checkbox" role="switch" id="${id}"${onNow ? ' checked' : ''}${disabled ? ' disabled' : ''}></label>`;

$tabs.addEventListener('click', (e) => {
  const b = e.target.closest('[data-tab]');
  if (b && TABS.includes(b.dataset.tab)) show(b.dataset.tab);
});

// ---------- Hộp xác nhận trong app ----------
// Thay confirm() / alert() của trình duyệt. Trả true khi người dùng bấm nút đồng ý.
// danger: việc không lấy lại được — nút đồng ý tô đỏ, nút huỷ được chọn sẵn.
// Máy quá cũ không có <dialog> thì dùng hộp của trình duyệt.
function box({ title, text = '', ok, cancel, danger = false }) {
  return new Promise((resolve) => {
    const d = document.createElement('dialog');
    if (typeof d.showModal !== 'function') {
      const msg = text ? `${title}\n\n${text}` : title;
      if (cancel == null) { window.alert(msg); resolve(true); } else resolve(window.confirm(msg));
      return;
    }
    d.className = 'box';
    d.setAttribute('aria-labelledby', 'box-title');
    d.innerHTML = `<form method="dialog">
      <h2 id="box-title">${esc(title)}</h2>
      ${text ? `<p>${esc(text)}</p>` : ''}
      <div class="btns ${cancel == null ? '' : 'two'}">
        ${cancel == null ? '' : `<button value="no"${danger ? ' autofocus' : ''}>${esc(cancel)}</button>`}
        <button value="yes" class="${danger ? 'danger-fill' : 'primary'}"${danger ? '' : ' autofocus'}>${esc(ok)}</button>
      </div></form>`;
    d.addEventListener('close', () => { d.remove(); resolve(d.returnValue === 'yes'); });
    document.body.appendChild(d);
    d.showModal();
  });
}
export const confirmBox = ({ ok = 'Đồng ý', cancel = 'Huỷ', ...rest }) => box({ ok, cancel, ...rest });
export const alertBox = ({ ok = 'Đã hiểu', ...rest }) => box({ ok, cancel: null, ...rest });

// ---------- Giữ màn hình sáng ----------
let wake = null;
export async function keepAwake(yes) {
  try {
    if (yes && navigator.wakeLock) wake = await navigator.wakeLock.request('screen');
    if (!yes && wake) { await wake.release(); wake = null; }
  } catch {}
}

// ---------- Đồng hồ ----------
const timers = new Set();
export function later(fn, ms) { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; }
export function every(fn, ms) { const t = setInterval(fn, ms); timers.add(t); return t; }
export function clearTimers() { timers.forEach((t) => { clearTimeout(t); clearInterval(t); }); timers.clear(); }
// Chạy một đồng hồ đếm lùi (clock.js): gọi onLeft mỗi khi con số đổi, onDone khi về 0.
// Hỏi giờ thật 5 lần mỗi giây; quay lại app sau khi khoá màn thì nhảy thẳng tới số đúng.
export function runCountdown(cd, onLeft, onDone) {
  let shown = cd.left(Date.now());
  every(() => {
    const left = cd.left(Date.now());
    if (left === shown) return;
    shown = left;
    if (left <= 0) { clearTimers(); onDone(); return; }
    onLeft(left);
  }, 200);
}

// ---------- Màn tập phủ kín ----------
export function endWorkout() {
  clearTimers();
  camera.stop();
  keepAwake(false);
  if (db.state.active) { db.state.active = null; save(); }
  show('today');
}
export function stage(inner, { quit = true, top = '' } = {}) {
  document.body.classList.add('in-stage');
  $app.innerHTML = `<div class="stage">
    <div class="top">${quit ? '<button id="quit" class="ghost">✕ Thoát</button>' : '<span></span>'}<span class="dim small">${top}</span></div>
    ${inner}
  </div>`;
  startFigures($app);
  on('quit', async () => {
    const session = run.workout;
    const yes = await confirmBox({ title: 'Thoát buổi này?', text: 'Kết quả dở dang sẽ không được ghi.', ok: 'Thoát', cancel: 'Tập tiếp', danger: true });
    // Trong lúc hộp mở, buổi có thể đã tự xong (hết giờ, đủ lượt): khi đó không còn gì để thoát.
    if (yes && run.workout === session && session && session.phase !== 'summary') endWorkout();
  });
}

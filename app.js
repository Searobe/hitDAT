// Khởi động app. Giao diện nằm ở ui.js và các file view-*.js; luật chương trình tập ở program.js / legs.js.
import { run, show, setCredit, keepAwake } from './ui.js';
import { resumeAudio } from './sound.js';
import './view-today.js';
import './view-progress.js';
import './view-settings.js';
import './view-legs.js';
import './view-workout.js';

// Số bản: tăng cùng lúc với CACHE trong sw.js. Hiện ở chân trang để biết máy đang chạy bản nào.
const VERSION = 16;
setCredit(`<footer class="credit">Made by Searobe · © 2026 · v${VERSION}</footer>`);

// Safari iOS chỉ hiện hiệu ứng nhấn (:active) khi trang có lắng nghe chạm.
document.addEventListener('touchstart', () => {}, { passive: true });
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState !== 'visible') {
    if (run.legs && run.legs.pauseWork) run.legs.pauseWork();
    return;
  }
  if (run.workout && run.workout.phase !== 'summary') keepAwake(true);
  resumeAudio();
});
// Xin máy giữ dữ liệu lâu dài (được hay không do máy quyết; app ghim màn hình chính dễ được hơn).
try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch {}
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  const idle = () => !run.workout || run.workout.phase === 'summary';
  let pendingReload = false;
  // Bản mới vừa nhận quyền điều khiển trang: tải lại để dùng ngay, trừ khi đang giữa buổi tập.
  const hadController = !!navigator.serviceWorker.controller;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) return; // lần cài đầu tiên, trang đang mở đã là bản mới
    if (idle()) location.reload(); else pendingReload = true;
  });
  navigator.serviceWorker.register('sw.js', { updateViaCache: 'none' }).then((reg) => {
    // App ghim ở màn hình chính thường chỉ được «đánh thức» chứ không tải lại: mỗi lần hiện lên thì hỏi bản mới.
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState !== 'visible') return;
      if (pendingReload && idle()) { location.reload(); return; }
      reg.update().catch(() => {});
    });
  }).catch(() => {});
}
show('today');

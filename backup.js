// Sao lưu ra file và khôi phục từ file. Luật đọc file nằm ở store.js.
import { db, save, stash, KEY_PREV } from './data.js';
import { parseBackup } from './store.js';
import { today, fmtFull } from './format.js';
import { run, refresh, show, confirmBox, alertBox } from './ui.js';

// Đưa file cho người dùng: ưu tiên bảng chia sẻ của máy (lưu vào Tệp, iCloud, gửi đi), không được thì tải xuống.
// Trả false nếu người dùng đóng bảng chia sẻ mà không lưu.
export async function shareFile(text, name, type) {
  try {
    const file = new File([text], name, { type });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file] });
      return true;
    }
  } catch (e) {
    if (e && e.name === 'AbortError') return false;
  }
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type }));
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
  return true;
}
export async function backupNow() {
  const ok = await shareFile(JSON.stringify({ ...db.state, active: null }, null, 2), `hit-dat-${today()}.json`, 'application/json');
  if (!ok) return;
  db.state.backupAt = today();
  save();
  if (!run.workout) refresh();
}
export function importData() {
  // Dữ liệu trên máy thuộc bản mới hơn: khôi phục lúc này sẽ đè lên nó, nên chờ app cập nhật đã.
  if (db.readOnly) {
    alertBox({ title: 'Chưa khôi phục được', text: 'Dữ liệu trên máy thuộc bản app mới hơn. Hãy mở lại app để cập nhật rồi mới khôi phục.' });
    return;
  }
  const inp = document.createElement('input');
  inp.type = 'file';
  inp.accept = '.json,application/json';
  inp.hidden = true;
  inp.addEventListener('change', async () => {
    const f = inp.files && inp.files[0];
    inp.remove();
    if (!f) return;
    const r = parseBackup(await f.text());
    if (!r.ok) { alertBox({ title: 'Không khôi phục được', text: r.why }); return; }
    const { entries, first, last } = r.summary;
    const inFile = entries ? `${entries} dòng lịch sử, từ ${fmtFull(first)} tới ${fmtFull(last)}` : 'chưa có lịch sử tập';
    const yes = await confirmBox({
      title: 'Thay dữ liệu trên máy?',
      text: `File sao lưu có ${inFile}. Dữ liệu đang có trên máy (${db.state.history.length} dòng lịch sử) sẽ được thay bằng file này.`,
      ok: 'Thay bằng file', cancel: 'Giữ như cũ', danger: true,
    });
    if (!yes) return;
    stash(KEY_PREV, JSON.stringify(db.state));
    db.state = r.state;
    save();
    show('today');
  });
  document.body.appendChild(inp);
  inp.click();
}

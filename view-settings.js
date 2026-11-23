// Thẻ «Cài đặt»: công tắc bật – tắt, việc về chương trình, dữ liệu.
import { initialState, upcoming, canLower, applyLower } from './program.js';
import { db, save, stash, KEY_PREV } from './data.js';
import { today, fmtPast } from './format.js';
import { route, show, render, on, confirmBox, toggle } from './ui.js';
import { unlockAudio, beep, say } from './sound.js';
import { backupNow, importData } from './backup.js';
import { startWorkout } from './view-workout.js';
import { lowerLevel } from './view-today.js';

function viewSettings({ keep = false } = {}) {
  const { state } = db;
  const s = state.settings;
  const next = state.T == null ? null : upcoming(state)[0];
  const lowerTo = next && next.type === 'session' && canLower(state) ? applyLower(state, today()).T : null;

  render(`
    <h1>Cài đặt</h1>
    ${db.readOnly ? '<p class="small notice">Dữ liệu trên máy thuộc bản app mới hơn: lần mở này thay đổi ở đây không được lưu.</p>' : ''}

    <h2>Đếm lượt</h2>
    <div class="card menu">
      ${toggle('mode', s.mode === 'camera', 'Đếm bằng camera trước', 'Máy tự nhận lượt, không cần hiệu chỉnh. Tắt thì chỉ đếm bằng chạm màn hình. Hình không lưu, không gửi đi.')}
      ${toggle('calibrate', !!s.calibrate, 'Hiệu chỉnh tay trước buổi', 'Dự phòng khi camera tự đếm sót hoặc thừa: trước buổi đo tư thế cao và thấp khoảng 8 giây.', s.mode !== 'camera')}
    </div>

    <h2>Âm thanh</h2>
    <div class="card menu">
      ${toggle('sound', s.sound, 'Âm thanh', 'Bíp mỗi lượt, đếm ngược, báo xong hiệp.')}
      ${toggle('count', s.count === 'voice', 'Đọc số mỗi lượt', 'Tắt thì mỗi lượt kêu một tiếng bíp.', !s.sound)}
    </div>

    <h2>Tập chân</h2>
    <div class="card menu">
      ${toggle('legsAuto', !!s.legsAuto, 'Tự vào tập sau màn xem hình', 'Hợp khi đã quen động tác. Tắt thì đợi bấm «Bắt đầu».')}
    </div>

    ${state.T == null ? '' : `
    <h2>Chương trình hít đất</h2>
    <div class="card menu">
      <button class="item" id="retest"><span><b>Làm bài thử lại ngay</b><small>Xếp lại mức tập theo kết quả mới.</small></span></button>
      ${lowerTo != null ? `<button class="item" id="lower"><span><b>Giảm mức tập ${state.T} → ${lowerTo}</b><small>Khi buổi tập quá nặng.</small></span></button>` : ''}
    </div>`}

    <h2>Dữ liệu</h2>
    <div class="card menu">
      <button class="item" id="export"><span><b>Sao lưu dữ liệu</b><small>${state.backupAt ? `Lần gần nhất: ${fmtPast(state.backupAt)}.` : 'Chưa sao lưu lần nào.'} Nên cất file vào Tệp hoặc iCloud.</small></span></button>
      <button class="item" id="import"><span><b>Khôi phục từ file sao lưu</b><small>Thay dữ liệu trên máy bằng file đã lưu.</small></span></button>
      <button class="item danger" id="reset"><span><b>Xoá hết, làm lại từ đầu</b></span></button>
    </div>
  `, { tab: 'settings', keep });

  // Công tắc đổi tại chỗ, không dựng lại trang nên trang không nhảy.
  on('mode', (e) => {
    s.mode = e.target.checked ? 'camera' : 'touch';
    save();
    document.getElementById('calibrate').disabled = s.mode !== 'camera';
  }, 'change');
  on('calibrate', (e) => { s.calibrate = e.target.checked; save(); }, 'change');
  on('sound', (e) => {
    s.sound = e.target.checked;
    save(); unlockAudio(); beep(880);
    document.getElementById('count').disabled = !s.sound;
  }, 'change');
  on('count', (e) => {
    s.count = e.target.checked ? 'voice' : 'beep';
    save(); unlockAudio();
    if (s.count === 'voice') say(3); else beep(880);
  }, 'change');
  on('legsAuto', (e) => { s.legsAuto = e.target.checked; save(); }, 'change');
  on('retest', () => startWorkout('test'));
  on('lower', () => lowerLevel(lowerTo, next.day));
  on('export', backupNow);
  on('import', importData);
  on('reset', async () => {
    const yes = await confirmBox({
      title: 'Xoá toàn bộ lịch sử?',
      text: `Sẽ xoá ${state.history.length} dòng lịch sử và bắt đầu lại từ bài thử đầu tiên. Việc này không lấy lại được trong app.`,
      ok: 'Xoá hết', danger: true,
    });
    if (!yes) return;
    stash(KEY_PREV, JSON.stringify(db.state));
    db.state = initialState();
    save();
    show('today');
  });
}

route('settings', viewSettings);

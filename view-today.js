// Thẻ «Hôm nay»: một việc chính, các việc khác xếp thành danh sách bên dưới.
import { GOAL, planSession, applyLower, lastSetMode } from './program.js';
import { EX, legsLevel, legsPlan, buildSteps, estimateMinutes, doneOn, describe, pumpEntry, undoManualPump } from './legs.js';
import { backupDue } from './store.js';
import { todayPlan } from './today.js';
import { db, save, peek, drop, KEY_BAD } from './data.js';
import { today, fmtDate, fmtDay, fmtPast, setsText, DAY_NAME, lastSetAfter } from './format.js';
import { route, show, render, on, confirmBox } from './ui.js';
import { shareFile, backupNow, importData } from './backup.js';
import { startWorkout } from './view-workout.js';
import { startLegs } from './view-legs.js';

const chips = (sets) => `<div class="sets">${sets.map((n, i) => `<span>${n}${i === 4 ? '+' : ''}</span>`).join('')}</div>`;
const GO = '<svg class="go" viewBox="0 0 10 16" aria-hidden="true"><path d="M2 2l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const item = (id, title, sub) => `<button class="item" id="${id}"><span><b>${title}</b>${sub ? `<small>${sub}</small>` : ''}</span>${GO}</button>`;

// Thông báo về dữ liệu: bản lạ (không ghi đè) và bản gốc không đọc được (đã cất lại).
function noticeCards() {
  let html = '';
  if (db.readOnly) {
    html += `<div class="card notice"><b>Dữ liệu trên máy thuộc bản app mới hơn</b>
      <p class="small">Để không ghi đè, lần mở này app không lưu gì. Hãy đóng hẳn app rồi mở lại khi có mạng để cập nhật.</p></div>`;
  }
  if (peek(KEY_BAD)) {
    html += `<div class="card"><b>Có dữ liệu cũ app không đọc được</b>
      <p class="dim small">Bản gốc vẫn được giữ trên máy. Lưu ra file để giữ lại, rồi mới bỏ.</p>
      <div class="btns two"><button id="badSave">Lưu bản gốc ra file</button><button id="badDrop" class="ghost">Bỏ bản gốc</button></div></div>`;
  }
  return html;
}
function bindNotices() {
  on('badSave', () => shareFile(peek(KEY_BAD) || '', `hit-dat-ban-goc-${today()}.txt`, 'text/plain'));
  on('badDrop', async () => {
    if (!await confirmBox({ title: 'Bỏ bản gốc không đọc được?', text: 'Việc này không lấy lại được.', ok: 'Bỏ', danger: true })) return;
    drop(KEY_BAD);
    show('today');
  });
}

// Các việc không phải việc chính: hít đất (khi là ngày nghỉ), buổi chân, bơm máu, hình động tác.
function otherItems(p) {
  const { state } = db;
  const t = today();
  const { level } = legsLevel(state.history);
  const mins = estimateMinutes(buildSteps(legsPlan(level)));
  const pumpToday = doneOn(state.history, 'pump', t);
  const pumpManual = state.history.some((h) => h.type === 'pump' && h.date === t && h.manual);
  const la = p.legsActive;
  const rows = [];
  if (p.next && p.main !== 'push' && p.main !== 'push-resume') {
    const name = p.next.type === 'test' ? 'Bài thử sức' : `Hít đất · tuần ${state.week} · ${DAY_NAME[p.next.day].toLowerCase()}`;
    rows.push(item('pushRow', name, p.early ? `Nên tập ${fmtDate(state.nextDate).toLowerCase()} — cơ cần nghỉ ít nhất 1 ngày` : 'Tới ngày tập'));
  }
  if (p.main !== 'legs' && !(la && la.kind === 'legs')) {
    const note = p.legsToday ? 'Đã tập hôm nay ✓ — chạm để tập lần nữa'
      : p.main === 'first' || p.main === 'rest' ? 'Hợp để tập vào ngày nghỉ hít đất'
      : 'Hôm nay là ngày hít đất; buổi chân nên để ngày nghỉ';
    rows.push(item('legs', `Buổi chân · mức ${level} · ${mins} phút`, note));
  }
  if (!(la && la.kind === 'pump')) {
    rows.push(`<div class="item split">
      <button class="item" id="pump"><span><b>Bơm máu bắp chân</b><small>${pumpToday ? 'Đã làm hôm nay ✓ — chạm để làm lần nữa' : '2 phút, mỗi ngày một lần'}</small></span>${GO}</button>
      ${!pumpToday ? '<button id="pumpLog" class="side" aria-label="Ghi nhận đã tự tập bơm máu hôm nay">Đã tự tập</button>' : ''}
      ${pumpManual ? '<button id="pumpUndo" class="side" aria-label="Bỏ ghi nhận đã tự tập bơm máu hôm nay">Bỏ dấu</button>' : ''}
    </div>`);
  }
  rows.push(item('guide', 'Hình động tác chân và lưu ý', 'Cách làm, cơ tác động, khi nào cần đi khám'));
  return `<h2>Việc khác</h2><div class="card menu">${rows.join('')}</div>`;
}
function bindOthers(p) {
  const { state } = db;
  on('pushRow', async () => {
    if (p.early && !await confirmBox({
      title: 'Vẫn tập hít đất hôm nay?',
      text: `Cơ cần nghỉ ít nhất 1 ngày. Nên tập vào ${fmtDate(state.nextDate).toLowerCase()}.`,
      ok: 'Vẫn tập', cancel: 'Để sau',
    })) return;
    startWorkout(p.next.type);
  });
  on('legs', () => startLegs('legs'));
  on('pump', () => startLegs('pump'));
  on('pumpLog', () => { state.history.push(pumpEntry(today())); save(); show('today', { keep: true }); });
  on('pumpUndo', () => { state.history = undoManualPump(state.history, today()); save(); show('today', { keep: true }); });
  on('guide', () => show('guide'));
}

// Việc chính của hôm nay: đúng một nút tô màu trên cả trang.
function heroCard(p) {
  const { state } = db;
  const la = p.legsActive;
  const { level } = legsLevel(state.history);
  if (p.main === 'push-resume') {
    const a = p.pushActive;
    return `<div class="card hero">
      <div class="eyebrow">Việc hôm nay · đang dở</div>
      <div class="title">Tuần ${state.week} · ${DAY_NAME[state.day]}</div>
      <p class="small">Đã xong ${a.done.length}/5 hiệp (${a.done.join(' · ')}).</p>
      <div class="btns">
        <button class="primary" id="resume">Tập tiếp từ hiệp ${a.done.length + 1}</button>
        <button class="ghost" id="dropActive">Bỏ buổi dở, tập lại từ đầu</button>
      </div></div>`;
  }
  if (p.main === 'legs-resume') {
    return `<div class="card hero">
      <div class="eyebrow">Việc hôm nay · đang dở</div>
      <div class="title">${la.kind === 'pump' ? 'Bơm máu bắp chân' : `Buổi chân · mức ${level}`}</div>
      <p class="small">Đang ở động tác ${la.at}/${la.total}.</p>
      <div class="btns">
        <button class="primary" id="legsResume">Tập tiếp từ động tác ${la.at}</button>
        <button class="ghost" id="dropActive">Bỏ buổi dở</button>
      </div></div>`;
  }
  if (p.main === 'push') {
    const n = p.next;
    const lower = p.lowerTo != null ? `<button class="ghost" id="lower">Nặng quá? Giảm mức tập ${state.T} → ${p.lowerTo}</button>` : '';
    if (n.type === 'test') {
      return `<div class="card hero">
        <div class="eyebrow">Việc hôm nay</div>
        <div class="title">Bài thử sức</div>
        <p class="dim small">Hít tối đa một hơi để xếp lại mức tập. Đủ ${GOAL} cái là về đích.</p>
        <div class="btns"><button class="primary" id="go">Làm bài thử</button></div></div>`;
    }
    const last = `Hiệp cuối ít nhất ${n.sets[4]} cái, rồi ${lastSetAfter(lastSetMode(n.day))}.`;
    if (p.back) {
      // Nghỉ dài quay lại: app chỉ gợi ý, người tập chọn. Vẫn đúng một nút tô màu.
      const b = p.back;
      return `<div class="card hero">
        <div class="eyebrow">Việc hôm nay · quay lại sau khi nghỉ</div>
        <div class="title">Tuần ${state.week} · ${DAY_NAME[n.day]}</div>
        ${chips(n.sets)}
        <p class="small">Đã trễ ${b.days} ngày so với ngày nên tập. Nghỉ lâu thì buổi này có thể nặng hơn sức hiện tại: nên hạ mức hoặc thử lại. App không tự đổi gì.</p>
        <p class="dim small">5 hiệp, nghỉ ${n.rest} giây giữa hiệp. ${last}</p>
        <div class="btns">
          ${b.lowerTo != null ? `<button class="primary" id="lower">Hạ mức tập 10%: ${state.T} → ${b.lowerTo}</button>` : ''}
          <button id="retest">Làm bài thử lại để xếp mức</button>
          <button class="${b.lowerTo != null ? 'ghost' : 'primary'}" id="go">Tập mức cũ (${state.T})</button>
        </div></div>`;
    }
    return `<div class="card hero">
      <div class="eyebrow">Việc hôm nay</div>
      <div class="title">Tuần ${state.week} · ${DAY_NAME[n.day]}</div>
      ${chips(n.sets)}
      <p class="dim small">5 hiệp, nghỉ ${n.rest} giây giữa hiệp. ${last}</p>
      <div class="btns"><button class="primary" id="go">Bắt đầu buổi tập</button>${lower}</div></div>`;
  }
  if (p.main === 'legs') {
    const plan = legsPlan(level);
    return `<div class="card hero">
      <div class="eyebrow">Việc hôm nay · ngày nghỉ hít đất</div>
      <div class="row"><div class="title">Buổi chân · mức ${level}</div><span class="pill">${estimateMinutes(buildSteps(plan))} phút</span></div>
      <p class="dim small">${plan.map((i) => `${EX[i.ex].name} ${describe(i)}`).join(' · ')}</p>
      <div class="btns"><button class="primary" id="legs">Bắt đầu buổi chân</button></div></div>`;
  }
  // 'rest'
  const what = p.pushToday && p.legsToday ? 'Đã tập hít đất và tập chân.' : p.pushToday ? 'Đã tập hít đất.' : 'Đã tập chân.';
  return `<div class="card hero">
    <div class="eyebrow">Việc hôm nay</div>
    <div class="title">Xong việc hôm nay ✓</div>
    <p class="dim small">${what} Buổi hít đất kế: ${fmtDate(state.nextDate).toLowerCase()}.</p></div>`;
}

function viewToday({ keep = false } = {}) {
  const { state } = db;
  const t = today();
  const p = todayPlan(state, t);
  if (p.main === 'first') return viewWelcome(p, keep);
  const best = Math.max(0, ...state.history.filter((h) => h.type === 'test').map((h) => h.count));
  const due = backupDue(state, t);

  render(`
    <h1>Hôm nay</h1>
    <p class="dim small">${fmtDay(t)} · ${state.achieved ? `🏆 Đã hít được ${GOAL} cái một hơi` : `Mục tiêu ${GOAL} cái một hơi`} · tốt nhất ${best} · mức tập ${state.T}</p>
    ${noticeCards()}
    ${heroCard(p)}
    ${otherItems(p)}
    ${due ? `<div class="card">
      <b>Nên sao lưu dữ liệu</b>
      <p class="dim small">${state.backupAt ? `Lần sao lưu gần nhất: ${fmtPast(state.backupAt)}.` : 'Chưa sao lưu lần nào.'} Lịch sử tập chỉ nằm trên máy này; iPhone có thể tự xoá dữ liệu của app web lâu không mở.</p>
      <div class="btns"><button id="exportNow">Sao lưu ngay</button></div>
    </div>` : ''}
  `, { tab: 'today', keep });

  on('go', () => startWorkout(p.next.type));
  on('resume', () => startWorkout('session', p.pushActive));
  on('legsResume', () => startLegs(p.legsActive.kind, p.legsActive));
  on('dropActive', () => { state.active = null; save(); show('today'); });
  on('lower', () => lowerLevel(p.lowerTo, p.next.day));
  on('retest', () => startWorkout('test'));
  on('exportNow', backupNow);
  bindNotices();
  bindOthers(p);
}

// Tự giảm mức tập (dùng ở thẻ Hôm nay và thẻ Cài đặt).
export async function lowerLevel(lowerTo, day) {
  const { state } = db;
  const sets = setsText(planSession(lowerTo, day).sets);
  const yes = await confirmBox({
    title: `Giảm mức tập từ ${state.T} xuống ${lowerTo}?`,
    text: `${DAY_NAME[day]} sẽ còn: ${sets}. Bài thử kế tiếp vẫn xếp lại mức theo kết quả thật.`,
    ok: 'Giảm mức', cancel: 'Giữ mức',
  });
  if (!yes) return;
  db.state = applyLower(state, today());
  save();
  show('today');
}

function viewWelcome(p, keep) {
  const cam = db.state.settings.mode === 'camera';
  render(`
    <h1>Hít Đất 100</h1>
    <p class="dim">Từ mức hiện tại của bạn tới 100 cái một hơi.</p>
    ${noticeCards()}
    <div class="card hero">
      <div class="eyebrow">Việc đầu tiên</div>
      <div class="title">Bài thử sức</div>
      <p class="dim small">Hít tối đa một hơi, đúng tư thế. App dựa vào kết quả để xếp mức và lên lịch.</p>
      <div class="btns">
        ${p.legsActive ? '' : '<button class="primary" id="go">Làm bài thử đầu tiên</button>'}
        ${p.legsActive ? `<button class="primary" id="legsResume">Tập tiếp ${p.legsActive.kind === 'pump' ? 'bài bơm máu' : 'buổi chân'} đang dở (động tác ${p.legsActive.at}/${p.legsActive.total})</button>
          <button id="go">Làm bài thử đầu tiên</button>` : ''}
        <button class="ghost" id="import">Đã có file sao lưu? Khôi phục</button>
      </div>
    </div>
    <div class="card">
      <b>Cách chương trình chạy</b>
      <ol class="steps">
        <li>Làm <b>bài thử</b>: hít tối đa một hơi, đúng tư thế.</li>
        <li>App xếp mức và lên lịch <b>3 buổi mỗi tuần</b>, mỗi buổi 5 hiệp. Hiệp cuối: buổi nhẹ và buổi vừa chừa lại 1–2 cái, buổi nặng hít hết sức.</li>
        <li>Đạt tuần thì tăng mức, hụt thì lặp lại. Cứ <b>2 tuần thử lại</b> một lần để xếp lại mức.</li>
      </ol>
    </div>
    <div class="card">
      <b>Cách đếm</b>
      <ol class="steps">
        <li>Đặt điện thoại nằm ngửa dưới đất, ngay dưới ngực.</li>
        <li><b>Camera trước</b> nhận ra mỗi lần ngực hạ xuống che máy và tính một lượt. Hình không được lưu hay gửi đi.</li>
        <li>Dự phòng: chạm mũi hoặc cằm vào màn hình cũng tính một lượt.</li>
      </ol>
      <p class="dim small">Đang chọn: ${cam ? 'camera + chạm' : 'chỉ chạm màn hình'}. Đổi ở thẻ Cài đặt. Hít chưa nổi 3 cái thì tập kiểu quỳ gối cho tới khi lên mức.</p>
    </div>
    ${otherItems(p)}
  `, { tab: 'today', keep });
  on('go', () => startWorkout('test'));
  on('legsResume', () => startLegs(p.legsActive.kind, p.legsActive));
  on('import', importData);
  bindNotices();
  bindOthers(p);
}

route('today', viewToday);

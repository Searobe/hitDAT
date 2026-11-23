// Tập chân: trang hình động tác và trình dẫn tập (xem hình → tập → nghỉ).
import { EX, FEEL, legsLevel, legsDone, describe } from './legs.js';
import { figureSvg, pauseFigure } from './figures.js';
import { makeCountdown } from './clock.js';
import { legsSteps } from './today.js';
import { db, save } from './data.js';
import { today } from './format.js';
import { run, route, show, render, stage, on, setNum, clearTimers, runCountdown, keepAwake, toggle } from './ui.js';
import { unlockAudio, beep, soundTick, soundRep, soundSetDone, soundFinish } from './sound.js';

const goHome = () => show('today');

const MUS_LABEL = { main: 'Cơ chính', extra: 'Cơ phụ', stretch: 'Kéo giãn' };
function musclesHtml(id) {
  return `<div class="mus-list">${EX[id].muscles.map(([lvl, name]) => `<span class="mus-chip ${lvl}"><i></i><b>${MUS_LABEL[lvl]}:</b> ${name}</span>`).join('')}</div>`;
}
function viewGuide() {
  const ids = ['ankle', 'calf', 'bridge', 'clam', 'squat', 'fig4', 'calf1', 'bridge1', 'split'];
  render(`
    <h1>Tập chân</h1>
    <p class="dim small">Bắp chân co bóp là cái bơm đẩy máu từ chân về tim. Mông và hông khoẻ thì đỡ bị ép khi nằm nghiêng.</p>
    <div class="card">
      ${ids.map((id, i) => `<div class="guide-ex">
        <b>${EX[id].name}</b>${i >= 6 ? ' <span class="pill">mức 3</span>' : ''}
        ${figureSvg(id, EX[id].tempo || 4)}
        ${musclesHtml(id)}
        <ul class="tight small">${EX[id].how.map((x) => `<li>${x}</li>`).join('')}</ul>
        <p class="dim small only">${EX[id].avoid}</p>
      </div>`).join('')}
    </div>
    <h2>Khi nằm nghiêng</h2>
    <div class="card">
      <ul class="tight small">
        <li>Kẹp một chiếc gối giữa hai đầu gối để hông trên không sụp xuống.</li>
        <li>Đổi bên trong đêm, đừng nằm mãi một bên.</li>
        <li>Ngồi lâu thì mỗi giờ đứng dậy đi lại hoặc gập duỗi cổ chân 20 lần.</li>
      </ul>
    </div>
    <h2>Dừng tập và đi khám khi</h2>
    <div class="card">
      <ul class="tight small">
        <li><b>Một bên chân sưng, nóng, đỏ hoặc đau bắp chân</b> — đi khám ngay trong ngày, không xoa bóp.</li>
        <li>Tê, châm chích chạy dọc chân, hoặc chân yếu đi.</li>
        <li>Mỏi không đỡ sau 2 tuần tập đều.</li>
      </ul>
      <p class="dim small last">App chỉ hướng dẫn vận động, không thay cho chẩn đoán của bác sĩ.</p>
    </div>
    <div class="btns"><button id="back">Về trang Hôm nay</button></div>
  `, { tab: 'today' });
  on('back', goHome);
}

// Trình dẫn tập: đi lần lượt qua các bước intro → work → rest, tự đếm nhịp.
export function startLegs(kind, from = null) {
  unlockAudio();
  const { level } = legsLevel(db.state.history);
  run.legs = {
    kind, level, steps: legsSteps(kind, level), paused: false, pauseWork: null,
    i: from ? from.i : 0, skipped: from ? from.skipped : 0, started: Date.now() - (from ? from.elapsed || 0 : 0),
  };
  if (!from && db.state.active) { db.state.active = null; save(); }
  run.workout = { phase: 'legs' }; // để giữ màn hình sáng khi quay lại app
  keepAwake(true);
  legsStep();
}
function legsNext() { run.legs.i += 1; legsStep(); }
// Bỏ qua cả động tác đang làm: nhảy tới bước intro kế tiếp.
function legsSkipExercise() {
  run.legs.skipped += 1;
  let j = run.legs.i + 1;
  while (j < run.legs.steps.length && run.legs.steps[j].type !== 'intro') j += 1;
  run.legs.i = j;
  legsStep();
}
function legsStep() {
  clearTimers();
  run.legs.pauseWork = null;
  if (run.legs.i >= run.legs.steps.length) return legsFinish();
  const st = run.legs.steps[run.legs.i];
  // Sang động tác mới thì ghi lại chỗ đang tập, để app bị đóng giữa chừng vẫn tập tiếp được.
  if (st.type === 'intro' && run.legs.i > 0) {
    db.state.active = { kind: run.legs.kind, date: today(), level: run.legs.level, i: run.legs.i, skipped: run.legs.skipped, elapsed: Date.now() - run.legs.started };
    save();
  }
  const total = run.legs.steps.filter((x) => x.type === 'intro').length;
  const idx = run.legs.steps.slice(0, run.legs.i + 1).filter((x) => x.type === 'intro').length;
  const top = `Động tác ${idx}/${total}`;
  if (st.type === 'intro') return legsIntro(st, top);
  if (st.type === 'rest') return legsRest(st, top);
  return legsWork(st, top);
}
function legsIntro(st, top) {
  const ex = EX[st.ex];
  const auto = !!db.state.settings.legsAuto;
  const left = st.sec;
  stage(`
    <div class="scroll">
      <h1>${ex.name}</h1>
      <p class="dim small">${describe(st)}</p>
      ${figureSvg(st.ex, ex.tempo || 4)}
      ${musclesHtml(st.ex)}
      <ul class="tight">${ex.how.map((x) => `<li>${x}</li>`).join('')}</ul>
      <p class="dim small">${ex.avoid}</p>
      <div class="card menu">${toggle('autolegs', auto, `Tự vào tập sau ${st.sec} giây`, auto ? 'Màn này tự vào tập sau vài giây, hợp khi đã quen động tác.' : 'Màn này đợi bạn bấm «Bắt đầu»; bật lên nếu đã quen động tác.')}</div>
    </div>
    <div class="btns two">
      <button id="skipex">Bỏ qua động tác</button>
      <button class="primary" id="now">${auto ? `Bắt đầu (${left})` : 'Bắt đầu'}</button>
    </div>`, { top });
  on('now', () => { beep(1320, 220); legsNext(); });
  on('skipex', legsSkipExercise);
  on('autolegs', (e) => {
    db.state.settings.legsAuto = e.target.checked;
    save();
    clearTimers();
    legsIntro(st, top);
  }, 'change');
  if (!auto) return;
  runCountdown(makeCountdown(st.sec, 1000, Date.now()), (n) => {
    if (n <= 3) soundTick(n);
    const b = document.getElementById('now');
    if (b) b.textContent = `Bắt đầu (${n})`;
  }, () => { beep(1320, 220); legsNext(); });
}
function legsWork(st, top) {
  const ex = EX[st.ex];
  const hold = ex.kind === 'hold';
  const left = st.n;
  const sideName = st.side === 1 ? 'Chân phải' : st.side === 2 ? 'Chân trái' : '';
  const lbl = [ex.name, st.sets > 1 ? `hiệp ${st.set}/${st.sets}` : '', sideName].filter(Boolean).join(' · ');
  stage(`
    <div class="pad" id="pad">
      <div class="lbl">${lbl}</div>
      ${figureSvg(st.ex, hold ? 4 : ex.tempo)}
      <div class="num mid" id="num">${left}</div>
      <div class="hint">${ex.muscles.map((m) => m[1].replace(/ \(.*\)/, '')).join(' · ')}</div>
    </div>
    <div class="btns two">
      <button id="pause">Tạm dừng</button>
      <button id="skipex">Bỏ qua động tác</button>
    </div>`, { top });
  on('skipex', legsSkipExercise);
  // Đếm lượt theo nhịp (hoặc đếm giây khi giữ) bằng giờ thật; tạm dừng thì đồng hồ đứng.
  const cd = makeCountdown(st.n, hold ? 1000 : ex.tempo * 1000, Date.now());
  const setPaused = (p) => {
    if (p === run.legs.paused) return;
    run.legs.paused = p;
    if (p) cd.pause(Date.now()); else cd.resume(Date.now());
    const b = document.getElementById('pause');
    if (b) b.textContent = p ? 'Tiếp tục' : 'Tạm dừng';
    const svg = document.querySelector('.pad svg.fig');
    if (svg) pauseFigure(svg, p);
  };
  run.legs.paused = false;
  run.legs.pauseWork = () => setPaused(true); // rời app giữa lúc đang dẫn nhịp thì tự tạm dừng
  on('pause', () => setPaused(!run.legs.paused));
  runCountdown(cd, (n) => {
    setNum(n);
    if (hold) { if (n <= 3) soundTick(n); } else soundRep(n);
  }, () => { soundSetDone(); legsNext(); });
}
function legsRest(st, top) {
  const left = st.sec;
  const nextWork = run.legs.steps.slice(run.legs.i + 1).find((x) => x.type === 'work');
  const nextEx = nextWork ? EX[nextWork.ex] : null;
  const hint = nextWork ? `Kế tiếp: ${nextEx.name}${nextWork.side === 2 ? ' · chân trái' : nextWork.sets > 1 ? ` · hiệp ${nextWork.set}/${nextWork.sets}` : ''}` : '';
  stage(`
      <div class="pad rest">
        <div class="lbl">${st.label}</div>
        <div class="num" id="num">${left}</div>
        <div class="hint">${hint}</div>
      </div>
      <div class="btns"><button id="skip">Vào luôn</button></div>`, { top });
  on('skip', () => { beep(1320, 220); legsNext(); });
  runCountdown(makeCountdown(st.sec, 1000, Date.now()), (n) => {
    if (n <= 3) soundTick(n);
    setNum(n);
  }, () => { beep(1320, 220); legsNext(); });
}
function legsFinish() {
  clearTimers();
  keepAwake(false);
  const l = run.legs;
  const totalEx = l.steps.filter((x) => x.type === 'intro').length;
  const minutes = Math.max(1, Math.round((Date.now() - l.started) / 60000));
  const counted = l.skipped < totalEx; // bỏ qua hết thì không ghi
  db.state.active = null;
  if (!counted) save();
  let entry = null;
  if (counted) {
    // Ghi ngay (chưa chọn cảm nhận thì tính như «vừa») để đóng app giữa chừng không mất buổi.
    entry = { type: l.kind, date: today(), level: l.level, minutes, skipped: l.skipped };
    db.state.history.push(entry);
    save();
    soundFinish();
  }
  run.workout = { phase: 'summary' };
  const ask = counted && l.kind === 'legs';
  const draw = () => {
    const n = legsDone(db.state.history);
    const lv = legsLevel(db.state.history);
    const verdict = !ask ? '' : !entry.feel ? ''
      : lv.level > l.level ? `Lên mức ${lv.level} từ buổi sau.`
      : lv.level < l.level ? `Hai buổi nặng liền: lùi về mức ${lv.level} để cơ kịp thích nghi.`
      : entry.feel === 'hard' ? `Giữ mức ${lv.level}, buổi này không cộng điểm.`
      : lv.level >= 3 ? 'Đang ở mức cao nhất.'
      : `Mức ${lv.level}, còn ${lv.toNext} điểm nữa lên mức ${lv.level + 1}.`;
    stage(`
      <div class="scroll">
        <h1>${counted ? (l.kind === 'pump' ? 'Xong bài bơm máu' : 'Xong buổi chân') : 'Chưa tập động tác nào'}</h1>
        <div class="card">
          <div class="dim small">Thời gian</div><div class="big">${minutes} phút</div>
          <p class="dim small last">${counted ? `Làm ${totalEx - l.skipped}/${totalEx} động tác.` : 'Buổi này không được ghi vào lịch sử.'}
          ${ask ? ` Đã tập ${n} buổi chân.` : ''}</p>
        </div>
        ${ask ? `<div class="card">
          <b>Buổi này thấy thế nào?</b>
          <p class="dim small">Nhẹ: còn dư sức nhiều. Vừa: hết hiệp vẫn làm thêm được 3–4 lượt. Nặng: phải cố mới xong, hoặc bỏ dở.</p>
          <div class="btns three">
            ${Object.entries(FEEL).map(([k, name]) => `<button data-feel="${k}" class="${entry.feel === k ? 'primary' : ''}">${name}</button>`).join('')}
          </div>
          ${verdict ? `<p class="small notice last">${verdict}</p>` : ''}
        </div>` : ''}
        <div class="card"><p class="small only">Đứng dậy đi lại một hai phút. Uống nước.</p></div>
      </div>
      <div class="btns"><button class="${ask && !entry.feel ? '' : 'primary'}" id="home">Về trang Hôm nay</button></div>`, { quit: false });
    on('home', goHome);
    document.querySelectorAll('[data-feel]').forEach((b) => b.addEventListener('click', () => {
      entry.feel = b.dataset.feel;
      save();
      draw();
    }));
  };
  draw();
}

route('guide', viewGuide);

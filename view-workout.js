// Buổi hít đất và bài thử: chuẩn bị → đếm lượt → nghỉ → tổng kết.
import { GOAL, planSession, applyTest, applySession, sessionPassed, makeRepDetector, chooseCalibration, lastSetMode } from './program.js';
import { makeCountdown } from './clock.js';
import { db, save } from './data.js';
import { today, fmtDate, setsText, DAY_NAME, lastSetAfter } from './format.js';
import { run, show, stage, on, setNum, later, clearTimers, runCountdown, keepAwake } from './ui.js';
import { camera } from './camera.js';
import { unlockAudio, beep, soundTick, soundRep, soundSetDone, soundFinish } from './sound.js';

const goHome = () => show('today');

// from = buổi đang dở (store.js) thì vào tiếp ở hiệp chưa làm.
export function startWorkout(type, from = null) {
  unlockAudio();
  const plan = type === 'session' ? planSession(db.state.T, db.state.day) : null;
  run.workout = {
    type, plan, last: type === 'session' ? lastSetMode(db.state.day) : 'max',
    set: from ? from.done.length : 0, done: from ? [...from.done] : [], count: 0, lastHit: 0,
    useCam: false, detector: null, phase: 'prep',
  };
  if (!from && db.state.active) { db.state.active = null; save(); }
  keepAwake(true);
  viewPrep();
}

async function viewPrep(note = '') {
  clearTimers();
  const w = run.workout;
  w.phase = 'prep';
  const wantCam = db.state.settings.mode === 'camera';
  const title = w.type === 'test' ? 'Bài thử sức' : `Tuần ${db.state.week} · ${DAY_NAME[db.state.day]}`;
  const desc = w.type === 'test'
    ? 'Hít liền một hơi tới khi không lên nổi nữa. Giữ lưng thẳng, ngực hạ sát máy. Hết sức thì bấm «Xong».'
    : `5 hiệp: <b>${setsText(w.plan.sets)}</b>. Số đếm lùi về 0 là xong hiệp, nghỉ ${w.plan.rest} giây rồi tự sang hiệp kế. Hiệp cuối: đủ ${w.plan.sets[4]} cái, rồi ${lastSetAfter(w.last)} và bấm «Xong».`;
  stage(`
    <div class="scroll">
      <h1>${title}</h1>
      <p>${desc}</p>
      ${w.set > 0 ? `<div class="card notice">Tập tiếp buổi đang dở: đã xong ${w.set}/5 hiệp (${w.done.join(' · ')}), vào tiếp hiệp ${w.set + 1}.</div>` : ''}
      ${note ? `<div class="card notice">${note}</div>` : ''}
      <div class="card">
        <b>${wantCam ? 'Đếm bằng camera trước' : 'Đếm bằng chạm màn hình'}</b>
        <p class="dim small">${wantCam
          ? 'Đặt máy nằm ngửa dưới ngực. Trước khi tập cần hiệu chỉnh khoảng 8 giây để máy biết tư thế cao và thấp trong ánh sáng nơi tập. Chạm màn hình vẫn tính lượt.'
          : 'Đặt máy nằm ngửa dưới mặt. Mỗi lần hạ xuống, chạm mũi hoặc cằm vào màn hình.'}</p>
      </div>
    </div>
    <div class="btns">
      ${wantCam ? `<button class="primary" id="calib">Hiệu chỉnh rồi bắt đầu</button>
        ${db.state.calib ? '<button id="reuse">Dùng hiệu chỉnh lần trước</button>' : ''}
        <button class="ghost" id="touch">Buổi này chỉ dùng chạm</button>`
      : '<button class="primary" id="touch">Bắt đầu</button>'}
    </div>
  `, { top: title });

  on('touch', () => { unlockAudio(); w.useCam = false; countdown(5, beginSet); });
  on('calib', async () => { unlockAudio(); if (await openCamera()) calibrate(); });
  on('reuse', async () => { unlockAudio(); if (await openCamera()) { w.useCam = true; countdown(5, beginSet); } });
}

async function openCamera() {
  const ok = await camera.start();
  if (!ok) {
    viewPrep('Không mở được camera (chưa cấp quyền hoặc máy không hỗ trợ). Hãy bấm «Buổi này chỉ dùng chạm», hoặc cấp quyền camera cho trang rồi thử lại.');
  }
  return ok;
}

// Đếm ngược chung: hiện số to, bíp mỗi giây, hết thì gọi done.
function countdown(sec, done, label = 'Vào tư thế chống tay') {
  clearTimers();
  stage(`<div class="pad rest"><div class="lbl">${label}</div><div class="num" id="num">${sec}</div></div>`, { quit: true });
  beep(660, 60);
  runCountdown(makeCountdown(sec, 1000, Date.now()), (left) => {
    soundTick(left);
    setNum(left);
  }, () => { beep(1320, 220); done(); });
}

// Hiệu chỉnh: đo hình ở tư thế cao rồi tư thế thấp, chọn đặc trưng tách rõ nhất.
function calibrate() {
  const w = run.workout;
  const measure = (label, then) => {
    const buf = [];
    camera.onSample = (s) => buf.push(s);
    countdown(4, () => {
      camera.onSample = null;
      // Chỉ lấy nửa sau, lúc người đã yên và camera đã ổn định độ sáng.
      const tail = buf.slice(Math.floor(buf.length / 2));
      const avg = (k) => tail.reduce((a, s) => a + s[k], 0) / Math.max(1, tail.length);
      then(tail.length ? { luma: avg('luma'), sd: avg('sd') } : null);
    }, label);
  };
  countdown(4, () => {
    measure('Giữ yên ở tư thế CAO', (up) => {
      measure('Hạ ngực sát máy, giữ yên', (down) => {
        const c = up && down ? chooseCalibration(up, down) : null;
        if (!c) {
          camera.stop();
          db.state.calib = null; save();
          viewPrep('Camera không phân biệt được tư thế cao và thấp ở chỗ này (thiếu sáng, hoặc máy đặt lệch khỏi ngực). Hãy chỉnh lại chỗ đặt máy rồi hiệu chỉnh lại, hoặc dùng chạm cho buổi này.');
          return;
        }
        db.state.calib = { feature: c.feature, up: c.up, down: c.down }; save();
        w.useCam = true;
        countdown(5, beginSet, 'Hiệu chỉnh xong. Về tư thế cao');
      });
    });
  }, 'Chuẩn bị hiệu chỉnh: chống tay phía trên máy');
}

function target() {
  const w = run.workout;
  return w.type === 'test' ? null : w.plan.sets[w.set];
}
const isOpenSet = () => run.workout.type === 'test' || run.workout.set === run.workout.plan.sets.length - 1;

function beginSet() {
  clearTimers();
  const w = run.workout;
  w.phase = 'set';
  w.count = 0;
  w.lastHit = 0;
  if (w.useCam && db.state.calib) {
    const c = db.state.calib;
    w.detector = makeRepDetector();
    let ema = null;
    camera.onSample = (s) => {
      const v = s[c.feature];
      ema = ema == null ? v : ema * 0.5 + v * 0.5;
      const norm = (ema - c.down) / (c.up - c.down);
      const hit = w.detector.feed(norm);
      const dot = document.getElementById('dot');
      if (dot) dot.className = w.detector.down ? 'down' : 'up';
      if (hit) rep();
    };
  }
  drawSet();
}

// Con số và dòng chữ của màn đếm theo số lượt đã hít.
function setView() {
  const w = run.workout;
  const tgt = target();
  if (w.type === 'test') return { num: w.count, cls: '', lbl: 'Bài thử: hít tối đa' };
  if (w.count < tgt) {
    return { num: tgt - w.count, cls: '', lbl: isOpenSet() ? `Hiệp cuối: ít nhất ${tgt}, rồi ${lastSetAfter(w.last)}` : `Hiệp ${w.set + 1}/5` };
  }
  return { num: `+${w.count - tgt}`, cls: 'plus', lbl: `Đã đủ ${tgt}. ${w.last === 'max' ? 'Hít tiếp tới hết sức' : 'Dừng khi còn hít được 1–2 cái nữa'}` };
}
// Mỗi lượt chỉ đổi con số và dòng chữ; vùng chạm giữ nguyên nên chạm liên tiếp không bị mất.
function updateSet() {
  const { num, cls, lbl } = setView();
  const n = document.getElementById('num');
  if (n) { n.textContent = num; n.className = `num ${cls}`; }
  const l = document.getElementById('lbl');
  if (l) l.textContent = lbl;
}
function drawSet() {
  const w = run.workout;
  const open = isOpenSet();
  const { num, cls, lbl } = setView();
  const top = w.type === 'test' ? 'Bài thử sức' : `Hiệp ${w.set + 1}/5 · ${setsText(w.plan.sets)}`;
  stage(`
    <div class="pad" id="pad">
      <div class="lbl" id="lbl">${lbl}</div>
      <div class="num ${cls}" id="num">${num}</div>
      <div class="hint">${w.useCam ? 'Hạ ngực che máy, hoặc chạm vào đây' : 'Chạm mũi hoặc cằm vào đây mỗi lần hạ xuống'}</div>
    </div>
    <div class="row">
      ${w.useCam ? '<span class="sig"><i id="dot" class="up"></i>camera</span>' : '<span></span>'}
      <button id="undo" class="ghost auto">− Bớt 1</button>
    </div>
    <div class="btns">
      <button id="finish" class="${open ? 'primary' : ''}">${open ? 'Xong' : 'Hết sức, dừng hiệp sớm'}</button>
    </div>
  `, { top });
  const pad = document.getElementById('pad');
  pad.addEventListener('pointerdown', (e) => { e.preventDefault(); rep(); });
  on('finish', finishSet);
  on('undo', () => { if (w.count > 0) { w.count -= 1; updateSet(); } });
}

// Một lượt hít. Camera và chạm dùng chung khoảng chặn 400 ms để không đếm đôi.
function rep() {
  const w = run.workout;
  if (!w || w.phase !== 'set') return;
  const now = performance.now();
  if (now - w.lastHit < 400) return;
  w.lastHit = now;
  w.count += 1;
  const tgt = target();
  if (tgt && w.count === tgt) soundSetDone(); // số về 0: đủ hiệp
  else soundRep(tgt ? (w.count < tgt ? tgt - w.count : w.count - tgt) : w.count);
  if (tgt && !isOpenSet() && w.count >= tgt) { finishSet(); return; }
  updateSet();
  const pad = document.getElementById('pad');
  if (!pad) return;
  pad.classList.add('hit');
  later(() => pad.classList.remove('hit'), 120);
}

function finishSet() {
  const w = run.workout;
  if (w.phase !== 'set') return;
  w.phase = 'between';
  camera.onSample = null;
  w.done.push(w.count);
  if (w.type === 'test') return finishWorkout();
  w.set += 1;
  if (w.set >= w.plan.sets.length) return finishWorkout();
  // Xong mỗi hiệp thì ghi lại, để app bị đóng giữa buổi vẫn tập tiếp được từ hiệp kế.
  db.state.active = { kind: 'push', date: today(), T: db.state.T, day: db.state.day, done: [...w.done] };
  save();
  rest(w.plan.rest);
}

function rest(sec) {
  clearTimers();
  const w = run.workout;
  w.phase = 'rest';
  const cd = makeCountdown(sec, 1000, Date.now());
  stage(`
      <div class="pad rest">
        <div class="lbl">Nghỉ. Vừa xong: ${w.done.at(-1)} cái</div>
        <div class="num" id="num">${sec}</div>
        <div class="hint">Hiệp kế (${w.set + 1}/5): <b>${w.plan.sets[w.set]}${w.set === 4 ? '+' : ''}</b> cái</div>
      </div>
      <div class="btns two">
        <button id="more">+30 giây</button>
        <button id="skip">Vào hiệp luôn</button>
      </div>`, { top: `Đã xong ${w.set}/5 hiệp` });
  on('more', () => { cd.add(30); setNum(cd.left(Date.now())); });
  on('skip', () => { clearTimers(); beep(1320, 220); beginSet(); });
  runCountdown(cd, (left) => {
    // Sắp hết giờ nghỉ: hai tiếng bíp báo trước ở giây 10, rồi đếm ngược 5 giây cuối.
    if (left === 10) { beep(660, 120); beep(660, 120, 0.5, 200); }
    if (left <= 5) soundTick(left);
    setNum(left);
  }, () => { beep(1320, 220); beginSet(); });
}

function finishWorkout() {
  clearTimers();
  camera.stop();
  keepAwake(false);
  const w = run.workout;
  w.phase = 'summary';
  soundFinish();
  const before = db.state.T;
  const wasAchieved = db.state.achieved;
  let body;
  if (w.type === 'test') {
    const n = w.done[0];
    db.state = applyTest(db.state, n, today());
    db.state.active = null;
    save();
    const reached = n >= GOAL;
    body = `
      <h1>${reached ? '🏆 Về đích!' : 'Kết quả bài thử'}</h1>
      <div class="card"><div class="dim small">Một hơi</div><div class="big">${n}</div>
        <p class="dim small last">${reached
          ? `Bạn đã hít ${n} cái một hơi${wasAchieved ? '' : ' — đạt mục tiêu ' + GOAL}.`
          : n < 3 ? 'Mức tập đặt ở 3. Nếu chưa lên nổi, tập kiểu quỳ gối trong các buổi tới.'
          : `Mức tập mới: ${db.state.T}${before != null ? ` (trước đó ${before})` : ''}.`}</p></div>
      <div class="card"><b>Buổi kế: ${fmtDate(db.state.nextDate)}</b>
        <div class="sets">${planSession(db.state.T, 0).sets.map((x, i) => `<span>${x}${i === 4 ? '+' : ''}</span>`).join('')}</div>
        <p class="dim small last">Nghỉ trọn ít nhất 1 ngày trước khi tập.</p></div>`;
  } else {
    const plan = w.plan.sets;
    const passed = sessionPassed(plan, w.done);
    const lastOfWeek = db.state.day === 2;
    db.state = applySession(db.state, w.done, today());
    db.state.active = null;
    save();
    const total = w.done.reduce((a, b) => a + b, 0);
    let verdict = passed ? 'Đạt đủ cả 5 hiệp.' : 'Buổi này hụt so với kế hoạch — không sao, tuần cần đạt 2 trong 3 buổi.';
    if (lastOfWeek) {
      verdict += db.state.T > before ? ` Hết tuần: mức tập tăng từ ${before} lên ${db.state.T}.`
        : db.state.T < before ? ` Hết tuần: hụt hai tuần liền nên lùi mức từ ${before} về ${db.state.T} để lấy lại đà.`
        : ' Hết tuần: chưa đạt nên tuần tới lặp lại mức này.';
    }
    body = `
      <h1>Xong buổi tập</h1>
      <div class="card">
        <div class="row"><div><div class="dim small">Tổng</div><div class="big">${total}</div></div>
          <span class="pill ${passed ? 'ok' : 'bad'}">${passed ? 'Đạt' : 'Hụt'}</span></div>
        <div class="sets">${w.done.map((n, i) => `<span class="${n >= plan[i] ? 'done' : 'miss'}">${n}</span>`).join('')}</div>
        <p class="dim small">Kế hoạch: ${setsText(plan)}</p>
        <p class="small last">${verdict}</p>
      </div>
      <div class="card"><b>Buổi kế: ${fmtDate(db.state.nextDate)}</b>
        <p class="dim small last">${db.state.pending === 'test' ? 'Bài thử sức để xếp lại mức.' : `${DAY_NAME[db.state.day]}: ${setsText(planSession(db.state.T, db.state.day).sets)}`}</p></div>`;
  }
  stage(`<div class="scroll">${body}</div><div class="btns"><button class="primary" id="home">Về trang Hôm nay</button></div>`, { quit: false });
  on('home', goHome);
}

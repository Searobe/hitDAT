// Giao diện + cảm biến. Luật chương trình tập nằm ở program.js.
import {
  GOAL, initialState, planSession, applyTest, applySession, upcoming,
  sessionPassed, makeRepDetector, chooseCalibration,
} from './program.js';
import {
  EX, FEEL, legsLevel, legsPlan, pumpPlan, buildSteps, estimateMinutes, legsDone, doneOn, describe,
} from './legs.js';
import { figureSvg, startFigures, pauseFigure } from './figures.js';

const KEY = 'hitdat.v1';
const $app = document.getElementById('app');
const $cam = document.getElementById('cam');

// ---------- Lưu trữ ----------
function load() {
  try {
    const s = JSON.parse(localStorage.getItem(KEY));
    if (s && s.v === 1) return { ...initialState(), ...s, settings: { ...initialState().settings, ...s.settings } };
  } catch {}
  return initialState();
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
}
let state = load();

// ---------- Tiện ích ----------
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const THU = ['Chủ nhật', 'Thứ hai', 'Thứ ba', 'Thứ tư', 'Thứ năm', 'Thứ sáu', 'Thứ bảy'];
function fmtDate(ds) {
  if (!ds) return '';
  const t = today();
  if (ds <= t) return 'Hôm nay';
  const [y, m, d] = ds.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return `${THU[dt.getDay()]} ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}`;
}
function fmtPast(ds) {
  const [, m, d] = ds.split('-');
  return `${d}/${m}`;
}
const setsText = (sets) => sets.map((n, i) => (i === sets.length - 1 ? `${n}+` : n)).join(' · ');
const DAY_NAME = ['Buổi nhẹ', 'Buổi vừa', 'Buổi nặng'];

// ---------- Âm thanh ----------
let actx = null;
function unlockAudio() {
  try {
    // iOS: mặc định âm thanh web bị tắt theo cần gạt im lặng; kiểu «playback» cho kêu như app nghe nhạc.
    if (navigator.audioSession) navigator.audioSession.type = 'playback';
  } catch {}
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
  } catch {}
  try {
    // Mở khoá giọng đọc ngay trong lần chạm của người dùng (iOS chỉ cho đọc sau một lần chạm).
    if (state.settings.count === 'voice' && window.speechSynthesis) {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      speechSynthesis.speak(u);
    }
  } catch {}
}
// Một nốt: tần số, độ dài (ms), âm lượng, trễ bao lâu mới kêu (ms).
function beep(freq = 880, ms = 110, vol = 0.5, delay = 0) {
  if (!state.settings.sound || !actx) return;
  try {
    const t0 = actx.currentTime + delay / 1000;
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + ms / 1000);
    o.connect(g).connect(actx.destination);
    o.start(t0);
    o.stop(t0 + ms / 1000 + 0.02);
  } catch {}
}
function melody(notes) {
  let at = 0;
  for (const [freq, ms] of notes) { beep(freq, ms + 120, 0.5, at); at += ms; }
}
const soundSetDone = () => melody([[784, 110], [1047, 110], [1319, 260]]); // xong một hiệp
const soundFinish = () => melody([[523, 140], [659, 140], [784, 140], [1047, 280], [784, 140], [1047, 520]]); // xong cả bài
function say(n) {
  try {
    if (!window.speechSynthesis) return false;
    speechSynthesis.cancel(); // hít nhanh thì bỏ số đang đọc dở, đọc số mới
    const u = new SpeechSynthesisUtterance(String(n));
    u.lang = 'vi-VN';
    u.rate = 1.25;
    speechSynthesis.speak(u);
    return true;
  } catch { return false; }
}
// Đếm ngược từng giây: đọc số nếu chọn giọng đọc, không thì bíp.
function soundTick(left) {
  if (!state.settings.sound) return;
  if (state.settings.count === 'voice' && say(left)) return;
  beep(660, 120);
}
// Âm báo mỗi lượt: bíp, hoặc đọc con số đang hiện trên màn hình.
function soundRep(shown) {
  if (!state.settings.sound) return;
  if (state.settings.count === 'voice' && say(shown)) return;
  beep(880);
}

// ---------- Giữ màn hình sáng ----------
let wake = null;
async function keepAwake(on) {
  try {
    if (on && navigator.wakeLock) wake = await navigator.wakeLock.request('screen');
    if (!on && wake) { await wake.release(); wake = null; }
  } catch {}
}

// ---------- Camera làm cảm biến ----------
// Hình chỉ được đọc tại chỗ để lấy độ sáng trung bình và độ tương phản; không lưu, không gửi đi đâu.
const camera = {
  stream: null, timer: null, canvas: null, ctx: null, onSample: null,
  async start() {
    if (this.stream) return true;
    if (!navigator.mediaDevices?.getUserMedia) return false;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } }, audio: false,
      });
      $cam.srcObject = this.stream;
      await $cam.play().catch(() => {});
      this.canvas = document.createElement('canvas');
      this.canvas.width = 32; this.canvas.height = 24;
      this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
      this.timer = setInterval(() => this.sample(), 60);
      return true;
    } catch {
      this.stop();
      return false;
    }
  },
  sample() {
    if (!this.onSample || $cam.readyState < 2) return;
    this.ctx.drawImage($cam, 0, 0, 32, 24);
    const px = this.ctx.getImageData(0, 0, 32, 24).data;
    let sum = 0, sq = 0;
    const n = px.length / 4;
    for (let i = 0; i < px.length; i += 4) {
      const y = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
      sum += y; sq += y * y;
    }
    const luma = sum / n;
    const sd = Math.sqrt(Math.max(0, sq / n - luma * luma));
    this.onSample({ luma, sd });
  },
  stop() {
    clearInterval(this.timer); this.timer = null; this.onSample = null;
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
    this.stream = null; $cam.srcObject = null;
  },
};

// ---------- Trang chính ----------
const CREDIT = '<footer class="credit">Made by Searobe · © 2026</footer>';
function render(html) {
  $app.innerHTML = html;
  window.scrollTo(0, 0);
  startFigures($app);
}
function on(id, fn) {
  const el = document.getElementById(id);
  if (el) el.addEventListener('click', fn);
}

function viewHome() {
  workout = null;
  if (state.T == null) return viewWelcome();
  const tests = state.history.filter((h) => h.type === 'test');
  const sessions = state.history.filter((h) => h.type === 'session');
  const best = Math.max(0, ...tests.map((t) => t.count));
  const lastTest = tests.at(-1);
  const total = sessions.reduce((a, s) => a + s.total, 0) + tests.reduce((a, t) => a + t.count, 0);
  const up = upcoming(state);
  const next = up[0];
  const early = state.nextDate && today() < state.nextDate;

  let nextCard;
  if (next.type === 'test') {
    nextCard = `
      <div class="row"><b>Bài thử sức</b><span class="pill now">${fmtDate(next.date)}</span></div>
      <p class="dim small">Hít tối đa một hơi để xếp lại mức tập. Đủ ${GOAL} cái là về đích.</p>`;
  } else {
    nextCard = `
      <div class="row"><b>Tuần ${state.week} · ${DAY_NAME[next.day]}</b><span class="pill now">${fmtDate(next.date)}</span></div>
      <div class="sets">${next.sets.map((n, i) => `<span>${n}${i === 4 ? '+' : ''}</span>`).join('')}</div>
      <p class="dim small">5 hiệp, nghỉ ${next.rest} giây giữa hiệp. Hiệp cuối hít tối đa, ít nhất ${next.sets[4]} cái.</p>`;
  }

  render(`
    <h1>Hít Đất 100</h1>
    <p class="dim small">${state.achieved ? '🏆 Bạn đã hít được ' + GOAL + ' cái một hơi. Tập tiếp để giữ phong độ.' : 'Mục tiêu: ' + GOAL + ' cái một hơi.'}</p>

    <div class="card">
      <div class="row">
        <div><div class="dim small">Một hơi tốt nhất</div><div class="big">${best}</div></div>
        <div style="text-align:right"><div class="dim small">Mức đang tập</div><div class="big">${state.T}</div></div>
      </div>
      <div class="bar"><i style="width:${Math.min(100, (best / GOAL) * 100)}%"></i></div>
      <p class="dim small" style="margin-bottom:0">Đã hít tổng cộng ${total} cái qua ${sessions.length} buổi tập và ${tests.length} bài thử.</p>
    </div>

    <h2>Buổi kế</h2>
    <div class="card">
      ${nextCard}
      ${early ? `<p class="small" style="color:var(--accent)">Cơ cần nghỉ ít nhất 1 ngày. Nên tập vào ${fmtDate(state.nextDate).toLowerCase()}.</p>` : ''}
      <div class="btns">
        <button class="${early ? '' : 'primary'}" id="go">${early ? 'Vẫn tập hôm nay' : next.type === 'test' ? 'Làm bài thử' : 'Bắt đầu buổi tập'}</button>
      </div>
    </div>

    ${legsCard(early)}

    ${up.length > 1 ? `
    <h2>Lịch sắp tới</h2>
    <div class="card list">
      ${up.slice(1).map((u) => `
        <div>
          <div class="row"><span>${u.type === 'test' ? 'Bài thử sức' : DAY_NAME[u.day]}</span><span class="dim small">${fmtDate(u.date)}</span></div>
          ${u.type === 'session' ? `<div class="dim small">${setsText(u.sets)}</div>` : ''}
        </div>`).join('')}
    </div>` : ''}

    ${tests.length ? `<h2>Tiến bộ qua các bài thử</h2><div class="card">${chart(tests)}</div>` : ''}

    <h2>Lịch sử</h2>
    <div class="card list">
      ${state.history.slice().reverse().slice(0, 12).map(historyRow).join('')}
    </div>

    <h2>Cài đặt</h2>
    <div class="card">
      <div class="btns">
        <button id="mode">Cách đếm: ${state.settings.mode === 'camera' ? 'Camera + chạm' : 'Chỉ chạm màn hình'}</button>
        <button id="sound">Âm thanh: ${state.settings.sound ? 'Bật' : 'Tắt'}</button>
        <button id="count">Mỗi lượt hít: ${state.settings.count === 'voice' ? 'Đọc số' : 'Tiếng bíp'}</button>
        <button id="retest">Làm bài thử lại ngay</button>
        <button id="export">Sao lưu dữ liệu</button>
        <button id="reset" class="ghost danger">Xoá hết, làm lại từ đầu</button>
      </div>
    </div>
    ${CREDIT}
  `);

  on('go', () => startWorkout(next.type));
  bindLegs();
  on('retest', () => startWorkout('test'));
  on('mode', () => { state.settings.mode = state.settings.mode === 'camera' ? 'touch' : 'camera'; save(); viewHome(); });
  on('sound', () => { state.settings.sound = !state.settings.sound; save(); unlockAudio(); beep(880); viewHome(); });
  on('count', () => {
    state.settings.count = state.settings.count === 'voice' ? 'beep' : 'voice';
    save(); unlockAudio();
    if (state.settings.count === 'voice') say(3); else beep(880);
    viewHome();
  });
  on('export', exportData);
  on('reset', () => {
    if (confirm('Xoá toàn bộ lịch sử và bắt đầu lại từ bài thử đầu tiên?')) {
      state = initialState(); save(); viewHome();
    }
  });
}

function historyRow(h) {
  if (h.type === 'legs' || h.type === 'pump') {
    return `<div><div class="row"><span>${h.type === 'legs' ? 'Buổi chân · mức ' + h.level : 'Bơm máu bắp chân'}</span><span class="dim small">${fmtPast(h.date)}</span></div>
      <div class="dim small">${h.minutes} phút${h.skipped ? ' · bỏ qua ' + h.skipped + ' động tác' : ''}${h.feel ? ' · ' + FEEL[h.feel].toLowerCase() : ''}</div></div>`;
  }
  if (h.type === 'test') {
    return `<div><div class="row"><span>Bài thử sức</span><span class="dim small">${fmtPast(h.date)}</span></div>
      <div class="small"><b>${h.count}</b> cái một hơi</div></div>`;
  }
  return `<div>
    <div class="row"><span>Tuần ${h.week} · ${DAY_NAME[h.day]}</span>
      <span><span class="pill ${h.passed ? 'ok' : 'bad'}">${h.passed ? 'Đạt' : 'Hụt'}</span> <span class="dim small">${fmtPast(h.date)}</span></span></div>
    <div class="dim small">${h.done.join(' · ')} — tổng ${h.total}</div>
  </div>`;
}

function chart(tests) {
  const W = 320, H = 150, L = 28, R = 10, T = 10, B = 22;
  const max = Math.max(GOAL, ...tests.map((t) => t.count));
  const x = (i) => (tests.length === 1 ? (L + W - R) / 2 : L + (i * (W - L - R)) / (tests.length - 1));
  const y = (v) => T + (1 - v / max) * (H - T - B);
  const pts = tests.map((t, i) => `${x(i).toFixed(1)},${y(t.count).toFixed(1)}`).join(' ');
  const step = Math.max(1, Math.ceil(tests.length / 6));
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Kết quả các bài thử">
    <line x1="${L}" x2="${W - R}" y1="${y(GOAL)}" y2="${y(GOAL)}" stroke="#35c66b" stroke-dasharray="4 4"/>
    <text x="${L - 4}" y="${y(GOAL) + 4}" text-anchor="end">${GOAL}</text>
    <line x1="${L}" x2="${W - R}" y1="${y(0)}" y2="${y(0)}" stroke="#2c3036"/>
    <text x="${L - 4}" y="${y(0) + 4}" text-anchor="end">0</text>
    <polyline points="${pts}" fill="none" stroke="#ff7a1a" stroke-width="2.5" stroke-linejoin="round"/>
    ${tests.map((t, i) => `<circle cx="${x(i)}" cy="${y(t.count)}" r="4" fill="#ff7a1a"/>
      ${i % step === 0 || i === tests.length - 1 ? `<text x="${x(i)}" y="${y(t.count) - 8}" text-anchor="middle" style="fill:#f2f3f5">${t.count}</text>
      <text x="${x(i)}" y="${H - 6}" text-anchor="middle">${fmtPast(t.date)}</text>` : ''}`).join('')}
  </svg>`;
}

function exportData() {
  const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `hit-dat-${today()}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

function viewWelcome() {
  render(`
    <h1>Hít Đất 100</h1>
    <p class="dim">Từ mức hiện tại của bạn tới 100 cái một hơi.</p>
    <div class="card">
      <b>Cách chương trình chạy</b>
      <ol class="steps">
        <li>Làm <b>bài thử</b>: hít tối đa một hơi, đúng tư thế.</li>
        <li>App xếp mức và lên lịch <b>3 buổi mỗi tuần</b>, mỗi buổi 5 hiệp, hiệp cuối hít tối đa.</li>
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
      <p class="dim small">Hít chưa nổi 3 cái thì tập kiểu quỳ gối cho tới khi lên mức.</p>
    </div>
    <div class="btns">
      <button class="primary" id="go">Làm bài thử đầu tiên</button>
      <button id="mode">Cách đếm: ${state.settings.mode === 'camera' ? 'Camera + chạm' : 'Chỉ chạm màn hình'}</button>
    </div>
    ${legsCard(true)}
    ${CREDIT}
  `);
  on('go', () => startWorkout('test'));
  bindLegs();
  on('mode', () => { state.settings.mode = state.settings.mode === 'camera' ? 'touch' : 'camera'; save(); viewWelcome(); });
}

// ---------- Tập chân ----------
function legsCard(pushupRestDay) {
  const t = today();
  const n = legsDone(state.history);
  const { level, toNext } = legsLevel(state.history);
  const plan = legsPlan(level);
  const mins = estimateMinutes(buildSteps(plan));
  const legsToday = doneOn(state.history, 'legs', t);
  const pumpToday = doneOn(state.history, 'pump', t);
  const note = legsToday ? 'Đã tập chân hôm nay ✓'
    : pushupRestDay ? 'Hôm nay nghỉ hít đất — hợp để tập chân.'
    : 'Hôm nay là ngày hít đất; buổi chân nên để ngày nghỉ.';
  const primary = pushupRestDay && !legsToday;
  return `
    <h2>Tập chân</h2>
    <div class="card">
      <div class="row"><b>Buổi chân · mức ${level}</b><span class="pill">${mins} phút</span></div>
      <p class="dim small">${plan.map((i) => `${EX[i.ex].name} ${describe(i)}`).join(' · ')}</p>
      <p class="small" style="color:var(--accent)">${note}</p>
      <div class="btns">
        <button id="legs" class="${primary ? 'primary' : ''}">Bắt đầu buổi chân</button>
        <button id="pump">${pumpToday ? '✓ Đã bơm máu hôm nay — làm lần nữa' : 'Bơm máu bắp chân 2 phút (mỗi ngày)'}</button>
        <button id="guide" class="ghost">Xem hình động tác và lưu ý</button>
      </div>
      <p class="dim small" style="margin-bottom:0">Đã tập ${n} buổi chân. ${level >= 3 ? 'Đang ở mức cao nhất.' : `Còn ${toNext} điểm nữa lên mức ${level + 1}.`} Cuối buổi chọn nhẹ / vừa / nặng: nhẹ +2 điểm, vừa +1, nặng giữ mức; hai buổi nặng liền thì lùi một mức.</p>
    </div>`;
}
function bindLegs() {
  on('legs', () => startLegs('legs'));
  on('pump', () => startLegs('pump'));
  on('guide', viewGuide);
}

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
        <p class="dim small" style="margin:0">${EX[id].avoid}</p>
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
      <p class="dim small" style="margin-bottom:0">App chỉ hướng dẫn vận động, không thay cho chẩn đoán của bác sĩ.</p>
    </div>
    <div class="btns"><button id="back">Về trang chính</button></div>
    ${CREDIT}
  `);
  on('back', viewHome);
}

// Trình dẫn tập: đi lần lượt qua các bước intro → work → rest, tự đếm nhịp.
let legs = null;
function startLegs(kind) {
  unlockAudio();
  const { level } = legsLevel(state.history);
  const plan = kind === 'pump' ? pumpPlan() : legsPlan(level);
  legs = { kind, level, steps: buildSteps(plan, kind === 'pump' ? 10 : undefined), i: 0, started: Date.now(), skipped: 0, paused: false };
  workout = { phase: 'legs' }; // để giữ màn hình sáng khi quay lại app
  keepAwake(true);
  legsStep();
}
function legsNext() { legs.i += 1; legsStep(); }
// Bỏ qua cả động tác đang làm: nhảy tới bước intro kế tiếp.
function legsSkipExercise() {
  legs.skipped += 1;
  let j = legs.i + 1;
  while (j < legs.steps.length && legs.steps[j].type !== 'intro') j += 1;
  legs.i = j;
  legsStep();
}
function legsStep() {
  clearTimers();
  if (legs.i >= legs.steps.length) return legsFinish();
  const st = legs.steps[legs.i];
  const total = legs.steps.filter((x) => x.type === 'intro').length;
  const idx = legs.steps.slice(0, legs.i + 1).filter((x) => x.type === 'intro').length;
  const top = `Động tác ${idx}/${total}`;
  if (st.type === 'intro') return legsIntro(st, top);
  if (st.type === 'rest') return legsRest(st, top);
  return legsWork(st, top);
}
function legsIntro(st, top) {
  const ex = EX[st.ex];
  let left = st.sec;
  const draw = () => {
    stage(`
      <div style="flex:1;overflow:auto">
        <h1>${ex.name}</h1>
        <p class="dim small">${describe(st)}</p>
        ${figureSvg(st.ex, ex.tempo || 4)}
        ${musclesHtml(st.ex)}
        <ul class="tight">${ex.how.map((x) => `<li>${x}</li>`).join('')}</ul>
        <p class="dim small">${ex.avoid}</p>
      </div>
      <div class="btns two">
        <button id="skipex">Bỏ qua động tác</button>
        <button class="primary" id="now">Bắt đầu (${left})</button>
      </div>`, { top });
    on('now', () => { beep(1320, 220); legsNext(); });
    on('skipex', legsSkipExercise);
  };
  draw();
  every(() => {
    left -= 1;
    if (left <= 0) { beep(1320, 220); legsNext(); return; }
    if (left <= 3) soundTick(left);
    const b = document.getElementById('now');
    if (b) b.textContent = `Bắt đầu (${left})`;
  }, 1000);
}
function legsWork(st, top) {
  const ex = EX[st.ex];
  const hold = ex.kind === 'hold';
  let left = st.n;
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
  on('pause', () => {
    legs.paused = !legs.paused;
    document.getElementById('pause').textContent = legs.paused ? 'Tiếp tục' : 'Tạm dừng';
    const svg = document.querySelector('.pad svg.fig');
    if (svg) pauseFigure(svg, legs.paused);
  });
  legs.paused = false;
  every(() => {
    if (legs.paused) return;
    left -= 1;
    const num = document.getElementById('num');
    if (num) num.textContent = Math.max(0, left);
    if (left <= 0) { soundSetDone(); legsNext(); return; }
    if (hold) { if (left <= 3) soundTick(left); } else soundRep(left);
  }, hold ? 1000 : ex.tempo * 1000);
}
function legsRest(st, top) {
  let left = st.sec;
  const nextWork = legs.steps.slice(legs.i + 1).find((x) => x.type === 'work');
  const nextEx = nextWork ? EX[nextWork.ex] : null;
  const hint = nextWork ? `Kế tiếp: ${nextEx.name}${nextWork.side === 2 ? ' · chân trái' : nextWork.sets > 1 ? ` · hiệp ${nextWork.set}/${nextWork.sets}` : ''}` : '';
  const draw = () => {
    stage(`
      <div class="pad rest">
        <div class="lbl">${st.label}</div>
        <div class="num">${left}</div>
        <div class="hint">${hint}</div>
      </div>
      <div class="btns"><button id="skip">Vào luôn</button></div>`, { top });
    on('skip', () => { beep(1320, 220); legsNext(); });
  };
  draw();
  every(() => {
    left -= 1;
    if (left <= 0) { beep(1320, 220); legsNext(); return; }
    if (left <= 3) soundTick(left);
    draw();
  }, 1000);
}
function legsFinish() {
  clearTimers();
  keepAwake(false);
  const l = legs;
  const totalEx = l.steps.filter((x) => x.type === 'intro').length;
  const minutes = Math.max(1, Math.round((Date.now() - l.started) / 60000));
  const counted = l.skipped < totalEx; // bỏ qua hết thì không ghi
  let entry = null;
  if (counted) {
    // Ghi ngay (chưa chọn cảm nhận thì tính như «vừa») để đóng app giữa chừng không mất buổi.
    entry = { type: l.kind, date: today(), level: l.level, minutes, skipped: l.skipped };
    state.history.push(entry);
    save();
    soundFinish();
  }
  workout = { phase: 'summary' };
  const ask = counted && l.kind === 'legs';
  const draw = () => {
    const n = legsDone(state.history);
    const lv = legsLevel(state.history);
    const verdict = !ask ? '' : !entry.feel ? ''
      : lv.level > l.level ? `Lên mức ${lv.level} từ buổi sau.`
      : lv.level < l.level ? `Hai buổi nặng liền: lùi về mức ${lv.level} để cơ kịp thích nghi.`
      : entry.feel === 'hard' ? `Giữ mức ${lv.level}, buổi này không cộng điểm.`
      : lv.level >= 3 ? 'Đang ở mức cao nhất.'
      : `Mức ${lv.level}, còn ${lv.toNext} điểm nữa lên mức ${lv.level + 1}.`;
    stage(`
      <div style="flex:1;overflow:auto">
        <h1>${counted ? (l.kind === 'pump' ? 'Xong bài bơm máu' : 'Xong buổi chân') : 'Chưa tập động tác nào'}</h1>
        <div class="card">
          <div class="dim small">Thời gian</div><div class="big">${minutes} phút</div>
          <p class="dim small" style="margin-bottom:0">${counted ? `Làm ${totalEx - l.skipped}/${totalEx} động tác.` : 'Buổi này không được ghi vào lịch sử.'}
          ${ask ? ` Đã tập ${n} buổi chân.` : ''}</p>
        </div>
        ${ask ? `<div class="card">
          <b>Buổi này thấy thế nào?</b>
          <p class="dim small">Nhẹ: còn dư sức nhiều. Vừa: hết hiệp vẫn làm thêm được 3–4 lượt. Nặng: phải cố mới xong, hoặc bỏ dở.</p>
          <div class="btns three">
            ${Object.entries(FEEL).map(([k, name]) => `<button data-feel="${k}" class="${entry.feel === k ? 'primary' : ''}">${name}</button>`).join('')}
          </div>
          ${verdict ? `<p class="small" style="color:var(--accent);margin-bottom:0">${verdict}</p>` : ''}
        </div>` : ''}
        <div class="card"><p class="small" style="margin:0">Đứng dậy đi lại một hai phút. Uống nước.</p></div>
      </div>
      <div class="btns"><button class="${ask && !entry.feel ? '' : 'primary'}" id="home">Về trang chính</button></div>`, { quit: false });
    on('home', viewHome);
    document.querySelectorAll('[data-feel]').forEach((b) => b.addEventListener('click', () => {
      entry.feel = b.dataset.feel;
      save();
      draw();
    }));
  };
  draw();
}

// ---------- Buổi tập / bài thử ----------
let workout = null;
const timers = new Set();
function later(fn, ms) { const t = setTimeout(() => { timers.delete(t); fn(); }, ms); timers.add(t); return t; }
function every(fn, ms) { const t = setInterval(fn, ms); timers.add(t); return t; }
function clearTimers() { timers.forEach((t) => { clearTimeout(t); clearInterval(t); }); timers.clear(); }

function startWorkout(type) {
  unlockAudio();
  const plan = type === 'session' ? planSession(state.T, state.day) : null;
  workout = {
    type, plan,
    set: 0, done: [], count: 0, lastHit: 0,
    useCam: false, detector: null, phase: 'prep',
  };
  keepAwake(true);
  viewPrep();
}

function endWorkout() {
  clearTimers();
  camera.stop();
  keepAwake(false);
  viewHome();
}

function stage(inner, { quit = true, top = '' } = {}) {
  $app.innerHTML = `<div class="stage">
    <div class="top">${quit ? '<button id="quit" class="ghost">✕ Thoát</button>' : '<span></span>'}<span class="dim small">${top}</span></div>
    ${inner}
  </div>`;
  startFigures($app);
  on('quit', () => { if (confirm('Thoát buổi này? Kết quả dở dang sẽ không được ghi.')) endWorkout(); });
}

async function viewPrep(note = '') {
  clearTimers();
  const w = workout;
  w.phase = 'prep';
  const wantCam = state.settings.mode === 'camera';
  const title = w.type === 'test' ? 'Bài thử sức' : `Tuần ${state.week} · ${DAY_NAME[state.day]}`;
  const desc = w.type === 'test'
    ? 'Hít liền một hơi tới khi không lên nổi nữa. Giữ lưng thẳng, ngực hạ sát máy. Hết sức thì bấm «Xong».'
    : `5 hiệp: <b>${setsText(w.plan.sets)}</b>. Số đếm lùi về 0 là xong hiệp, nghỉ ${w.plan.rest} giây rồi tự sang hiệp kế. Hiệp cuối hít tối đa rồi bấm «Xong».`;
  stage(`
    <div style="flex:1;overflow:auto">
      <h1>${title}</h1>
      <p>${desc}</p>
      ${note ? `<div class="card" style="color:var(--accent)">${note}</div>` : ''}
      <div class="card">
        <b>${wantCam ? 'Đếm bằng camera trước' : 'Đếm bằng chạm màn hình'}</b>
        <p class="dim small">${wantCam
          ? 'Đặt máy nằm ngửa dưới ngực. Trước khi tập cần hiệu chỉnh khoảng 8 giây để máy biết tư thế cao và thấp trong ánh sáng nơi tập. Chạm màn hình vẫn tính lượt.'
          : 'Đặt máy nằm ngửa dưới mặt. Mỗi lần hạ xuống, chạm mũi hoặc cằm vào màn hình.'}</p>
      </div>
    </div>
    <div class="btns">
      ${wantCam ? `<button class="primary" id="calib">Hiệu chỉnh rồi bắt đầu</button>
        ${state.calib ? '<button id="reuse">Dùng hiệu chỉnh lần trước</button>' : ''}
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
function countdown(sec, done, label = 'Vào tư thế chống tay', onTick) {
  clearTimers();
  let left = sec;
  const draw = () => {
    stage(`<div class="pad rest"><div class="lbl">${label}</div><div class="num">${left}</div></div>`, { quit: true });
  };
  draw();
  beep(660, 60);
  every(() => {
    left -= 1;
    if (onTick) onTick(left);
    if (left <= 0) { clearTimers(); beep(1320, 220); done(); return; }
    soundTick(left);
    draw();
  }, 1000);
}

// Hiệu chỉnh: đo hình ở tư thế cao rồi tư thế thấp, chọn đặc trưng tách rõ nhất.
function calibrate() {
  const w = workout;
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
          state.calib = null; save();
          viewPrep('Camera không phân biệt được tư thế cao và thấp ở chỗ này (thiếu sáng, hoặc máy đặt lệch khỏi ngực). Hãy chỉnh lại chỗ đặt máy rồi hiệu chỉnh lại, hoặc dùng chạm cho buổi này.');
          return;
        }
        state.calib = { feature: c.feature, up: c.up, down: c.down }; save();
        w.useCam = true;
        countdown(5, beginSet, 'Hiệu chỉnh xong. Về tư thế cao');
      });
    });
  }, 'Chuẩn bị hiệu chỉnh: chống tay phía trên máy');
}

function target() {
  const w = workout;
  return w.type === 'test' ? null : w.plan.sets[w.set];
}
const isOpenSet = () => workout.type === 'test' || workout.set === workout.plan.sets.length - 1;

function beginSet() {
  clearTimers();
  const w = workout;
  w.phase = 'set';
  w.count = 0;
  w.lastHit = 0;
  if (w.useCam && state.calib) {
    const c = state.calib;
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

function drawSet() {
  const w = workout;
  const tgt = target();
  const open = isOpenSet();
  let num, cls = '', lbl;
  if (w.type === 'test') {
    num = w.count; lbl = 'Bài thử: hít tối đa';
  } else if (w.count < tgt) {
    num = tgt - w.count; lbl = open ? `Hiệp cuối: ít nhất ${tgt}, rồi hít tiếp tới hết sức` : `Hiệp ${w.set + 1}/5`;
  } else {
    num = `+${w.count - tgt}`; cls = 'plus'; lbl = `Đã đủ ${tgt}. Hít tiếp tới hết sức`;
  }
  const top = w.type === 'test' ? 'Bài thử sức' : `Hiệp ${w.set + 1}/5 · ${setsText(w.plan.sets)}`;
  stage(`
    <div class="pad" id="pad">
      <div class="lbl">${lbl}</div>
      <div class="num ${cls}" id="num">${num}</div>
      <div class="hint">${w.useCam ? 'Hạ ngực che máy, hoặc chạm vào đây' : 'Chạm mũi hoặc cằm vào đây mỗi lần hạ xuống'}</div>
    </div>
    <div class="row">
      ${w.useCam ? '<span class="sig"><i id="dot" class="up"></i>camera</span>' : '<span></span>'}
      <button id="undo" class="ghost" style="width:auto">− Bớt 1</button>
    </div>
    <div class="btns">
      <button id="finish" class="${open ? 'primary' : ''}">${open ? 'Xong' : 'Hết sức, dừng hiệp sớm'}</button>
    </div>
  `, { top });
  const pad = document.getElementById('pad');
  pad.addEventListener('pointerdown', (e) => { e.preventDefault(); rep(); });
  on('finish', finishSet);
  on('undo', () => { if (w.count > 0) { w.count -= 1; drawSet(); } });
}

// Một lượt hít. Camera và chạm dùng chung khoảng chặn 400 ms để không đếm đôi.
function rep() {
  const w = workout;
  if (!w || w.phase !== 'set') return;
  const now = performance.now();
  if (now - w.lastHit < 400) return;
  w.lastHit = now;
  w.count += 1;
  const tgt = target();
  if (tgt && w.count === tgt) soundSetDone(); // số về 0: đủ hiệp
  else soundRep(tgt ? (w.count < tgt ? tgt - w.count : w.count - tgt) : w.count);
  if (tgt && !isOpenSet() && w.count >= tgt) { finishSet(); return; }
  drawSet();
  const pad = document.getElementById('pad');
  pad.classList.add('hit');
  later(() => pad.classList.remove('hit'), 120);
}

function finishSet() {
  const w = workout;
  if (w.phase !== 'set') return;
  w.phase = 'between';
  camera.onSample = null;
  w.done.push(w.count);
  if (w.type === 'test') return finishWorkout();
  w.set += 1;
  if (w.set >= w.plan.sets.length) return finishWorkout();
  rest(w.plan.rest);
}

function rest(sec) {
  clearTimers();
  const w = workout;
  w.phase = 'rest';
  let left = sec;
  const draw = () => {
    stage(`
      <div class="pad rest">
        <div class="lbl">Nghỉ. Vừa xong: ${w.done.at(-1)} cái</div>
        <div class="num">${left}</div>
        <div class="hint">Hiệp kế (${w.set + 1}/5): <b>${w.plan.sets[w.set]}${w.set === 4 ? '+' : ''}</b> cái</div>
      </div>
      <div class="btns two">
        <button id="more">+30 giây</button>
        <button id="skip">Vào hiệp luôn</button>
      </div>`, { top: `Đã xong ${w.set}/5 hiệp` });
    on('more', () => { left += 30; draw(); });
    on('skip', () => { clearTimers(); beep(1320, 220); beginSet(); });
  };
  draw();
  every(() => {
    left -= 1;
    if (left <= 0) { clearTimers(); beep(1320, 220); beginSet(); return; }
    // Sắp hết giờ nghỉ: hai tiếng bíp báo trước ở giây 10, rồi đếm ngược 5 giây cuối.
    if (left === 10) { beep(660, 120); beep(660, 120, 0.5, 200); }
    if (left <= 5) soundTick(left);
    draw();
  }, 1000);
}

function finishWorkout() {
  clearTimers();
  camera.stop();
  keepAwake(false);
  const w = workout;
  w.phase = 'summary';
  soundFinish();
  const before = state.T;
  const wasAchieved = state.achieved;
  let body;
  if (w.type === 'test') {
    const n = w.done[0];
    state = applyTest(state, n, today());
    save();
    const reached = n >= GOAL;
    body = `
      <h1>${reached ? '🏆 Về đích!' : 'Kết quả bài thử'}</h1>
      <div class="card"><div class="dim small">Một hơi</div><div class="big">${n}</div>
        <p class="dim small" style="margin-bottom:0">${reached
          ? `Bạn đã hít ${n} cái một hơi${wasAchieved ? '' : ' — đạt mục tiêu ' + GOAL}.`
          : n < 3 ? 'Mức tập đặt ở 3. Nếu chưa lên nổi, tập kiểu quỳ gối trong các buổi tới.'
          : `Mức tập mới: ${state.T}${before != null ? ` (trước đó ${before})` : ''}.`}</p></div>
      <div class="card"><b>Buổi kế: ${fmtDate(state.nextDate)}</b>
        <div class="sets">${planSession(state.T, 0).sets.map((x, i) => `<span>${x}${i === 4 ? '+' : ''}</span>`).join('')}</div>
        <p class="dim small" style="margin-bottom:0">Nghỉ trọn ít nhất 1 ngày trước khi tập.</p></div>`;
  } else {
    const plan = w.plan.sets;
    const passed = sessionPassed(plan, w.done);
    const lastOfWeek = state.day === 2;
    state = applySession(state, w.done, today());
    save();
    const total = w.done.reduce((a, b) => a + b, 0);
    let verdict = passed ? 'Đạt đủ cả 5 hiệp.' : 'Buổi này hụt so với kế hoạch — không sao, tuần cần đạt 2 trong 3 buổi.';
    if (lastOfWeek) {
      verdict += state.T > before ? ` Hết tuần: mức tập tăng từ ${before} lên ${state.T}.`
        : state.T < before ? ` Hết tuần: hụt hai tuần liền nên lùi mức từ ${before} về ${state.T} để lấy lại đà.`
        : ' Hết tuần: chưa đạt nên tuần tới lặp lại mức này.';
    }
    body = `
      <h1>Xong buổi tập</h1>
      <div class="card">
        <div class="row"><div><div class="dim small">Tổng</div><div class="big">${total}</div></div>
          <span class="pill ${passed ? 'ok' : 'bad'}">${passed ? 'Đạt' : 'Hụt'}</span></div>
        <div class="sets">${w.done.map((n, i) => `<span class="${n >= plan[i] ? 'done' : 'miss'}">${n}</span>`).join('')}</div>
        <p class="dim small">Kế hoạch: ${setsText(plan)}</p>
        <p class="small" style="margin-bottom:0">${verdict}</p>
      </div>
      <div class="card"><b>Buổi kế: ${fmtDate(state.nextDate)}</b>
        <p class="dim small" style="margin-bottom:0">${state.pending === 'test' ? 'Bài thử sức để xếp lại mức.' : `${DAY_NAME[state.day]}: ${setsText(planSession(state.T, state.day).sets)}`}</p></div>`;
  }
  stage(`<div style="flex:1;overflow:auto">${body}</div><div class="btns"><button class="primary" id="home">Về trang chính</button></div>`, { quit: false });
  on('home', viewHome);
}

// ---------- Khởi động ----------
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && workout && workout.phase !== 'summary') keepAwake(true);
});
if ('serviceWorker' in navigator && location.protocol === 'https:') {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}
viewHome();

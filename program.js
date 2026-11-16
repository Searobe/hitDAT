// Lõi chương trình tập — hàm thuần, không đụng DOM, chạy được cả trên trình duyệt lẫn Node (để kiểm).
// Mọi con số của chương trình nằm ở đây; giải thích ở docs/ke-hoach/2026-11-14-app-hit-dat.md.

export const GOAL = 100; // mục tiêu: hít liền một hơi
export const SESSIONS_PER_WEEK = 3;
export const WEEKS_BETWEEN_TESTS = 2;
export const REST_DAYS = 2; // buổi kế cách buổi trước 2 ngày lịch = nghỉ trọn ít nhất 1 ngày
export const MIN_T = 3; // mức tập thấp nhất để hiệp không về 0

// Cường độ theo buổi trong tuần (tỉ lệ so với mức tối đa T): nhẹ → vừa → nặng.
const DAY_FACTOR = [0.5, 0.57, 0.65];
// Dáng 5 hiệp: hiệp 2 cao nhất, hiệp 3–4 hạ xuống, hiệp 5 hít tối đa (số ghi là mức tối thiểu).
const SET_SHAPE = [1, 1.2, 0.85, 0.85, 1];

const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

// Người mới (T nhỏ) hồi sức nhanh giữa các hiệp ít lượt nên chịu được tỉ lệ cao hơn;
// người khoẻ (T lớn) mỗi hiệp dài nên phải hạ tỉ lệ để hít đủ 5 hiệp.
export function intensity(T, day) {
  const small = 1 + 4 / (T + 4);
  const large = 1 - 0.2 * clamp((T - 20) / 60, 0, 1);
  return DAY_FACTOR[day] * small * large;
}

export function restFor(reps) {
  if (reps <= 15) return 60;
  if (reps <= 30) return 90;
  return 120;
}

// Kế hoạch một buổi: 5 hiệp; hiệp cuối là hít tối đa, số trả về là mức tối thiểu phải đạt.
export function planSession(T, day) {
  const f = intensity(T, day);
  // Không hiệp nào vượt mức tối đa đã đo.
  const sets = SET_SHAPE.map((m) => clamp(Math.round(T * f * m), 1, T));
  return { sets, rest: restFor(Math.max(...sets)) };
}

export function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + n));
  return dt.toISOString().slice(0, 10);
}

export function initialState() {
  return {
    v: 1,
    settings: { mode: 'camera', sound: true, count: 'beep', legsAuto: false }, // count: 'beep' | 'voice'; legsAuto: màn hướng dẫn động tác chân tự vào tập sau vài giây thay vì đợi bấm
    calib: null,
    T: null, // mức tối đa đang dùng để tính hiệp
    week: 1,
    day: 0, // buổi kế trong tuần: 0..2
    weekLog: [], // buổi nào trong tuần đã đạt
    weeksSinceTest: 0,
    failStreak: 0,
    pending: 'test', // 'test' | 'session'
    nextDate: null, // ngày sớm nhất nên tập buổi kế
    achieved: false,
    history: [],
  };
}

// Ghi kết quả bài thử: xếp lại mức T theo đúng số vừa hít được.
export function applyTest(state, count, date) {
  const s = structuredClone(state);
  s.history.push({ type: 'test', date, count, week: s.week });
  s.T = Math.max(MIN_T, count);
  if (count >= GOAL) s.achieved = true;
  s.day = 0;
  s.weekLog = [];
  s.weeksSinceTest = 0;
  s.failStreak = 0;
  s.pending = 'session';
  s.nextDate = addDays(date, REST_DAYS);
  return s;
}

export function sessionPassed(plan, done) {
  return plan.every((n, i) => (done[i] || 0) >= n);
}

// Ghi kết quả một buổi tập. done = số lượt thật của từng hiệp.
export function applySession(state, done, date) {
  const s = structuredClone(state);
  const plan = planSession(s.T, s.day).sets;
  const passed = sessionPassed(plan, done);
  s.history.push({
    type: 'session', date, week: s.week, day: s.day, T: s.T,
    plan, done: plan.map((_, i) => done[i] || 0), passed,
    total: done.reduce((a, b) => a + (b || 0), 0),
  });
  s.weekLog.push(passed);
  s.day += 1;
  s.nextDate = addDays(date, REST_DAYS);

  if (s.day >= SESSIONS_PER_WEEK) {
    const passes = s.weekLog.filter(Boolean).length;
    if (passes >= 2) {
      // Đạt tuần: tăng 12%; hiệp cuối buổi nặng vượt 1,5 lần mức tối thiểu thì nhảy 20%.
      const strong = passed && (done[4] || 0) >= plan[4] * 1.5;
      s.T = Math.max(s.T + 1, Math.round(s.T * (strong ? 1.2 : 1.12)));
      s.failStreak = 0;
    } else {
      // Hụt tuần: lặp lại mức cũ; hụt hai tuần liền thì lùi 10%.
      s.failStreak += 1;
      if (s.failStreak >= 2) {
        s.T = Math.max(MIN_T, Math.round(s.T * 0.9));
        s.failStreak = 0;
      }
    }
    s.week += 1;
    s.day = 0;
    s.weekLog = [];
    s.weeksSinceTest += 1;
    if (s.weeksSinceTest >= WEEKS_BETWEEN_TESTS) s.pending = 'test';
  }
  return s;
}

// Lịch phần còn lại của tuần hiện tại (để hiện ở trang chính).
export function upcoming(state) {
  if (state.T == null) return [];
  const out = [];
  let date = state.nextDate;
  if (state.pending === 'test') return [{ type: 'test', date }];
  for (let d = state.day; d < SESSIONS_PER_WEEK; d++) {
    out.push({ type: 'session', day: d, date, ...planSession(state.T, d) });
    date = addDays(date, REST_DAYS);
  }
  if (state.weeksSinceTest + 1 >= WEEKS_BETWEEN_TESTS) out.push({ type: 'test', date });
  return out;
}

// Bộ phân loại tín hiệu camera: norm = 1 ở tư thế cao, 0 ở tư thế thấp.
// Có độ trễ hai ngưỡng để không đếm trùng; trả về true đúng lúc hạ xuống.
export function makeRepDetector(downAt = 0.4, upAt = 0.65) {
  let isDown = false;
  return {
    feed(norm) {
      if (!isDown && norm < downAt) { isDown = true; return true; }
      if (isDown && norm > upAt) isDown = false;
      return false;
    },
    get down() { return isDown; },
  };
}

// Chọn đặc trưng hình (độ sáng hay độ tương phản) tách hai tư thế rõ nhất.
// up/down = { luma, sd } đo lúc hiệu chỉnh. Trả null nếu không đủ khác biệt để đếm.
export function chooseCalibration(up, down, minSeparation = 0.25) {
  let best = null;
  for (const feature of ['luma', 'sd']) {
    const sep = Math.abs(up[feature] - down[feature]) / Math.max(up[feature], down[feature], 1);
    if (!best || sep > best.sep) best = { feature, up: up[feature], down: down[feature], sep };
  }
  return best && best.sep >= minSeparation ? best : null;
}

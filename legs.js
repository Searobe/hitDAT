// Chương trình tập chân — hàm thuần, không đụng DOM. Giải thích ở docs/ke-hoach/2026-11-14-tap-chan.md.
// Mục tiêu: bơm máu về tim bằng cơ bắp chân, làm khoẻ mông – hông, giãn cơ mông bị ép khi nằm nghiêng.

export const REST_SET = 30; // nghỉ giữa hai hiệp (giây)
export const REST_SIDE = 5; // đổi bên
export const INTRO = 8; // xem hình + chuẩn bị trước mỗi động tác
export const SESSIONS_PER_LEVEL = 6; // số điểm để lên một mức: 6 buổi «vừa» (3 buổi/tuần × 2 tuần)

// kind: 'reps' đếm lượt theo nhịp tempo (giây mỗi lượt) · 'hold' giữ yên, đếm giây.
// sides: 2 = làm từng bên.
// muscles: [mức, tên] — main = cơ chính, extra = cơ phụ, stretch = cơ được kéo giãn; màu khớp với hình ở figures.js.
export const EX = {
  ankle: {
    name: 'Gập duỗi cổ chân', kind: 'reps', tempo: 2, sides: 1,
    muscles: [['main', 'Bắp chân (cơ sinh đôi, cơ dép)'], ['extra', 'Cơ chày trước (mặt trước ống chân)']],
    how: ['Nằm ngửa hoặc ngồi duỗi thẳng chân.', 'Kéo mũi chân về phía mặt hết cỡ, rồi duỗi mũi chân ra xa hết cỡ.', 'Làm mạnh và dứt khoát, cả hai chân cùng lúc.'],
    avoid: 'Đừng làm hời hợt: phải thấy bắp chân căng rồi thả.',
  },
  calf: {
    name: 'Nhón gót', kind: 'reps', tempo: 2, sides: 1,
    muscles: [['main', 'Bắp chân (cơ sinh đôi, cơ dép)']],
    how: ['Đứng thẳng, tay vịn tường hoặc ghế.', 'Nhón gót lên cao hết cỡ, giữ một nhịp.', 'Hạ chậm xuống, gót chạm đất.'],
    avoid: 'Đừng nhún nhanh như lò xo; đừng đổ người về trước.',
  },
  bridge: {
    name: 'Nâng hông', kind: 'reps', tempo: 3, sides: 1,
    muscles: [['main', 'Cơ mông lớn'], ['extra', 'Cơ đùi sau']],
    how: ['Nằm ngửa, co gối, bàn chân đặt sát đất rộng bằng hông.', 'Siết mông, đẩy hông lên tới khi vai – hông – gối thẳng hàng.', 'Giữ một nhịp rồi hạ chậm.'],
    avoid: 'Đừng ưỡn lưng để lên cao hơn; lực phải ở mông, không ở thắt lưng.',
  },
  clam: {
    name: 'Mở gối nằm nghiêng', kind: 'reps', tempo: 2.5, sides: 2,
    muscles: [['main', 'Cơ mông nhỡ (bên hông)']],
    how: ['Nằm nghiêng, co gối, hai bàn chân chụm vào nhau.', 'Giữ bàn chân chạm nhau, mở gối trên lên như vỏ sò mở ra.', 'Hạ chậm. Sẽ thấy mỏi ở bên hông và mông.'],
    avoid: 'Đừng ngả hông ra sau khi mở gối; thân người giữ yên.',
  },
  squat: {
    name: 'Ngồi xổm', kind: 'reps', tempo: 3, sides: 1,
    muscles: [['main', 'Cơ tứ đầu đùi (đùi trước)'], ['main', 'Cơ mông lớn'], ['extra', 'Cơ đùi sau']],
    how: ['Đứng chân rộng bằng vai, mũi chân hơi mở.', 'Đẩy mông ra sau như ngồi xuống ghế, hạ tới khi đùi gần song song mặt đất.', 'Đạp gót đứng thẳng dậy.'],
    avoid: 'Đừng để gối chụm vào trong; gót không nhấc khỏi đất.',
  },
  fig4: {
    name: 'Giãn cơ mông hình số 4', kind: 'hold', sides: 2,
    muscles: [['stretch', 'Cơ mông và cơ hình lê (được kéo giãn)']],
    how: ['Nằm ngửa, gác mắt cá chân này lên gối chân kia thành hình số 4.', 'Luồn tay ôm đùi chân dưới, kéo nhẹ về phía ngực.', 'Thở đều, thấy căng ở mông bên chân gác.'],
    avoid: 'Căng vừa phải, không đau nhói. Tê hoặc đau chạy dọc chân thì nới ra.',
  },
  calf1: {
    name: 'Nhón gót một chân', kind: 'reps', tempo: 2.5, sides: 2,
    muscles: [['main', 'Bắp chân (cơ sinh đôi, cơ dép)']],
    how: ['Đứng một chân, tay vịn tường hoặc ghế, chân kia co lên.', 'Nhón gót lên cao hết cỡ, giữ một nhịp.', 'Hạ chậm xuống.'],
    avoid: 'Đừng dùng tay kéo người lên; tay chỉ để giữ thăng bằng.',
  },
  bridge1: {
    name: 'Nâng hông một chân', kind: 'reps', tempo: 3, sides: 2,
    muscles: [['main', 'Cơ mông lớn'], ['extra', 'Cơ đùi sau']],
    how: ['Nằm ngửa, co một gối, chân kia duỗi thẳng nhấc khỏi đất.', 'Siết mông bên chân trụ, đẩy hông lên.', 'Giữ hai bên hông ngang nhau, hạ chậm.'],
    avoid: 'Đừng để hông bên chân duỗi sụp xuống.',
  },
  split: {
    name: 'Chùng chân', kind: 'reps', tempo: 3, sides: 2,
    muscles: [['main', 'Cơ tứ đầu đùi (đùi trước)'], ['main', 'Cơ mông lớn']],
    how: ['Đứng chân trước chân sau, cách nhau một bước dài.', 'Hạ thẳng người xuống tới khi gối sau gần chạm đất.', 'Đạp chân trước đứng dậy.'],
    avoid: 'Đừng đổ người về trước; gối trước không vượt quá mũi chân nhiều.',
  },
};

// Mức chân tính từ lịch sử, theo cảm nhận người tập chọn cuối mỗi buổi (feel):
// «nhẹ» +2 điểm, «vừa» (hoặc buổi cũ chưa có câu hỏi) +1 điểm, «nặng» +0 điểm; đủ 6 điểm lên một mức.
// Hai buổi «nặng» liền nhau thì lùi về đầu mức dưới.
export const FEEL = { easy: 'Nhẹ', ok: 'Vừa', hard: 'Nặng' };
export function legsLevel(history) {
  let points = 0;
  let hard = 0;
  for (const h of history) {
    if (h.type !== 'legs') continue;
    if (h.feel === 'hard') {
      hard += 1;
      if (hard >= 2) {
        points = Math.max(0, (Math.floor(points / SESSIONS_PER_LEVEL) - 1) * SESSIONS_PER_LEVEL);
        hard = 0;
      }
    } else {
      hard = 0;
      points += h.feel === 'easy' ? 2 : 1;
    }
  }
  points = Math.min(points, SESSIONS_PER_LEVEL * 2);
  const level = 1 + Math.floor(points / SESSIONS_PER_LEVEL);
  return { level, points, toNext: level >= 3 ? 0 : SESSIONS_PER_LEVEL - (points % SESSIONS_PER_LEVEL) };
}

// n = số lượt (reps) hoặc số giây (hold) của một hiệp, mỗi bên.
export function legsPlan(level) {
  if (level <= 1) {
    return [
      { ex: 'ankle', sets: 1, n: 20 }, { ex: 'calf', sets: 2, n: 15 }, { ex: 'bridge', sets: 2, n: 10 },
      { ex: 'clam', sets: 2, n: 10 }, { ex: 'squat', sets: 2, n: 10 }, { ex: 'fig4', sets: 1, n: 30 },
    ];
  }
  if (level === 2) {
    return [
      { ex: 'ankle', sets: 1, n: 20 }, { ex: 'calf', sets: 3, n: 20 }, { ex: 'bridge', sets: 3, n: 12 },
      { ex: 'clam', sets: 3, n: 12 }, { ex: 'squat', sets: 3, n: 12 }, { ex: 'fig4', sets: 1, n: 30 },
    ];
  }
  return [
    { ex: 'ankle', sets: 1, n: 20 }, { ex: 'calf1', sets: 2, n: 10 }, { ex: 'bridge1', sets: 2, n: 8 },
    { ex: 'clam', sets: 2, n: 15 }, { ex: 'split', sets: 2, n: 8 }, { ex: 'fig4', sets: 1, n: 45 },
  ];
}

// Bài bơm máu hằng ngày: hai động tác bắp chân, khoảng 2 phút.
export function pumpPlan() {
  return [{ ex: 'ankle', sets: 1, n: 20 }, { ex: 'calf', sets: 2, n: 15 }];
}

// Trải kế hoạch thành chuỗi bước cho trình dẫn tập: intro → work → rest → …
export function buildSteps(plan, restSet = REST_SET) {
  const steps = [];
  for (const item of plan) {
    const ex = EX[item.ex];
    steps.push({ type: 'intro', ex: item.ex, sec: INTRO, sets: item.sets, n: item.n });
    for (let set = 1; set <= item.sets; set++) {
      for (let side = 1; side <= ex.sides; side++) {
        steps.push({ type: 'work', ex: item.ex, set, sets: item.sets, side: ex.sides === 2 ? side : 0, n: item.n });
        const lastSide = side === ex.sides;
        if (!lastSide) steps.push({ type: 'rest', sec: REST_SIDE, label: 'Đổi bên' });
        else if (set < item.sets) steps.push({ type: 'rest', sec: restSet, label: 'Nghỉ' });
      }
    }
  }
  return steps;
}

export function stepSeconds(step) {
  if (step.type !== 'work') return step.sec;
  const ex = EX[step.ex];
  return ex.kind === 'hold' ? step.n : step.n * ex.tempo;
}

export function estimateMinutes(steps) {
  return Math.round(steps.reduce((a, s) => a + stepSeconds(s), 0) / 60);
}

// Ghi tay bài bơm máu khi tập không cầm máy (đang tắm, tay ướt…): tính như một lần làm đủ.
export const PUMP_MINUTES = 2;
export const pumpEntry = (date) => ({ type: 'pump', date, level: 1, minutes: PUMP_MINUTES, skipped: 0, manual: true });
// Bỏ lần ghi tay gần nhất của ngày đó (không đụng lần tập có dẫn nhịp).
export function undoManualPump(history, date) {
  for (let i = history.length - 1; i >= 0; i--) {
    const h = history[i];
    if (h.type === 'pump' && h.date === date && h.manual) return [...history.slice(0, i), ...history.slice(i + 1)];
  }
  return history;
}

export const legsDone = (history) => history.filter((h) => h.type === 'legs').length;
export const doneOn = (history, type, date) => history.some((h) => h.type === type && h.date === date);

export function describe(item) {
  const ex = EX[item.ex];
  const unit = ex.kind === 'hold' ? ' giây' : ' lượt';
  const side = ex.sides === 2 ? ' mỗi bên' : '';
  return `${item.sets > 1 ? item.sets + ' × ' : ''}${item.n}${unit}${side}`;
}

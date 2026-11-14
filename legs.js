// Chương trình tập chân — hàm thuần, không đụng DOM. Giải thích ở docs/ke-hoach/2026-11-14-tap-chan.md.
// Mục tiêu: bơm máu về tim bằng cơ bắp chân, làm khoẻ mông – hông, giãn cơ mông bị ép khi nằm nghiêng.

export const REST_SET = 30; // nghỉ giữa hai hiệp (giây)
export const REST_SIDE = 5; // đổi bên
export const INTRO = 8; // xem hình + chuẩn bị trước mỗi động tác
export const SESSIONS_PER_LEVEL = 6; // 3 buổi/tuần × 2 tuần

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

export function levelFor(sessionsDone) {
  if (sessionsDone < SESSIONS_PER_LEVEL) return 1;
  if (sessionsDone < SESSIONS_PER_LEVEL * 2) return 2;
  return 3;
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

export const legsDone = (history) => history.filter((h) => h.type === 'legs').length;
export const doneOn = (history, type, date) => history.some((h) => h.type === type && h.date === date);

export function describe(item) {
  const ex = EX[item.ex];
  const unit = ex.kind === 'hold' ? ' giây' : ' lượt';
  const side = ex.sides === 2 ? ' mỗi bên' : '';
  return `${item.sets > 1 ? item.sets + ' × ' : ''}${item.n}${unit}${side}`;
}

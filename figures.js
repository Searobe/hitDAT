// Hình người que chuyển động cho từng động tác chân.
// Mỗi động tác là hai tư thế (a → b → a); khớp nào không ghi ở b thì giữ như a.
// Toạ độ trong khung 200 × 150, mặt đất ở y = 132.

const GROUND = 132;

// Khớp: head, sh (vai), hip, k1/a1/t1 (gối, cổ chân, mũi chân bên được tô màu), k2/a2/t2 (chân kia), el (khuỷu), hd (bàn tay).
const stand = { head: [100, 22], sh: [100, 38], hip: [100, 76], k1: [100, 104], a1: [98, 128], t1: [116, 132], k2: [100, 104], a2: [98, 128], t2: [116, 132], el: [112, 56], hd: [128, 62] };
const supine = { head: [26, 119], sh: [42, 122], hip: [98, 124], el: [62, 128], hd: [84, 128] };

export const FIG = {
  ankle: {
    a: { ...supine, k1: [136, 124], a1: [172, 124], t1: [176, 104], k2: [136, 124], a2: [172, 124], t2: [176, 104] },
    b: { t1: [192, 120], t2: [192, 120] },
  },
  calf: {
    props: 'wall',
    a: stand,
    b: { head: [101, 11], sh: [101, 27], hip: [101, 65], k1: [101, 93], a1: [101, 116], k2: [101, 93], a2: [101, 116], el: [113, 46], hd: [128, 54] },
  },
  bridge: {
    a: { ...supine, k1: [130, 96], a1: [146, 128], t1: [160, 132], k2: [130, 96], a2: [146, 128], t2: [160, 132] },
    b: { hip: [96, 100], k1: [132, 92], k2: [132, 92] },
  },
  clam: {
    a: { head: [24, 108], sh: [42, 114], hip: [98, 118], el: [50, 128], hd: [30, 122], k2: [140, 127], a2: [166, 114], t2: [176, 112], k1: [140, 121], a1: [166, 110], t1: [176, 108] },
    b: { k1: [132, 92] },
  },
  squat: {
    a: { ...stand, t1: [116, 132], el: [106, 58], hd: [110, 76] },
    b: { head: [104, 52], sh: [98, 66], hip: [80, 100], k1: [112, 102], k2: [112, 102], el: [116, 74], hd: [134, 72] },
  },
  fig4: {
    a: { ...supine, k2: [108, 86], a2: [140, 90], t2: [150, 84], k1: [130, 104], a1: [108, 86], t1: [100, 80], el: [74, 104], hd: [106, 96] },
    b: { k2: [104, 84], a2: [136, 86], t2: [146, 80], k1: [126, 100], a1: [104, 84], t1: [96, 78], hd: [102, 94] },
  },
  calf1: {
    props: 'wall',
    a: { ...stand, k2: [106, 102], a2: [88, 114], t2: [80, 122] },
    b: { head: [101, 11], sh: [101, 27], hip: [101, 65], k1: [101, 93], a1: [101, 116], k2: [107, 91], a2: [89, 103], t2: [81, 111], el: [113, 46], hd: [128, 54] },
  },
  bridge1: {
    a: { ...supine, k1: [130, 96], a1: [146, 128], t1: [160, 132], k2: [132, 112], a2: [164, 100], t2: [170, 90] },
    b: { hip: [96, 100], k1: [132, 92], k2: [132, 90], a2: [166, 80], t2: [172, 70] },
  },
  split: {
    a: { head: [100, 22], sh: [100, 38], hip: [100, 76], k1: [120, 102], a1: [122, 128], t1: [140, 132], k2: [84, 104], a2: [66, 124], t2: [70, 132], el: [104, 58], hd: [106, 76] },
    b: { head: [100, 44], sh: [100, 60], hip: [100, 98], k1: [128, 100], k2: [86, 124], a2: [62, 118], el: [104, 80], hd: [106, 98] },
  },
};

const BONES = [
  ['sh', 'hip', 'body'], ['head', 'sh', 'body'],
  ['hip', 'k2', 'far'], ['k2', 'a2', 'far'], ['a2', 't2', 'far'],
  ['sh', 'el', 'body'], ['el', 'hd', 'body'],
  ['hip', 'k1', 'near'], ['k1', 'a1', 'near'], ['a1', 't1', 'near'],
];

function anim(attr, from, to, dur) {
  if (from === to) return '';
  return `<animate attributeName="${attr}" values="${from};${to};${from}" dur="${dur}s" repeatCount="indefinite" calcMode="spline" keyTimes="0;0.5;1" keySplines="0.4 0 0.6 1;0.4 0 0.6 1"/>`;
}

// Trả về chuỗi SVG. dur = thời gian một lượt (giây), khớp với nhịp đếm của trình dẫn tập.
export function figureSvg(id, dur = 2.5) {
  const f = FIG[id];
  if (!f) return '';
  const A = f.a;
  const B = { ...f.a, ...f.b };
  let out = `<svg class="fig" viewBox="0 0 200 150" role="img" aria-label="Hình minh hoạ động tác">`;
  out += `<line class="ground" x1="6" y1="${GROUND + 3}" x2="194" y2="${GROUND + 3}"/>`;
  if (f.props === 'wall') out += `<line class="ground" x1="134" y1="20" x2="134" y2="${GROUND + 3}"/>`;
  for (const [p, q, cls] of BONES) {
    const [x1, y1] = A[p], [x2, y2] = A[q];
    const [u1, v1] = B[p], [u2, v2] = B[q];
    out += `<line class="bone ${cls}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}">`
      + anim('x1', x1, u1, dur) + anim('y1', y1, v1, dur) + anim('x2', x2, u2, dur) + anim('y2', y2, v2, dur) + '</line>';
  }
  const [hx, hy] = A.head, [gx, gy] = B.head;
  out += `<circle class="headc" cx="${hx}" cy="${hy}" r="10">${anim('cx', hx, gx, dur)}${anim('cy', hy, gy, dur)}</circle>`;
  return out + '</svg>';
}

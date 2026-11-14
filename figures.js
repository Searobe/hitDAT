// Hình người khối chuyển động cho từng động tác chân, có vẽ từng bó cơ và độ sáng theo pha co – thả.
// Mọi thứ là hàm thuần theo pha 0–1 của một lượt (pha 0 = tư thế xuất phát, quay lại pha 1 = pha 0):
//   poseAt(id, pha)        toạ độ các khớp (đã chiếu xiên ra khung 200 × 150, kèm độ sâu z)
//   activationAt(id, m, pha)  cường độ 0–1 của bó cơ m (cơ co: mức co; cơ giãn: mức kéo giãn)
//   frameOps(id, pha)      danh sách phần tử SVG và thuộc tính ở pha đó
// Chuyển động: các tư thế khoá nối bằng đường cong Hermite theo chu kỳ; khớp xa thân trễ nhẹ hơn khớp gần thân.
// Toạ độ khớp: [x, y, z]; x, y như khung 200 × 150 (mặt đất y = 132), z > 0 là hướng về phía người xem.
// Chiếu xiên: X = x + z·kx, Y = y + z·ky, nhờ vậy hai chân, hai gối tách nhau và động tác nằm nghiêng đọc được ở góc nhìn 3/4.

const GROUND = 132;
export const JOINTS = ['head', 'sh', 'hip', 'k1', 'a1', 't1', 'k2', 'a2', 't2', 'el', 'hd'];
// Độ trễ (phần của một chu kỳ) theo khớp: gần thân 0, xa thân trễ hơn.
const LAG = { head: 0.02, sh: 0, hip: 0, k1: 0.012, a1: 0.025, t1: 0.035, k2: 0.012, a2: 0.025, t2: 0.035, el: 0.02, hd: 0.035 };
// Độ sâu mặc định: chân 1 và tay ở gần người xem, chân 2 ở xa.
const DZ = { head: 0, sh: 0, hip: 0, k1: 5, a1: 5, t1: 5, k2: -5, a2: -5, t2: -5, el: 7, hd: 7 };
const VIEW = [0.3, 0.2];

// Đoạn thân: [khớp đầu, khớp cuối, nửa bề rộng ở đầu, ở cuối]
const SEG = {
  th1: ['hip', 'k1', 9, 6.4], sh1: ['k1', 'a1', 6.4, 4.4], ft1: ['a1', 't1', 3.8, 3],
  th2: ['hip', 'k2', 8.4, 6], sh2: ['k2', 'a2', 6, 4.2], ft2: ['a2', 't2', 3.6, 2.8],
  ua: ['sh', 'el', 4.6, 3.8], fa: ['el', 'hd', 3.8, 3],
};

// Bó cơ: seg = đoạn chứa cơ, u = đoạn dọc xương (0–1), k = độ lệch đỉnh bụng cơ (cơ phồng nhất ở s ≈ 0,5^(1/k)), tên theo giải phẫu.
const MUSC = {
  gas: { seg: 'sh', side: 'back', u: [0.04, 0.66], k: 0.65, name: 'Bắp chân (cơ sinh đôi, cơ dép)' },
  tib: { seg: 'sh', side: 'front', u: [0.1, 0.84], k: 0.8, name: 'Cơ chày trước' },
  quad: { seg: 'th', side: 'front', u: [0.1, 0.9], k: 0.9, name: 'Cơ tứ đầu đùi' },
  ham: { seg: 'th', side: 'back', u: [0.1, 0.92], k: 0.85, name: 'Cơ đùi sau' },
  gmax: { blob: true, rx: 11, ry: 8.5, name: 'Cơ mông lớn' },
  gmed: { blob: true, rx: 9, ry: 5.5, name: 'Cơ mông nhỡ' },
  pir: { blob: true, rx: 7, ry: 3.2, name: 'Cơ hình lê', deep: true },
};

const pt = (dz, j, p) => [p[0], p[1], p.length > 2 ? p[2] : (dz[j] ?? DZ[j])];
function full(dz, base, part) {
  const o = {};
  for (const j of JOINTS) o[j] = pt(dz, j, (part && part[j]) || base[j]);
  return o;
}
function over(A, B, k) {
  const o = {};
  for (const j of JOINTS) o[j] = A[j].map((v, i) => v + (B[j][i] - v) * k);
  return o;
}
// Một lượt: xuống/xuất phát → (vượt nhẹ) → tư thế đỉnh giữ một lúc → quay về. T = [tới đỉnh, ổn định, bắt đầu quay về].
function rep(dz, down, upPart, T) {
  const A = full(dz, down, null);
  const B = full(dz, A, upPart);
  return [[0, A], [T[0], over(A, B, 1.07)], [T[1], B], [T[2], B]];
}
const curveOf = (pts) => (pts[pts.length - 1][0] < 1 ? [...pts, [1, pts[0][1]]] : pts);
const mk = (dz, base, keys) => keys.map(([t, p]) => [t, full(dz, base, p)]);

const STAND = { head: [100, 22], sh: [100, 38], hip: [100, 76], k1: [100, 104], a1: [98, 128], t1: [116, 132], k2: [100, 104], a2: [98, 128], t2: [116, 132], el: [112, 56], hd: [128, 62] };
const SUPINE = { head: [26, 119], sh: [42, 122], hip: [98, 124], el: [62, 128], hd: [84, 128] };
const STAND_Z = { k1: 9, a1: 9, t1: 9, k2: -9, a2: -9, t2: -9 };

// Thời điểm (pha) tới đỉnh / ổn định / bắt đầu quay về, dùng chung cho tư thế và cường độ cơ của từng động tác.
const T = { calf: [0.28, 0.36, 0.55], bridge: [0.32, 0.4, 0.6], squat: [0.4, 0.47, 0.55], clam: [0.35, 0.42, 0.58], fig4: [0.35, 0.45, 0.6], ankle: [0.22, 0.32, 0.62, 0.72] };
// Đường cường độ: nền lo, đạt hi lúc tới đỉnh và giữ tới lúc quay về, rồi giảm dần.
const pk = (t, lo, hi, tail = lo) => [[0, lo], [t[0], hi], [t[2], hi], [Math.min(0.97, t[2] + (1 - t[2]) * 0.55), (hi + tail) / 2], [1, lo]];

const DEFS = {
  ankle: {
    dz: { k2: -6, a2: -6, t2: -6 }, box: [8, 84, 188, 60], view: VIEW, front: { th: -1, sh: -1 }, show: 0.7,
    pose: () => {
      const dz = { k2: -6, a2: -6, t2: -6 };
      const base = { ...SUPINE, k1: [136, 124], a1: [172, 124], t1: [184, 112], k2: [136, 124], a2: [172, 124], t2: [184, 112] };
      const dorsi = { t1: [176, 104], t2: [176, 104] };
      const plant = { t1: [193, 121], t2: [193, 121] };
      return mk(dz, base, [[0, {}], [T.ankle[0], dorsi], [T.ankle[1], dorsi], [T.ankle[2], plant], [T.ankle[3], plant]]);
    },
    mus: [{ id: 'gas', lvl: 'main' }, { id: 'tib', lvl: 'extra' }],
    act: {
      gas: [[0, 0.4], [T.ankle[0], 0.1], [T.ankle[1], 0.1], [T.ankle[2], 1], [T.ankle[3], 1], [1, 0.4]],
      tib: [[0, 0.4], [T.ankle[0], 1], [T.ankle[1], 1], [T.ankle[2], 0.1], [T.ankle[3], 0.1], [1, 0.4]],
    },
  },
  calf: {
    box: [40, -6, 128, 148], view: VIEW, front: { th: -1, sh: -1 }, props: 'wall', show: 0.45,
    pose: () => rep(STAND_Z, STAND, { head: [101, 11], sh: [101, 27], hip: [101, 65], k1: [101, 93], a1: [101, 116], k2: [101, 93], a2: [101, 116], el: [113, 46], hd: [128, 54] }, T.calf),
    mus: [{ id: 'gas', lvl: 'main' }],
    act: { gas: [[0, 0.2], [T.calf[0], 1], [T.calf[2], 1], [0.78, 0.55], [1, 0.2]] },
  },
  bridge: {
    box: [8, 60, 188, 86], view: VIEW, front: { th: -1, sh: 1 }, show: 0.5,
    pose: () => rep({}, { ...SUPINE, k1: [130, 96], a1: [146, 128], t1: [160, 132], k2: [130, 96], a2: [146, 128], t2: [160, 132] }, { hip: [96, 100], k1: [132, 92], k2: [132, 92] }, T.bridge),
    mus: [{ id: 'gmax', lvl: 'main', off: [-2, 7, 0] }, { id: 'ham', lvl: 'extra' }],
    act: { gmax: pk(T.bridge, 0.15, 1), ham: pk(T.bridge, 0.1, 0.6) },
  },
  clam: {
    // Nằm nghiêng nhìn 3/4 từ trên cao phía trước: gối hướng về người xem, hai gót chạm nhau, gối trên mở ra như vỏ sò.
    dz: {}, box: [10, 56, 160, 90], view: [0.5, 0.4], front: { th: -1, sh: -1 }, show: 0.5, floor: [96, 140],
    pose: () => rep({}, {
      head: [28, 92, 0], sh: [46, 98, 0], hip: [98, 102, 0], el: [58, 106, 14], hd: [36, 98, 12],
      k1: [104, 96, 34], a1: [128, 100, 10], t1: [138, 100, 8], k2: [104, 108, 34], a2: [128, 108, 10], t2: [138, 108, 8],
    }, { k1: [102, 74, 24] }, T.clam),
    mus: [{ id: 'gmed', lvl: 'main', off: [-2, -8, 0] }],
    act: { gmed: pk(T.clam, 0.15, 1) },
  },
  squat: {
    box: [40, -6, 128, 148], view: VIEW, front: { th: -1, sh: -1 }, show: 0.5,
    pose: () => rep(STAND_Z, { ...STAND, el: [106, 58], hd: [110, 76] }, { head: [104, 52], sh: [98, 66], hip: [80, 100], k1: [112, 102], k2: [112, 102], el: [116, 74], hd: [134, 72] }, T.squat),
    mus: [{ id: 'quad', lvl: 'main' }, { id: 'gmax', lvl: 'main', off: [-6, 3, 0] }, { id: 'ham', lvl: 'extra' }],
    act: {
      quad: [[0, 0.15], [T.squat[0], 0.85], [T.squat[2], 0.85], [0.8, 1], [1, 0.15]],
      gmax: [[0, 0.15], [T.squat[0], 0.6], [T.squat[2], 0.6], [0.8, 1], [1, 0.15]],
      ham: [[0, 0.1], [T.squat[0], 0.45], [T.squat[2], 0.45], [0.8, 0.7], [1, 0.1]],
    },
  },
  fig4: {
    // Nằm ngửa nhìn 3/4: chân gác mở gối ra phía người xem, mắt cá gác lên gối chân kia thành hình số 4.
    dz: {}, box: [10, 56, 160, 90], view: [0.5, 0.4], front: { th: -1, sh: -1 }, show: 0.5, floor: [92, 140],
    pose: () => rep({}, {
      head: [26, 100, 0], sh: [44, 106, 0], hip: [98, 110, 0], el: [74, 116, 12], hd: [116, 86, -2],
      k2: [122, 84, -4], a2: [144, 112, -4], t2: [156, 114, -4],
      k1: [104, 86, 34], a1: [122, 78, 2], t1: [134, 74, 0],
    }, { k2: [114, 80, -4], a2: [136, 106, -4], hd: [110, 82, -2], k1: [100, 84, 36], a1: [114, 74, 2], t1: [126, 70, 0] }, T.fig4),
    mus: [{ id: 'gmax', lvl: 'stretch', off: [0, 5, 16] }, { id: 'pir', lvl: 'stretch', off: [-2, 3, 20], rot: -25 }],
    act: { gmax: [[0, 0.5], [T.fig4[0], 1], [T.fig4[2], 1], [0.85, 0.7], [1, 0.5]], pir: [[0, 0.6], [T.fig4[0], 1], [T.fig4[2], 1], [0.85, 0.75], [1, 0.6]] },
  },
  calf1: {
    box: [40, -6, 128, 148], view: VIEW, front: { th: -1, sh: -1 }, props: 'wall', show: 0.45,
    pose: () => rep(STAND_Z, { ...STAND, k2: [106, 102], a2: [88, 114], t2: [80, 122] }, { head: [101, 11], sh: [101, 27], hip: [101, 65], k1: [101, 93], a1: [101, 116], k2: [107, 91], a2: [89, 103], t2: [81, 111], el: [113, 46], hd: [128, 54] }, T.calf),
    mus: [{ id: 'gas', lvl: 'main' }],
    act: { gas: [[0, 0.2], [T.calf[0], 1], [T.calf[2], 1], [0.78, 0.55], [1, 0.2]] },
  },
  bridge1: {
    box: [8, 60, 188, 86], view: VIEW, front: { th: -1, sh: 1 }, show: 0.5,
    pose: () => rep({}, { ...SUPINE, k1: [130, 96], a1: [146, 128], t1: [160, 132], k2: [132, 112], a2: [164, 100], t2: [170, 90] }, { hip: [96, 100], k1: [132, 92], k2: [132, 90], a2: [166, 80], t2: [172, 70] }, T.bridge),
    mus: [{ id: 'gmax', lvl: 'main', off: [-2, 7, 0] }, { id: 'ham', lvl: 'extra' }],
    act: { gmax: pk(T.bridge, 0.15, 1), ham: pk(T.bridge, 0.1, 0.6) },
  },
  split: {
    box: [30, -6, 128, 148], view: VIEW, front: { th: -1, sh: -1 }, show: 0.5,
    pose: () => rep({ k1: 6, a1: 6, t1: 6, k2: -6, a2: -6, t2: -6 }, { head: [100, 22], sh: [100, 38], hip: [100, 76], k1: [120, 102], a1: [122, 128], t1: [140, 132], k2: [84, 104], a2: [66, 124], t2: [70, 132], el: [104, 58], hd: [106, 76] }, { head: [100, 44], sh: [100, 60], hip: [100, 98], k1: [128, 100], k2: [86, 124], a2: [62, 118], el: [104, 80], hd: [106, 98] }, T.squat),
    mus: [{ id: 'quad', lvl: 'main' }, { id: 'gmax', lvl: 'main', off: [-6, 3, 0] }],
    act: {
      quad: [[0, 0.15], [T.squat[0], 0.85], [T.squat[2], 0.85], [0.8, 1], [1, 0.15]],
      gmax: [[0, 0.15], [T.squat[0], 0.6], [T.squat[2], 0.6], [0.8, 1], [1, 0.15]],
    },
  },
};

// Dữ liệu công khai cho app và test: id → { keys: [[pha, tư thế]], mus, act, ... }
export const FIG = {};
for (const [id, d] of Object.entries(DEFS)) {
  FIG[id] = { ...d, keys: d.pose().map(([t, p]) => [t, p]), act: Object.fromEntries(Object.entries(d.act).map(([k, v]) => [k, curveOf(v)])) };
  delete FIG[id].pose;
  FIG[id].keys.push([1, FIG[id].keys[0][1]]);
}

// ---- Nội suy: Hermite theo chu kỳ, tiếp tuyến bằng 0 ở cực trị / đoạn giữ yên.
function tangents(ts, vs) {
  const n = ts.length;
  const m = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    const pi = i === 0 ? n - 2 : i - 1;
    const ni = i === n - 1 ? 1 : i + 1;
    const dtp = i === 0 ? ts[0] + 1 - ts[n - 2] : ts[i] - ts[pi];
    const dtn = i === n - 1 ? 1 - ts[n - 1] + ts[1] : ts[ni] - ts[i];
    const a = vs[i] - vs[pi], b = vs[ni] - vs[i];
    m[i] = a * b <= 0 ? 0 : (a + b) / (dtp + dtn);
  }
  m[n - 1] = m[0];
  return m;
}
function series(ts, vs) { return { ts, vs, ms: tangents(ts, vs) }; }
function sample(s, ph) {
  const { ts, vs, ms } = s;
  let i = 0;
  while (i < ts.length - 2 && ph >= ts[i + 1]) i++;
  const h = ts[i + 1] - ts[i];
  const u = h > 0 ? (ph - ts[i]) / h : 0;
  const u2 = u * u, u3 = u2 * u;
  return (2 * u3 - 3 * u2 + 1) * vs[i] + (u3 - 2 * u2 + u) * h * ms[i] + (-2 * u3 + 3 * u2) * vs[i + 1] + (u3 - u2) * h * ms[i + 1];
}
const cache = {};
function compiled(id) {
  if (cache[id]) return cache[id];
  const f = FIG[id];
  const ts = f.keys.map((k) => k[0]);
  const pose = {};
  for (const j of JOINTS) pose[j] = [0, 1, 2].map((c) => series(ts, f.keys.map((k) => k[1][j][c])));
  const act = {};
  for (const [m, pts] of Object.entries(f.act)) act[m] = series(pts.map((p) => p[0]), pts.map((p) => p[1]));
  return (cache[id] = { pose, act });
}
const wrap = (p) => ((p % 1) + 1) % 1;

export function poseAt(id, ph) {
  const c = compiled(id), [kx, ky] = FIG[id].view;
  const out = {};
  for (const j of JOINTS) {
    const q = wrap(ph - LAG[j]);
    const [x, y, z] = c.pose[j].map((s) => sample(s, q));
    out[j] = [x + z * kx, y + z * ky, z];
  }
  return out;
}
export function activationAt(id, m, ph) {
  const v = sample(compiled(id).act[m], wrap(ph));
  return Math.max(0, Math.min(1, v));
}

// ---- Hình học.
const r1 = (v) => Math.round(v * 10) / 10;
function capsule(P, Q, w1, w2) {
  const dx = Q[0] - P[0], dy = Q[1] - P[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len), ny = (dx / len);
  const a = [P[0] + nx * w1, P[1] + ny * w1], b = [Q[0] + nx * w2, Q[1] + ny * w2];
  const c = [Q[0] - nx * w2, Q[1] - ny * w2], d = [P[0] - nx * w1, P[1] - ny * w1];
  return `M${r1(a[0])} ${r1(a[1])}L${r1(b[0])} ${r1(b[1])}A${r1(w2)} ${r1(w2)} 0 0 0 ${r1(c[0])} ${r1(c[1])}L${r1(d[0])} ${r1(d[1])}A${r1(w1)} ${r1(w1)} 0 0 0 ${r1(a[0])} ${r1(a[1])}Z`;
}
const disc = (C, r) => `M${r1(C[0] - r)} ${r1(C[1])}a${r} ${r} 0 1 0 ${2 * r} 0a${r} ${r} 0 1 0 ${-2 * r} 0Z`;
const prof = (s, k) => Math.sin(Math.PI * Math.pow(s, k));

function segMuscle(P, Q, w1, w2, def, side, v, lvl) {
  const dx = Q[0] - P[0], dy = Q[1] - P[1];
  const len = Math.hypot(dx, dy) || 1;
  const nx = (-dy / len) * side, ny = (dx / len) * side;
  let [u0, u1] = def.u;
  if (lvl === 'stretch') { u0 = Math.max(0, u0 - 0.05 * v); u1 = Math.min(1, u1 + 0.05 * v); }
  const N = 10, up = [], lo = [], str = [[], [], []];
  for (let i = 0; i <= N; i++) {
    const s = i / N, u = u0 + (u1 - u0) * s;
    const w = w1 + (w2 - w1) * u;
    const io = 0.1 * w;
    const kk = lvl === 'stretch' ? 0.95 : 0.95 + 0.6 * v;
    const oo = io + w * prof(s, def.k) * kk;
    const bx = P[0] + dx * u, by = P[1] + dy * u;
    up.push(`${r1(bx + nx * oo)} ${r1(by + ny * oo)}`);
    lo.push(`${r1(bx + nx * io)} ${r1(by + ny * io)}`);
    [0.3, 0.55, 0.8].forEach((f, k) => str[k].push(`${r1(bx + nx * (io + (oo - io) * f))} ${r1(by + ny * (io + (oo - io) * f))}`));
  }
  const d = `M${up.join('L')}L${lo.reverse().join('L')}Z`;
  const d2 = lvl === 'stretch' ? str.map((p) => `M${p.join('L')}`).join('') : '';
  return { d, d2 };
}

function blob(C, rx, ry, rot, lvl, v) {
  let a = rx, b = ry;
  if (lvl === 'stretch') { a *= 1 + 0.3 * v; b *= 1 - 0.12 * v; } else { a *= 1 + 0.2 * v; b *= 1 + 0.2 * v; }
  const cs = Math.cos(rot), sn = Math.sin(rot);
  const p1 = [C[0] - a * cs, C[1] - a * sn], p2 = [C[0] + a * cs, C[1] + a * sn];
  const deg = r1((rot * 180) / Math.PI);
  const d = `M${r1(p1[0])} ${r1(p1[1])}A${r1(a)} ${r1(b)} ${deg} 1 0 ${r1(p2[0])} ${r1(p2[1])}A${r1(a)} ${r1(b)} ${deg} 1 0 ${r1(p1[0])} ${r1(p1[1])}Z`;
  let d2 = '';
  if (lvl === 'stretch') {
    for (const o of [-0.5, 0, 0.5]) {
      const h = a * Math.sqrt(Math.max(0, 1 - (o * 0.9) * (o * 0.9)));
      const ox = -sn * o * b, oy = cs * o * b;
      d2 += `M${r1(C[0] + ox - h * cs)} ${r1(C[1] + oy - h * sn)}L${r1(C[0] + ox + h * cs)} ${r1(C[1] + oy + h * sn)}`;
    }
  }
  return { d, d2 };
}

// ---- Danh sách phần tử SVG theo thứ tự vẽ (xa → gần). Mỗi phần tử: { tag, cls, a: thuộc tính ở pha ph }.
function layout(id) {
  const f = FIG[id];
  const items = [];
  const L = (cls, parts) => items.push({ kind: 'limb', cls, parts });
  L('limb far', ['ft2']); L('limb far', ['sh2']); L('limb far', ['th2']);
  items.push({ kind: 'trunk', cls: 'limb' });
  items.push({ kind: 'head', cls: 'headc' });
  L('limb', ['th1']);
  for (const m of f.mus) if (MUSC[m.id].seg === 'th') items.push({ kind: 'mus', m });
  for (const m of f.mus) if (MUSC[m.id].blob) items.push({ kind: 'mus', m });
  L('limb', ['sh1']);
  for (const m of f.mus) if (MUSC[m.id].seg === 'sh') items.push({ kind: 'mus', m });
  L('limb', ['ft1']); L('limb', ['ua']); L('limb', ['fa']);
  return items;
}

export function frameOps(id, ph) {
  const f = FIG[id];
  const P = poseAt(id, ph);
  const ops = [];
  const torso = Math.atan2(P.hip[1] - P.sh[1], P.hip[0] - P.sh[0]);
  for (const it of layout(id)) {
    if (it.kind === 'limb') {
      const [p, q, w1, w2] = SEG[it.parts[0]];
      ops.push({ tag: 'path', cls: it.cls, a: { d: capsule(P[p], P[q], w1, w2) } });
    } else if (it.kind === 'trunk') {
      ops.push({ tag: 'path', cls: it.cls, a: { d: capsule(P.sh, P.hip, 10, 9) + disc(P.sh, 10) + disc(P.hip, 9.6) } });
    } else if (it.kind === 'head') {
      ops.push({ tag: 'circle', cls: it.cls, a: { cx: r1(P.head[0]), cy: r1(P.head[1]), r: 10.5 } });
    } else {
      const def = MUSC[it.m.id], lvl = it.m.lvl;
      const v = activationAt(id, it.m.id, ph);
      let sh;
      if (def.blob) {
        const [ox, oy, oz] = it.m.off;
        const [kx, ky] = f.view;
        const C = [P.hip[0] + ox + oz * kx, P.hip[1] + oy + oz * ky];
        sh = blob(C, def.rx, def.ry, torso + ((it.m.rot || 0) * Math.PI) / 180, lvl, v);
      } else {
        const [p, q, w1, w2] = SEG[`${def.seg}1`];
        const side = (def.side === 'front' ? 1 : -1) * f.front[def.seg === 'th' ? 'th' : 'sh'];
        sh = segMuscle(P[p], P[q], w1, w2, def, side, v, lvl);
      }
      const op = lvl === 'stretch' ? 0.35 + 0.55 * v : 0.3 + 0.65 * v;
      ops.push({ tag: 'path', cls: `mus ${lvl}${def.deep ? ' deep' : ''}`, a: { d: sh.d, opacity: r1(op * 100) / 100 } });
      ops.push({ tag: 'path', cls: `musl ${lvl}`, a: { d: sh.d2, 'stroke-dashoffset': r1(-ph * 60) } });
    }
  }
  return ops;
}

const attrs = (a) => Object.entries(a).map(([k, v]) => `${k}="${v}"`).join(' ');

// Trả về chuỗi SVG ở tư thế đỉnh (hình tĩnh); app gọi startFigures để cho chuyển động.
// dur = thời gian một lượt (giây), khớp nhịp đếm của trình dẫn tập.
export function figureSvg(id, dur = 2.5) {
  const f = FIG[id];
  if (!f) return '';
  let out = `<svg class="fig" viewBox="${f.box.join(' ')}" data-fig="${id}" data-dur="${dur}" role="img" aria-label="Hình minh hoạ động tác và nhóm cơ tác động">`;
  const [bx, , bw] = f.box;
  if (f.floor) out += `<rect class="floor" x="${bx + 4}" y="${f.floor[0]}" width="${bw - 8}" height="${f.floor[1] - f.floor[0]}" rx="10"/>`;
  else out += `<line class="ground" x1="${bx + 4}" y1="${GROUND + 5}" x2="${bx + bw - 4}" y2="${GROUND + 5}"/>`;
  if (f.props === 'wall') out += `<line class="ground" x1="134" y1="20" x2="134" y2="${GROUND + 5}"/>`;
  for (const op of frameOps(id, f.show)) out += `<${op.tag} class="${op.cls}" ${attrs(op.a)}/>`;
  return out + '</svg>';
}

// ---- Chạy chuyển động: một vòng requestAnimationFrame chung cho mọi hình đang hiện.
const live = new Map();
let raf = 0, last = 0;
const still = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function paint(svg, s) {
  const ops = frameOps(s.id, wrap(s.t / s.dur));
  const els = svg.querySelectorAll('.limb, .headc, .mus, .musl');
  for (let i = 0; i < ops.length && i < els.length; i++) for (const k in ops[i].a) els[i].setAttribute(k, ops[i].a[k]);
}
function tick(now) {
  raf = 0;
  const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
  last = now;
  for (const [svg, s] of live) {
    if (!svg.isConnected) { live.delete(svg); continue; }
    if (s.paused) continue;
    s.t += dt;
    paint(svg, s);
  }
  if (live.size) raf = requestAnimationFrame(tick); else last = 0;
}
export function startFigures(root = document) {
  if (typeof requestAnimationFrame !== 'function' || still()) return;
  root.querySelectorAll('svg.fig[data-fig]').forEach((svg) => {
    if (live.has(svg) || !FIG[svg.dataset.fig]) return;
    live.set(svg, { id: svg.dataset.fig, dur: Number(svg.dataset.dur) || 3, t: 0, paused: false });
  });
  if (!raf && live.size) raf = requestAnimationFrame(tick);
}
export function pauseFigure(svg, paused) {
  const s = live.get(svg);
  if (s) s.paused = paused;
}

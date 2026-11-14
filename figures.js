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

// Bộ xương chuẩn (tỉ lệ Loomis, đầu ≈ 1/7,5 chiều cao; đơn vị khung hình): thân vai–hông 38, cổ 17, đùi 30, cẳng chân 28, bàn chân 19, cánh tay 23, cẳng tay 21.
// Toạ độ trong từng tư thế chỉ là MỤC TIÊU: hông là gốc; vai, đầu, mũi chân chỉ cho hướng; cổ chân và bàn tay là điểm đích;
// gối và khuỷu là gợi ý phía gập. Độ dài xương giữ nguyên, chân tay tự giải bằng động học ngược.
const STAND = { head: [100, 15], sh: [100, 32], hip: [100, 70], k1: [103, 98], a1: [98, 127.4], t1: [116, 132], k2: [103, 98], a2: [98, 127.4], t2: [116, 132], el: [104, 53], hd: [102, 74] };
const WALL = { el: [112, 50], hd: [128, 54] };
const SUPINE = { head: [43, 127], sh: [60, 128], hip: [98, 128], el: [78, 130], hd: [101, 133] };
const STAND_Z = { k1: 9, a1: 9, t1: 9, k2: -9, a2: -9, t2: -9 };

// Thời điểm (pha) tới đỉnh / ổn định / bắt đầu quay về, dùng chung cho tư thế và cường độ cơ của từng động tác.
const T = { calf: [0.28, 0.36, 0.55], bridge: [0.32, 0.4, 0.6], squat: [0.4, 0.47, 0.55], clam: [0.35, 0.42, 0.58], fig4: [0.35, 0.45, 0.6], ankle: [0.22, 0.32, 0.62, 0.72] };
// Đường cường độ: nền lo, đạt hi lúc tới đỉnh và giữ tới lúc quay về, rồi giảm dần.
const pk = (t, lo, hi, tail = lo) => [[0, lo], [t[0], hi], [t[2], hi], [Math.min(0.97, t[2] + (1 - t[2]) * 0.55), (hi + tail) / 2], [1, lo]];

const DEFS = {
  ankle: {
    box: [8, 92, 188, 52], view: VIEW, front: { th: -1, sh: -1, tr: -1 }, show: 0.7,
    pose: () => {
      const dz = { k2: -6, a2: -6, t2: -6 };
      const leg = { k1: [127, 128.5], a1: [155, 131], k2: [127, 128.5], a2: [155, 131] };
      const base = { ...SUPINE, ...leg, t1: [162, 113], t2: [162, 113], hd: [100, 133] };
      const dorsi = { t1: [152, 112], t2: [152, 112] };
      const plant = { t1: [172, 127], t2: [172, 127] };
      return mk(dz, base, [[0, {}], [T.ankle[0], dorsi], [T.ankle[1], dorsi], [T.ankle[2], plant], [T.ankle[3], plant]]);
    },
    mus: [{ id: 'sol', lvl: 'main' }, { id: 'gas', lvl: 'main' }, { id: 'tib', lvl: 'extra' }],
    act: {
      sol: [[0, 0.4], [T.ankle[0], 0.1], [T.ankle[1], 0.1], [T.ankle[2], 1], [T.ankle[3], 1], [1, 0.4]],
      gas: [[0, 0.4], [T.ankle[0], 0.1], [T.ankle[1], 0.1], [T.ankle[2], 1], [T.ankle[3], 1], [1, 0.4]],
      tib: [[0, 0.4], [T.ankle[0], 1], [T.ankle[1], 1], [T.ankle[2], 0.1], [T.ankle[3], 0.1], [1, 0.4]],
    },
  },
  calf: {
    box: [40, -10, 128, 150], view: VIEW, front: { th: -1, sh: -1, tr: -1 }, props: 'wall', show: 0.45,
    pose: () => rep(STAND_Z, { ...STAND, ...WALL }, { head: [101, 4], sh: [101, 21], hip: [101, 59], k1: [104, 88], a1: [103, 116.5], k2: [104, 88], a2: [103, 116.5] }, T.calf),
    mus: [{ id: 'sol', lvl: 'main' }, { id: 'gas', lvl: 'main' }],
    act: { sol: [[0, 0.2], [T.calf[0], 1], [T.calf[2], 1], [0.78, 0.55], [1, 0.2]], gas: [[0, 0.2], [T.calf[0], 1], [T.calf[2], 1], [0.78, 0.55], [1, 0.2]] },
  },
  bridge: {
    box: [8, 56, 188, 90], view: VIEW, front: { th: -1, sh: 1, tr: -1 }, show: 0.5,
    pose: () => rep({}, { ...SUPINE, k1: [123, 106], a1: [130, 132.4], t1: [148, 137], k2: [123, 106], a2: [130, 132.4], t2: [148, 137] }, { hip: [94, 111], k1: [123, 105], k2: [123, 105] }, T.bridge),
    mus: [{ id: 'gmax', lvl: 'main' }, { id: 'ham', lvl: 'extra' }],
    act: { gmax: pk(T.bridge, 0.15, 1), ham: pk(T.bridge, 0.1, 0.6) },
  },
  clam: {
    // Nằm nghiêng nhìn từ trên cao phía trước: đùi chĩa về phía người xem, cẳng chân gập về sau, hai gót chạm nhau (đỉnh chữ V); gối trên mở lên như vỏ sò.
    dz: {}, box: [10, 44, 160, 96], view: [0.35, 0.65], front: { th: -1, sh: -1, tr: 1 }, show: 0.5, floor: [86, 130], cue: 'k1',
    pose: () => rep({}, {
      head: [38, 70, 0], sh: [60, 76, 0], hip: [98, 80, 0], el: [66, 84, 12], hd: [48, 78, 10],
      k1: [105, 74, 29], a1: [125, 76, 9], t1: [144, 76, 8], k2: [105, 84, 29], a2: [125, 84, 9], t2: [144, 84, 8],
    }, { k1: [104, 50, 24] }, T.clam),
    mus: [{ id: 'gmed', lvl: 'main' }],
    act: { gmed: pk(T.clam, 0.15, 1) },
  },
  squat: {
    box: [40, -10, 128, 150], view: VIEW, front: { th: -1, sh: -1, tr: -1 }, show: 0.5,
    pose: () => rep(STAND_Z, STAND, { head: [103, 48], sh: [97, 65], hip: [82, 98], k1: [112, 102], k2: [112, 102], el: [118, 64], hd: [134, 64] }, T.squat),
    mus: [{ id: 'quad', lvl: 'main' }, { id: 'gmax', lvl: 'main' }, { id: 'ham', lvl: 'extra' }],
    act: {
      quad: [[0, 0.15], [T.squat[0], 0.85], [T.squat[2], 0.85], [0.8, 1], [1, 0.15]],
      gmax: [[0, 0.15], [T.squat[0], 0.6], [T.squat[2], 0.6], [0.8, 1], [1, 0.15]],
      ham: [[0, 0.1], [T.squat[0], 0.45], [T.squat[2], 0.45], [0.8, 0.7], [1, 0.1]],
    },
  },
  fig4: {
    // Nằm ngửa nhìn từ trên cao phía trước: chân dưới co gối, mắt cá chân gác lên gối đó, gối chân gác đổ ra phía người xem thành hình số 4; hai tay ôm đùi chân dưới.
    dz: {}, box: [10, 44, 160, 96], view: [0.2, 0.7], front: { th: -1, sh: -1, tr: -1 }, show: 0.5, floor: [88, 134],
    pose: () => rep({}, {
      head: [43, 100, 0], sh: [60, 102, 0], hip: [98, 104, 0], el: [78, 96, 14], hd: [102, 82, -2],
      k2: [106, 76, -4], a2: [126, 107, -4], t2: [144, 112, -4],
      k1: [96, 92, 30], a1: [108, 70, 2], t1: [124, 66, 0],
    }, { k2: [100, 72, -4], a2: [120, 104, -4], hd: [97, 80, -2], k1: [94, 90, 32], a1: [102, 66, 2], t1: [118, 62, 0] }, T.fig4),
    mus: [{ id: 'gmax', lvl: 'stretch' }, { id: 'pir', lvl: 'stretch' }],
    act: { gmax: [[0, 0.5], [T.fig4[0], 1], [T.fig4[2], 1], [0.85, 0.7], [1, 0.5]], pir: [[0, 0.6], [T.fig4[0], 1], [T.fig4[2], 1], [0.85, 0.75], [1, 0.6]] },
  },
  calf1: {
    box: [40, -10, 128, 150], view: VIEW, front: { th: -1, sh: -1, tr: -1 }, props: 'wall', show: 0.45,
    pose: () => rep(STAND_Z, { ...STAND, ...WALL, k2: [108, 97], a2: [84, 108], t2: [76, 114] }, { head: [101, 4], sh: [101, 21], hip: [101, 59], k1: [104, 88], a1: [103, 116.5], k2: [109, 87], a2: [86, 97], t2: [78, 103] }, T.calf),
    mus: [{ id: 'sol', lvl: 'main' }, { id: 'gas', lvl: 'main' }],
    act: { sol: [[0, 0.2], [T.calf[0], 1], [T.calf[2], 1], [0.78, 0.55], [1, 0.2]], gas: [[0, 0.2], [T.calf[0], 1], [T.calf[2], 1], [0.78, 0.55], [1, 0.2]] },
  },
  bridge1: {
    box: [8, 46, 188, 100], view: VIEW, front: { th: -1, sh: 1, tr: -1 }, show: 0.5,
    pose: () => rep({}, { ...SUPINE, k1: [123, 106], a1: [130, 132.4], t1: [148, 137], k2: [124, 116], a2: [150, 104], t2: [154, 86] }, { hip: [94, 111], k1: [123, 105], k2: [120, 103], a2: [146, 96], t2: [150, 78] }, T.bridge),
    mus: [{ id: 'gmax', lvl: 'main' }, { id: 'ham', lvl: 'extra' }],
    act: { gmax: pk(T.bridge, 0.15, 1), ham: pk(T.bridge, 0.1, 0.6) },
  },
  split: {
    box: [30, -10, 128, 150], view: VIEW, front: { th: -1, sh: -1, tr: -1 }, show: 0.5,
    pose: () => rep({ k1: 6, a1: 6, t1: 6, k2: -6, a2: -6, t2: -6 }, { head: [100, 15], sh: [100, 32], hip: [100, 70], k1: [119, 98], a1: [124, 127.4], t1: [142, 132], k2: [84, 97], a2: [64, 123], t2: [74, 132], el: [104, 53], hd: [104, 74] }, { head: [100, 45], sh: [100, 62], hip: [100, 100], k1: [128, 100], a1: [124, 127.4], k2: [86, 126], a2: [66, 121], hd: [104, 94] }, T.squat),
    mus: [{ id: 'quad', lvl: 'main' }, { id: 'gmax', lvl: 'main' }],
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

const LEN = { tr: 38, nk: 17, th: 30, sh: 28, ft: 19, ua: 23, fa: 21 };
// Động học ngược hai xương: gốc R, đích T, gợi ý phía gập K0 → khớp giữa và đầu mút (rút ngắn nếu đích quá xa).
function ik(R, T, K0, l1, l2) {
  const d0 = [T[0] - R[0], T[1] - R[1], T[2] - R[2]];
  const d = Math.hypot(...d0) || 1e-6;
  const u = d0.map((v) => v / d);
  const dd = Math.max(Math.abs(l1 - l2) + 0.5, Math.min(l1 + l2 - 0.3, d));
  const a = (l1 * l1 - l2 * l2 + dd * dd) / (2 * dd);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  let hv = [K0[0] - R[0], K0[1] - R[1], K0[2] - R[2]];
  const pr = hv[0] * u[0] + hv[1] * u[1] + hv[2] * u[2];
  hv = hv.map((v, i) => v - u[i] * pr);
  let hl = Math.hypot(...hv);
  if (hl < 1e-3) { hv = [-u[1], u[0], 0]; hl = Math.hypot(hv[0], hv[1]) || 1; }
  hv = hv.map((v) => v / hl);
  return [R.map((r, i) => r + u[i] * a + hv[i] * h), R.map((r, i) => r + u[i] * dd)];
}
const toward = (from, to, len) => { const v = to.map((x, i) => x - from[i]); const l = Math.hypot(...v) || 1; return from.map((x, i) => x + (v[i] / l) * len); };

export function poseAt(id, ph) {
  const c = compiled(id), [kx, ky] = FIG[id].view;
  const raw = {};
  for (const j of JOINTS) {
    const q = wrap(ph - LAG[j]);
    raw[j] = c.pose[j].map((s) => sample(s, q));
  }
  const P = { hip: raw.hip };
  P.sh = toward(P.hip, raw.sh, LEN.tr);
  P.head = toward(P.sh, raw.head, LEN.nk);
  for (const n of ['1', '2']) {
    const [k, a] = ik(P.hip, raw[`a${n}`], raw[`k${n}`], LEN.th, LEN.sh);
    P[`k${n}`] = k; P[`a${n}`] = a;
    P[`t${n}`] = toward(a, raw[`t${n}`], LEN.ft);
  }
  const [el, hd] = ik(P.sh, raw.hd, raw.el, LEN.ua, LEN.fa);
  P.el = el; P.hd = hd;
  const out = {};
  for (const j of JOINTS) { const [x, y, z] = P[j]; out[j] = [x + z * kx, y + z * ky, z]; }
  return out;
}
export function activationAt(id, m, ph) {
  const v = sample(compiled(id).act[m], wrap(ph));
  return Math.max(0, Math.min(1, v));
}

// ---- Giải phẫu bề mặt.
// Đường viền mỗi đoạn chi là bề dày thật theo chiều dọc xương (u = 0 ở khớp gần, 1 ở khớp xa): [u, nửa bề dày phía trước, phía sau] tính bằng đơn vị khung hình.
// Tỉ lệ theo Loomis / Bridgman (đùi tròn, đầu gối vuông, bắp chân hình nêm ở phía sau, gân gót thon) và giải phẫu bề mặt của Gray's Anatomy.
const PROFILE = {
  tr: [[-0.3, 3.4, 3.8], [-0.12, 6, 6.5], [0, 8.6, 9], [0.2, 9.6, 8.4], [0.45, 7.6, 7.4], [0.7, 8, 9.4], [0.9, 8.4, 11], [1, 8, 11.5], [1.14, 6.4, 9.6]],
  th: [[-0.22, 3, 3], [-0.14, 6.2, 6.8], [0, 8, 8.6], [0.2, 8.7, 8], [0.45, 8.2, 6.9], [0.7, 6.9, 5.7], [0.92, 5.3, 4.9], [1.05, 5, 4.7]],
  sh: [[-0.16, 3.5, 3.5], [-0.09, 4.8, 4.7], [0, 5, 5], [0.12, 4.4, 6.3], [0.28, 3.9, 7.1], [0.45, 3.6, 6.2], [0.65, 3.1, 4.3], [0.85, 2.9, 3.2], [1.05, 3.2, 3.4]],
  ua: [[-0.13, 2.2, 2.2], [-0.06, 4.2, 4.1], [0.5, 4, 4.2], [1.04, 3.2, 3.3]],
  fa: [[-0.12, 2.4, 2.4], [-0.05, 3.5, 3.5], [0.35, 3.6, 3.7], [0.85, 2.5, 2.5], [1.14, 2.3, 2.3], [1.2, 1.2, 1.2]],
};
// Hàm Hermite cho đường viền: nội suy trơn giữa các mẫu.
function curve1(us, vs) {
  const n = us.length;
  const m = us.map((_, i) => (i === 0 ? (vs[1] - vs[0]) / (us[1] - us[0]) : i === n - 1 ? (vs[n - 1] - vs[n - 2]) / (us[n - 1] - us[n - 2]) : (vs[i + 1] - vs[i - 1]) / (us[i + 1] - us[i - 1])));
  return (u) => {
    const x = Math.max(us[0], Math.min(us[n - 1], u));
    let i = 0;
    while (i < n - 2 && x > us[i + 1]) i++;
    const h = us[i + 1] - us[i], t = (x - us[i]) / h, t2 = t * t, t3 = t2 * t;
    return (2 * t3 - 3 * t2 + 1) * vs[i] + (t3 - 2 * t2 + t) * h * m[i] + (-2 * t3 + 3 * t2) * vs[i + 1] + (t3 - t2) * h * m[i + 1];
  };
}
const PF = {};
for (const [k, p] of Object.entries(PROFILE)) PF[k] = { u0: p[0][0], u1: p[p.length - 1][0], f: curve1(p.map((r) => r[0]), p.map((r) => r[1])), b: curve1(p.map((r) => r[0]), p.map((r) => r[2])) };

// Bó cơ. Cơ dọc đoạn chi: pts = [u, phần trong, phần ngoài] theo tỉ lệ bề dày da phía side (0 = trục xương, 1 = mặt da); fib = các đường sợi cơ [u, tỉ lệ];
// bump = [u đỉnh, độ rộng, biên độ]: da phồng lên bấy nhiêu khi cơ co. Cơ vùng chậu: pts là các điểm neo ['p', dọc thân, phía lưng] hoặc ['t', u trên đùi, tỉ lệ bề dày (âm = phía sau)].
const MUSC = {
  sol: { seg: 'sh', side: 'back', name: 'Cơ dép', pts: [[0.3, 0.2, 0.62], [0.42, 0.14, 0.7], [0.56, 0.16, 0.76], [0.7, 0.28, 0.84], [0.82, 0.5, 0.88]], fib: [[[0.35, 0.35], [0.55, 0.36], [0.76, 0.6]]], bump: [0.5, 0.14, 0.5] },
  gas: { seg: 'sh', side: 'back', name: 'Cơ sinh đôi (hai đầu)', pts: [[0, 0.5, 0.85], [0.07, 0.3, 0.95], [0.2, 0.1, 0.98], [0.34, 0.12, 0.97], [0.46, 0.3, 0.94], [0.56, 0.55, 0.9], [0.64, 0.78, 0.88]], fib: [[[0.04, 0.7], [0.25, 0.7], [0.52, 0.8]], [[0.06, 0.42], [0.28, 0.4], [0.56, 0.62]]], bump: [0.24, 0.16, 1.4] },
  tib: { seg: 'sh', side: 'front', name: 'Cơ chày trước', pts: [[0.05, 0.35, 0.8], [0.15, 0.2, 0.95], [0.4, 0.2, 0.95], [0.65, 0.35, 0.9], [0.85, 0.55, 0.82]], fib: [[[0.1, 0.55], [0.45, 0.58], [0.8, 0.7]]], bump: [0.35, 0.2, 0.5] },
  quad: { seg: 'th', side: 'front', name: 'Cơ tứ đầu đùi', pts: [[0.06, 0.45, 0.85], [0.14, 0.15, 0.96], [0.35, 0.05, 0.98], [0.6, 0.12, 0.97], [0.8, 0.3, 0.92], [0.95, 0.6, 0.85]], fib: [[[0.1, 0.5], [0.45, 0.45], [0.88, 0.7]], [[0.15, 0.86], [0.5, 0.9], [0.85, 0.82]]], bump: [0.5, 0.2, 1] },
  ham: { seg: 'th', side: 'back', name: 'Cơ đùi sau', pts: [[0.1, 0.5, 0.85], [0.18, 0.2, 0.96], [0.4, 0.08, 0.98], [0.6, 0.15, 0.97], [0.8, 0.4, 0.9], [0.93, 0.6, 0.85]], fib: [[[0.15, 0.6], [0.5, 0.5], [0.88, 0.75]], [[0.2, 0.88], [0.55, 0.85], [0.85, 0.8]]], bump: [0.5, 0.2, 0.8] },
  gmax: { pel: true, name: 'Cơ mông lớn', pts: [['p', -13, 3.5], ['p', -9, 9], ['p', -2, 11], ['p', 4.5, 9.6], ['t', 0.22, -0.9], ['t', 0.06, -0.15], ['p', -4, 1.5]], fib: [[1, 4], [2, 4], [0, 5], [3, 4]], bump: [0.95, 0.15, 1.2] },
  gmed: { pel: true, name: 'Cơ mông nhỡ', pts: [['p', -12, 2.5], ['p', -9, 7.5], ['p', -3, 10], ['p', 3, 8], ['t', 0.1, -0.6], ['p', 0, 2]], fib: [[0, 4], [1, 4], [2, 4], [3, 4]], bump: [0.9, 0.14, 0.6] },
  pir: { pel: true, deep: true, name: 'Cơ hình lê', pts: [['p', -8, 6.4], ['p', -8.6, 8.4], ['p', 0, 6], ['p', 1.2, 3.6]], fib: [[0, 3]], bump: null },
};
export const MUSCLE_NAMES = Object.fromEntries(Object.entries(MUSC).map(([k, v]) => [k, v.name]));

// ---- Hình học.
const r1 = (v) => Math.round(v * 10) / 10;
const unit = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
// Đường cong kín Catmull-Rom → Bézier bậc ba.
function smooth(pts) {
  const n = pts.length;
  let d = `M${r1(pts[0][0])} ${r1(pts[0][1])}`;
  for (let i = 0; i < n; i++) {
    const p0 = pts[(i + n - 1) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
    d += `C${r1(p1[0] + (p2[0] - p0[0]) / 6)} ${r1(p1[1] + (p2[1] - p0[1]) / 6)} ${r1(p2[0] - (p3[0] - p1[0]) / 6)} ${r1(p2[1] - (p3[1] - p1[1]) / 6)} ${r1(p2[0])} ${r1(p2[1])}`;
  }
  return `${d}Z`;
}
// Khung toạ độ của một đoạn: P → Q, F = hướng "phía trước" (đơn vị) theo dấu sf.
function frame(P, Q, sf) {
  const [dx, dy] = unit(P, Q);
  return { P, Q, d: [dx, dy], F: [-dy * sf, dx * sf] };
}
const at = (fr, u, w) => [fr.P[0] + (fr.Q[0] - fr.P[0]) * u + fr.F[0] * w, fr.P[1] + (fr.Q[1] - fr.P[1]) * u + fr.F[1] * w];
const gauss = (u, [u0, sw, amp]) => amp * Math.exp(-(((u - u0) / sw) ** 2));

// Đường viền một đoạn chi, da phồng thêm theo các cơ đang co (bumps: [{side, spec, k}]).
function limb(fr, key, bumps = []) {
  const p = PF[key];
  const wf = (u) => p.f(u) + bumps.reduce((a, b) => (b.side === 'front' ? a + b.k * gauss(u, b.spec) : a), 0);
  const wb = (u) => p.b(u) + bumps.reduce((a, b) => (b.side === 'back' ? a + b.k * gauss(u, b.spec) : a), 0);
  const N = 9, front = [], back = [];
  for (let i = 0; i <= N; i++) {
    const u = p.u0 + ((p.u1 - p.u0) * i) / N;
    front.push(at(fr, u, wf(u)));
    back.push(at(fr, u, -wb(u)));
  }
  return { d: smooth([...front, ...back.reverse()]), wf, wb, fr };
}

// Bàn chân: gót, vòm, ngón; sàn chân cách tâm cổ chân h, mặt mu chân quay lên trên.
function foot(A, T) {
  const h = 4.6;
  const v = [T[0] - A[0], T[1] - A[1]];
  let x = unit([0, 0], v), D = [x[1], -x[0]];
  if (D[1] > 0) D = [-D[0], -D[1]];
  for (let k = 0; k < 3; k++) {
    x = unit([0, 0], [v[0] + D[0] * h, v[1] + D[1] * h]);
    D = [x[1], -x[0]];
    if (D[1] > 0) D = [-D[0], -D[1]];
  }
  const s = Math.hypot(v[0] + D[0] * h, v[1] + D[1] * h);
  const loc = [[-3, 3.2], [-4.8, -0.4], [-5.2, -3], [-3.8, -h], [s * 0.4, -h + 0.6], [s - 2.4, -h], [s + 0.5, -h + 0.9], [s + 0.3, -h + 2.3], [s - 3.6, -h + 3.5], [s * 0.55, 0.8], [3, 2.6], [3.6, 3.8]];
  return smooth(loc.map(([a, b]) => [A[0] + x[0] * a + D[0] * b, A[1] + x[1] * a + D[1] * b]));
}

// Đầu: hộp sọ, trán, mũi, cằm, nhìn nghiêng; hướng mặt theo ngực.
function headPath(H, S, F) {
  const up = unit(S, H);
  const loc = [[10.2, -0.5], [9.4, 4.2], [6.2, 7.4], [2.8, 8], [0.4, 8.6], [-1.6, 10.6], [-2.8, 8.6], [-4.6, 8.2], [-7.4, 6.2], [-8.6, 2.4], [-6.6, -2.6], [-3, -6.2], [0.6, -9.2], [5.6, -8.4], [9, -4.6]];
  return smooth(loc.map(([a, w]) => [H[0] + up[0] * a + F[0] * w, H[1] + up[1] * a + F[1] * w]));
}

// Hình bó cơ dọc đoạn chi: vùng giữa lớp trong và lớp ngoài (tỉ lệ bề dày da), và các đường sợi cơ.
function segMuscle(L, def, v, lvl) {
  const sign = def.side === 'front' ? 1 : -1;
  const W = (u) => (def.side === 'front' ? L.wf(u) : L.wb(u));
  const interp = (u, c) => {
    const a = def.pts;
    if (u <= a[0][0]) return a[0][c];
    for (let i = 0; i < a.length - 1; i++) if (u <= a[i + 1][0]) { const t = (u - a[i][0]) / (a[i + 1][0] - a[i][0]); return a[i][c] + (a[i + 1][c] - a[i][c]) * t; }
    return a[a.length - 1][c];
  };
  const u0 = def.pts[0][0], u1 = def.pts[def.pts.length - 1][0];
  const ext = lvl === 'stretch' ? 0.04 * v : 0;
  const N = 8, out = [], inn = [];
  for (let i = 0; i <= N; i++) {
    const u = u0 - ext + ((u1 - u0 + 2 * ext) * i) / N;
    out.push(at(L.fr, u, sign * W(u) * interp(Math.max(u0, Math.min(u1, u)), 2) * 0.97));
    inn.push(at(L.fr, u, sign * W(u) * interp(Math.max(u0, Math.min(u1, u)), 1)));
  }
  const d = smooth([...out, ...inn.reverse()]);
  const d2 = def.fib.map((line) => `M${line.map(([u, f]) => { const p = at(L.fr, u, sign * W(u) * f); return `${r1(p[0])} ${r1(p[1])}`; }).join('L')}`).join('');
  return { d, d2 };
}

// Hình bó cơ vùng chậu: các điểm neo gắn với khung chậu và đùi.
function pelMuscle(def, ctx, v, lvl) {
  const { hip, dT, bk, thFr, thW } = ctx;
  const pts = def.pts.map(([kind, a, b]) => (kind === 'p'
    ? [hip[0] + dT[0] * a + bk[0] * b, hip[1] + dT[1] * a + bk[1] * b]
    : at(thFr, a, b * thW(a, b))));
  const c = pts.reduce((s, q) => [s[0] + q[0] / pts.length, s[1] + q[1] / pts.length], [0, 0]);
  const sc = lvl === 'stretch' ? 1 : 1 + 0.1 * v;
  const along = lvl === 'stretch' ? 1 + 0.18 * v : 1;
  const across = lvl === 'stretch' ? 1 - 0.06 * v : 1;
  const ax = unit(pts[0], pts[Math.floor(pts.length / 2)]);
  const tf = (q) => {
    const dx = q[0] - c[0], dy = q[1] - c[1];
    const pa = dx * ax[0] + dy * ax[1], pe = dx * -ax[1] + dy * ax[0];
    return [c[0] + (ax[0] * pa * along - ax[1] * pe * across) * sc, c[1] + (ax[1] * pa * along + ax[0] * pe * across) * sc];
  };
  const P = pts.map(tf);
  const d = smooth(P);
  const d2 = def.fib.map(([i, j]) => `M${r1(P[i][0])} ${r1(P[i][1])}L${r1(P[j][0])} ${r1(P[j][1])}`).join('');
  return { d, d2 };
}

// ---- Danh sách phần tử SVG theo thứ tự vẽ (xa → gần). Mỗi phần tử: { tag, cls, a: thuộc tính ở pha ph }.
// Mỗi nhóm vẽ viền trước rồi tô sau, nên chỗ các đoạn chi chồng lên nhau liền khối, không lộ đường nối.
export function frameOps(id, ph) {
  const f = FIG[id];
  const P = poseAt(id, ph);
  const sf = f.front;
  const ops = [];
  const act = {};
  for (const m of f.mus) act[m.id] = activationAt(id, m.id, ph);
  const bumpsOf = (host) => f.mus.filter((m) => MUSC[m.id].seg === host && m.lvl !== 'stretch' && MUSC[m.id].bump).map((m) => ({ side: MUSC[m.id].side, spec: MUSC[m.id].bump, k: act[m.id] }));
  // trục thân và khung các đoạn
  const trFr = frame(P.sh, P.hip, sf.tr);
  const gl = f.mus.filter((m) => MUSC[m.id].pel && m.lvl !== 'stretch');
  const trunk = limb(trFr, 'tr', gl.map((m) => ({ side: 'back', spec: MUSC[m.id].bump, k: act[m.id] })));
  const th1 = limb(frame(P.hip, P.k1, sf.th), 'th', bumpsOf('th'));
  const sh1 = limb(frame(P.k1, P.a1, sf.sh), 'sh', bumpsOf('sh'));
  const th2 = limb(frame(P.hip, P.k2, sf.th), 'th');
  const sh2 = limb(frame(P.k2, P.a2, sf.sh), 'sh');
  const ua = limb(frame(P.sh, P.el, 1), 'ua');
  const fa = limb(frame(P.el, P.hd, 1), 'fa');
  const Ftr = trFr.F;
  const group = (cls, items) => {
    for (const it of items) ops.push({ tag: 'path', cls: `ol ${cls}`, a: { d: it } });
    for (const it of items) ops.push({ tag: 'path', cls: `sk ${cls}`, a: { d: it } });
  };
  group('far', [th2.d, sh2.d, foot(P.a2, P.t2)]);
  group('', [trunk.d, headPath(P.head, P.sh, Ftr)]);
  group('leg', [th1.d, sh1.d, foot(P.a1, P.t1)]);
  const pelCtx = { hip: P.hip, dT: trFr.d, bk: [-Ftr[0], -Ftr[1]], thFr: th1.fr, thW: (u, b) => (b >= 0 ? th1.wf(u) : th1.wb(u)) };
  const hostOf = (m) => (MUSC[m.id].pel ? 0 : MUSC[m.id].seg === 'th' ? 1 : 2);
  for (const m of [...f.mus].sort((a, b) => hostOf(a) - hostOf(b))) {
    const def = MUSC[m.id], lvl = m.lvl, v = act[m.id];
    const sh = def.pel ? pelMuscle(def, pelCtx, v, lvl) : segMuscle(def.seg === 'th' ? th1 : sh1, def, v, lvl);
    const op = lvl === 'stretch' ? 0.35 + 0.55 * v : 0.22 + 0.7 * v;
    ops.push({ tag: 'path', cls: `mus ${lvl}${def.deep ? ' deep' : ''}`, a: { d: sh.d, opacity: r1(op * 100) / 100 } });
    ops.push({ tag: 'path', cls: `musl ${lvl}`, a: { d: sh.d2, 'stroke-dashoffset': r1(-ph * 60), opacity: r1((0.25 + 0.6 * v) * 100) / 100 } });
  }
  group('arm', [ua.d, fa.d]);
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
  if (f.cue) {
    // Mũi tên gợi ý hướng chuyển động của khớp chính (từ tư thế xuất phát tới tư thế đỉnh).
    const A = poseAt(id, 0)[f.cue], B = poseAt(id, f.show)[f.cue];
    const mx = (A[0] + B[0]) / 2 + (B[1] - A[1]) * 0.35, my = (A[1] + B[1]) / 2 - (B[0] - A[0]) * 0.35;
    const ang = Math.atan2(B[1] - my, B[0] - mx), hx = r1(B[0]), hy = r1(B[1]);
    const w = (t) => `${r1(hx - 5 * Math.cos(ang + t))} ${r1(hy - 5 * Math.sin(ang + t))}`;
    out += `<path class="cue" d="M${r1(A[0])} ${r1(A[1])}Q${r1(mx)} ${r1(my)} ${hx} ${hy}M${w(0.45)}L${hx} ${hy}L${w(-0.45)}"/>`;
  }
  for (const op of frameOps(id, f.show)) out += `<${op.tag} class="${op.cls}" ${attrs(op.a)}/>`;
  return out + '</svg>';
}

// ---- Chạy chuyển động: một vòng requestAnimationFrame chung cho mọi hình đang hiện.
const live = new Map();
let raf = 0, last = 0;
const still = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function paint(svg, s) {
  const ops = frameOps(s.id, wrap(s.t / s.dur));
  const els = svg.querySelectorAll('.ol, .sk, .mus, .musl');
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

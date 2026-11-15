// Hình giải phẫu bóc da cho từng động tác chân: bóng da trong suốt, khung xương nét mảnh, từng đầu cơ có thớ và gân; cơ sáng theo pha co – thả.
// Mọi thứ là hàm thuần theo pha 0–1 của một lượt (pha 0 = tư thế xuất phát, quay lại pha 1 = pha 0):
//   poseAt(id, pha)           toạ độ các khớp (xương chuẩn độ dài không đổi, chân tay giải bằng động học ngược; đã chiếu xiên ra khung hình, kèm độ sâu z)
//   activationAt(id, m, pha)  cường độ 0–1 của bó cơ m (cơ co: mức co; cơ giãn: mức kéo giãn)
//   frameOps(id, pha)         danh sách phần tử SVG (da, xương, cơ, gân) và thuộc tính ở pha đó; số phần tử và thứ tự không đổi giữa các pha
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
    box: [76, 94, 122, 46], crop: true, view: VIEW, front: { th: -1, sh: -1, tr: -1 }, show: 0.7,
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
    box: [40, -10, 128, 150], ground: 132.8, view: VIEW, front: { th: -1, sh: -1, tr: -1 }, props: 'wall', show: 0.45,
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
    dz: {}, box: [10, 44, 160, 96], view: [0.35, 0.65], front: { th: -1, sh: -1, tr: 1 }, show: 0.5, floor: [86, 130], cue: 'k1', ctx: false,
    pose: () => rep({}, {
      head: [38, 70, 0], sh: [60, 76, 0], hip: [98, 80, 0], el: [66, 84, 12], hd: [48, 78, 10],
      k1: [105, 74, 29], a1: [125, 76, 9], t1: [144, 76, 8], k2: [105, 84, 29], a2: [125, 84, 9], t2: [144, 84, 8],
    }, { k1: [104, 50, 24] }, T.clam),
    mus: [{ id: 'gmed', lvl: 'main' }],
    act: { gmed: pk(T.clam, 0.15, 1) },
  },
  squat: {
    box: [40, -10, 128, 150], ground: 132.8, view: VIEW, front: { th: -1, sh: -1, tr: -1 }, show: 0.5,
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
    dz: {}, box: [10, 44, 160, 96], view: [0.2, 0.7], front: { th: -1, sh: -1, tr: -1 }, show: 0.5, floor: [88, 134], ctx: false,
    pose: () => rep({}, {
      head: [43, 100, 0], sh: [60, 102, 0], hip: [98, 104, 0], el: [78, 96, 14], hd: [102, 82, -2],
      k2: [106, 76, -4], a2: [126, 107, -4], t2: [144, 112, -4],
      k1: [96, 92, 30], a1: [108, 70, 2], t1: [124, 66, 0],
    }, { k2: [100, 72, -4], a2: [120, 104, -4], hd: [97, 80, -2], k1: [94, 90, 32], a1: [102, 66, 2], t1: [118, 62, 0] }, T.fig4),
    mus: [{ id: 'gmax', lvl: 'stretch' }, { id: 'pir', lvl: 'stretch' }],
    act: { gmax: [[0, 0.5], [T.fig4[0], 1], [T.fig4[2], 1], [0.85, 0.7], [1, 0.5]], pir: [[0, 0.6], [T.fig4[0], 1], [T.fig4[2], 1], [0.85, 0.75], [1, 0.6]] },
  },
  calf1: {
    box: [40, -10, 128, 150], ground: 132.8, view: VIEW, front: { th: -1, sh: -1, tr: -1 }, props: 'wall', show: 0.45,
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
    box: [30, -10, 128, 150], ground: 132.8, view: VIEW, front: { th: -1, sh: -1, tr: -1 }, show: 0.5,
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

// ---- Giải phẫu bóc da (kiểu Albinus / Vesalius): bóng da mờ, khung xương nét mảnh, từng đầu cơ có thớ và gân bám xương.
// Đường viền da: bề dày thật theo chiều dọc xương (u = 0 ở khớp gần, 1 ở khớp xa): [u, nửa bề dày phía trước, phía sau].
// Tỉ lệ theo Loomis / Bridgman và giải phẫu bề mặt của Gray's Anatomy.
const PROFILE = {
  tr: [[-0.3, 3.4, 3.8], [-0.12, 6, 6.5], [0, 8.6, 9], [0.2, 9.6, 8.4], [0.45, 7.6, 7.4], [0.7, 8, 9.4], [0.9, 8.4, 11], [1, 8, 11.5], [1.14, 6.4, 9.6]],
  th: [[-0.22, 3, 3], [-0.14, 6.2, 6.8], [0, 8, 8.6], [0.2, 8.7, 8], [0.45, 8.2, 6.9], [0.7, 6.9, 5.7], [0.92, 5.3, 4.9], [1.05, 5, 4.7]],
  sh: [[-0.16, 3.5, 3.5], [-0.09, 4.8, 4.7], [0, 5, 5], [0.12, 4.4, 6.3], [0.28, 3.9, 7.1], [0.45, 3.6, 6.2], [0.65, 3.1, 4.3], [0.85, 2.9, 3.2], [1.05, 3.2, 3.4]],
  ua: [[-0.13, 2.2, 2.2], [-0.06, 4.2, 4.1], [0.5, 4, 4.2], [1.04, 3.2, 3.3]],
  fa: [[-0.12, 2.4, 2.4], [-0.05, 3.5, 3.5], [0.35, 3.6, 3.7], [0.85, 2.5, 2.5], [1.14, 2.3, 2.3], [1.2, 1.2, 1.2]],
};
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

// Bó cơ. Mỗi cơ gồm một hay nhiều đầu (part). m = mã cơ (cường độ và mức màu lấy theo m).
//  host 't' đùi, 's' cẳng chân: pts = [u, phần trong, phần ngoài] theo tỉ lệ bề dày da phía side; style 'pen' = cơ lông chim.
//  host 'p' (vùng chậu): o = các điểm bám gốc, i = các điểm bám tận; điểm neo: ['p', dọc thân, phía lưng] · ['t'|'s', u, tỉ lệ bề dày (âm = phía sau)] · ['f', x, y] trên bàn chân.
//  tend = gân nối đầu cơ với điểm bám xương. Xếp từ sâu ra nông (vẽ lần lượt).
const PARTS = [
  { m: 'pir', host: 'p', deep: true, n: 2, o: [['p', -8, 5.8], ['p', -8.4, 8]], i: [['t', 0.02, -0.3], ['t', 0.05, -0.42]] },
  { m: 'gmed', host: 'p', n: 7, o: [['p', -14, 2], ['p', -12.5, 6.5], ['p', -7, 9.5], ['p', -2, 9.6]], i: [['t', 0, -0.3], ['t', 0.06, -0.62]] },
  { m: 'sol', host: 's', side: 'back', style: 'pen', n: 4, pts: [[0.1, 0.05, 0.55], [0.22, 0, 0.64], [0.4, 0, 0.7], [0.55, 0.05, 0.62], [0.64, 0.25, 0.55]], tend: [{ at: 'end', to: ['f', -4.5, -1.4], w: 1.6 }] },
  { m: 'tib', host: 's', side: 'front', n: 4, pts: [[0.04, 0.3, 0.72], [0.12, 0.12, 0.9], [0.35, 0.1, 0.94], [0.58, 0.2, 0.86], [0.78, 0.4, 0.76]], tend: [{ at: 'end', to: ['f', 7.5, 0.6], w: 1.3 }] },
  { m: 'vm', host: 't', side: 'front', n: 4, pts: [[0.5, 0.35, 0.8], [0.62, 0.2, 0.93], [0.8, 0.12, 0.95], [0.95, 0.3, 0.86]], tend: [{ at: 'end', to: ['t', 1, 0.85], w: 1.4 }] },
  { m: 'rf', host: 't', side: 'front', style: 'pen', n: 4, pts: [[0.1, 0.35, 0.75], [0.2, 0.2, 0.92], [0.4, 0.2, 0.95], [0.62, 0.3, 0.9], [0.78, 0.5, 0.8]], tend: [{ at: 'start', to: ['p', -5, -7.8], w: 1.4 }, { at: 'end', to: ['t', 1, 0.85], w: 1.5 }] },
  { m: 'vl', host: 't', side: 'front', n: 7, pts: [[0.08, 0.15, 0.8], [0.2, 0, 0.97], [0.45, 0, 0.99], [0.7, 0.1, 0.96], [0.9, 0.35, 0.86]], tend: [{ at: 'end', to: ['t', 1, 0.85], w: 1.6 }] },
  { m: 'ham', host: 't', side: 'back', n: 3, pts: [[0.4, 0.2, 0.8], [0.55, 0.05, 0.92], [0.75, 0.15, 0.86]] },
  { m: 'ham', host: 't', side: 'back', style: 'pen', n: 3, pts: [[0.15, 0.45, 0.75], [0.3, 0.3, 0.86], [0.5, 0.35, 0.86]], tend: [{ at: 'end', to: ['s', 0.1, -0.3], w: 1.1 }] },
  { m: 'ham', host: 't', side: 'back', n: 6, pts: [[0.1, 0.35, 0.86], [0.2, 0.1, 0.98], [0.42, 0.05, 0.99], [0.62, 0.15, 0.96], [0.8, 0.35, 0.86]], tend: [{ at: 'start', to: ['p', 5.4, 5.6], w: 1.6 }, { at: 'end', to: ['s', 0.06, -0.55], w: 1.3 }] },
  { m: 'gas', host: 's', side: 'back', n: 5, pts: [[-0.06, 0.4, 0.7], [0.04, 0.2, 0.86], [0.2, 0.05, 0.93], [0.36, 0.1, 0.9], [0.5, 0.35, 0.8], [0.6, 0.55, 0.75]], tend: [{ at: 'end', to: ['f', -4.5, -1.4], w: 1.7 }] },
  { m: 'gas', host: 's', side: 'back', n: 6, pts: [[-0.1, 0.45, 0.8], [0, 0.28, 0.95], [0.14, 0.08, 0.99], [0.3, 0.1, 0.98], [0.45, 0.3, 0.9], [0.58, 0.55, 0.8]], tend: [{ at: 'end', to: ['f', -4.5, -1.4], w: 1.7 }] },
  { m: 'gmax', host: 'p', n: 8, o: [['p', -13, 3], ['p', -11, 8], ['p', -6, 11], ['p', 0, 11.6]], i: [['t', 0.06, -0.4], ['t', 0.16, -0.85], ['t', 0.26, -0.95]] },
];
// Dải gân (không phải cơ): dây chằng bánh chè và dải chậu chày.
const BANDS = [
  { from: ['t', 1, 0.85], to: ['s', 0.1, 0.95], w: 1.5 },
  { from: ['t', 0.12, 0.2], to: ['s', 0.06, 0.8], w: 2.2 },
];
export const MUSCLE_NAMES = {
  sol: 'Cơ dép', gas: 'Cơ sinh đôi (hai đầu)', tib: 'Cơ chày trước', quad: 'Cơ tứ đầu đùi', vl: 'Cơ rộng ngoài', vm: 'Cơ rộng trong', rf: 'Cơ thẳng đùi',
  ham: 'Nhóm đùi sau (nhị đầu, bán gân)', gmax: 'Cơ mông lớn', gmed: 'Cơ mông nhỡ', pir: 'Cơ hình lê',
};
// Mã cơ trong hình (FIG[id].mus) → các đầu cơ vẽ: 'quad' = rộng ngoài + thẳng đùi + rộng trong.
const GROUP = { quad: ['vl', 'rf', 'vm'] };

// ---- Hình học.
const r1 = (v) => Math.round(v * 10) / 10;
const unit = (a, b) => { const dx = b[0] - a[0], dy = b[1] - a[1], l = Math.hypot(dx, dy) || 1; return [dx / l, dy / l]; };
const lerp2 = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
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
function smoothOpen(pts) {
  const n = pts.length;
  let d = `M${r1(pts[0][0])} ${r1(pts[0][1])}`;
  for (let i = 0; i < n - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(n - 1, i + 2)];
    d += `C${r1(p1[0] + (p2[0] - p0[0]) / 6)} ${r1(p1[1] + (p2[1] - p0[1]) / 6)} ${r1(p2[0] - (p3[0] - p1[0]) / 6)} ${r1(p2[1] - (p3[1] - p1[1]) / 6)} ${r1(p2[0])} ${r1(p2[1])}`;
  }
  return d;
}
// Khung toạ độ của một đoạn: P → Q, F = hướng "phía trước" (đơn vị) theo dấu sf.
function frame(P, Q, sf) {
  const [dx, dy] = unit(P, Q);
  return { P, Q, d: [dx, dy], F: [-dy * sf, dx * sf] };
}
const at = (fr, u, w) => [fr.P[0] + (fr.Q[0] - fr.P[0]) * u + fr.F[0] * w, fr.P[1] + (fr.Q[1] - fr.P[1]) * u + fr.F[1] * w];
const gauss = (u, [u0, sw, amp]) => amp * Math.exp(-(((u - u0) / sw) ** 2));

// Bóng da một đoạn chi (da phồng thêm theo cơ đang co).
function limb(fr, key, bumps = []) {
  const p = PF[key];
  const wf = (u) => p.f(u);
  const wb = (u) => p.b(u);
  const N = 9, front = [], back = [];
  for (let i = 0; i <= N; i++) {
    const u = p.u0 + ((p.u1 - p.u0) * i) / N;
    front.push(at(fr, u, wf(u)));
    back.push(at(fr, u, -wb(u)));
  }
  const e = `${smoothOpen(front.slice(1, N))}${smoothOpen(back.slice(1, N))}`;
  return { d: smooth([...front, ...back.reverse()]), e, wf, wb, fr };
}

// Bàn chân: sàn chân cách tâm cổ chân h, mặt mu chân quay lên trên. Trả về đường viền và hàm đổi toạ độ cục bộ (x dọc bàn chân, y lên mu chân).
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
  const loc = (a, b) => [A[0] + x[0] * a + D[0] * b, A[1] + x[1] * a + D[1] * b];
  const pts = [[-3, 3.2], [-4.8, -0.4], [-5.2, -3], [-3.8, -h], [s * 0.4, -h + 0.6], [s - 2.4, -h], [s + 0.5, -h + 0.9], [s + 0.3, -h + 2.3], [s - 3.6, -h + 3.5], [s * 0.55, 0.8], [3, 2.6], [3.6, 3.8]];
  // khung xương bàn chân: xương gót, xương sên, ba xương bàn chân
  const bones = `${smooth([[-4.6, -3.4], [-4.4, -0.4], [-2, 0.9], [1.6, -0.4], [2.6, -3.2], [-1, -3.9]].map(([a, b]) => loc(a, b)))}${smooth([[-1, 1.6], [0.4, 2.8], [2.2, 2], [1.2, 0.6]].map(([a, b]) => loc(a, b)))}`
    + [0.6, -0.8, -2.2].map((b) => `M${loc(3, b).map(r1).join(' ')}L${loc(s - 1.5, -h + 1.4 + (b + 0.8) * 0.3).map(r1).join(' ')}`).join('');
  return { d: smooth(pts.map(([a, b]) => loc(a, b))), loc, s, h, bones };
}

// Đầu nhìn nghiêng: hộp sọ, trán, mũi, cằm; hướng mặt theo ngực. k = tỉ lệ (xương sọ nhỏ hơn bóng da).
function headPath(H, S, F, k = 1) {
  const up = unit(S, H);
  const loc = [[10.2, -0.5], [9.4, 4.2], [6.2, 7.4], [2.8, 8], [0.4, 8.6], [-1.6, 10.6], [-2.8, 8.6], [-4.6, 8.2], [-7.4, 6.2], [-8.6, 2.4], [-6.6, -2.6], [-3, -6.2], [0.6, -9.2], [5.6, -8.4], [9, -4.6]];
  return smooth(loc.map(([a, w]) => [H[0] + up[0] * a * k + F[0] * w * k, H[1] + up[1] * a * k + F[1] * w * k]));
}

// Dải giữa hai đường song song với trục đoạn: rows = [u, lệch1, lệch2] (lệch có dấu, dương = phía trước).
const band = (fr, rows) => smooth([...rows.map(([u, a]) => at(fr, u, a)), ...rows.map(([u, , b]) => at(fr, u, b)).reverse()]);
const ellipse = (C, rx, ry, rot) => {
  const cs = Math.cos(rot), sn = Math.sin(rot);
  return smooth(Array.from({ length: 8 }, (_, k) => { const a = (k * Math.PI) / 4; return [C[0] + rx * Math.cos(a) * cs - ry * Math.sin(a) * sn, C[1] + rx * Math.cos(a) * sn + ry * Math.sin(a) * cs]; }));
};

// Nội suy các điểm mẫu theo cột c của pts tại u.
function ipts(pts, u, c) {
  if (u <= pts[0][0]) return pts[0][c];
  for (let i = 0; i < pts.length - 1; i++) {
    if (u <= pts[i + 1][0]) { const t = (u - pts[i][0]) / (pts[i + 1][0] - pts[i][0]); return pts[i][c] + (pts[i + 1][c] - pts[i][c]) * t; }
  }
  return pts[pts.length - 1][c];
}
const polyAt = (P, t) => { const n = P.length - 1, x = t * n, i = Math.min(n - 1, Math.floor(x)); return lerp2(P[i], P[i + 1], x - i); };
// Dải gân thon dần từ p (rộng w) tới q (hẹp).
function tendonPath(p, q, w) {
  const [dx, dy] = unit(p, q);
  const nx = -dy, ny = dx;
  return `M${r1(p[0] + nx * w * 0.5)} ${r1(p[1] + ny * w * 0.5)}L${r1(q[0] + nx * 0.3)} ${r1(q[1] + ny * 0.3)}L${r1(q[0] - nx * 0.3)} ${r1(q[1] - ny * 0.3)}L${r1(p[0] - nx * w * 0.5)} ${r1(p[1] - ny * w * 0.5)}Z`;
}

// Đầu cơ dọc đoạn chi: thân cơ, sợi cơ (thoi hoặc lông chim) và gân.
function segPart(L, part, v, lvl, anchor) {
  const sign = part.side === 'front' ? 1 : -1;
  const W = (u) => (part.side === 'front' ? L.wf(u) : L.wb(u));
  const u0 = part.pts[0][0], u1 = part.pts[part.pts.length - 1][0];
  const stretch = lvl === 'stretch';
  const ext = stretch ? 0.04 * v : 0;
  const N = 9, out = [], inn = [];
  for (let i = 0; i <= N; i++) {
    const u = u0 - ext + ((u1 - u0 + 2 * ext) * i) / N, uc = Math.max(u0, Math.min(u1, u));
    const fb = Math.min(1.12, ipts(part.pts, uc, 2) * (stretch ? 1 : 1 + 0.12 * v));
    out.push(at(L.fr, u, sign * W(u) * fb));
    inn.push(at(L.fr, u, sign * W(u) * ipts(part.pts, uc, 1)));
  }
  const d = smooth([...out, ...inn.slice().reverse()]);
  let fib = '';
  if (part.style === 'pen') {
    const ctr = out.map((o, i) => lerp2(inn[i], o, 0.5));
    fib = smoothOpen(ctr);
    for (let j = 1; j < N; j++) fib += `M${ctr[j].map(r1).join(' ')}L${out[Math.min(N, j + 1)].map(r1).join(' ')}M${ctr[j].map(r1).join(' ')}L${inn[Math.min(N, j + 1)].map(r1).join(' ')}`;
  } else {
    for (let k = 1; k <= part.n; k++) fib += smoothOpen(out.map((o, i) => lerp2(inn[i], o, k / (part.n + 1))));
  }
  let tdn = '';
  for (const t of part.tend || []) {
    const e = t.at === 'end' ? N : 0;
    tdn += tendonPath(lerp2(inn[e], out[e], 0.5), anchor(t.to), t.w);
  }
  return { d, fib, tdn };
}

// Đầu cơ vùng chậu (hình quạt): nối chuỗi điểm bám gốc với chuỗi điểm bám tận; thớ cơ toả từ gốc về tận.
function polyPart(part, v, lvl, anchor) {
  const O = part.o.map(anchor), I = part.i.map(anchor);
  const pts = [...O, ...I.slice().reverse()];
  const c = pts.reduce((s, q) => [s[0] + q[0] / pts.length, s[1] + q[1] / pts.length], [0, 0]);
  const ax = unit(polyAt(O, 0.5), polyAt(I, 0.5));
  const stretch = lvl === 'stretch';
  const along = stretch ? 1 + 0.16 * v : 1, across = stretch ? 1 - 0.05 * v : 1 + 0.08 * v;
  const tf = (q) => {
    const dx = q[0] - c[0], dy = q[1] - c[1];
    const pa = dx * ax[0] + dy * ax[1], pe = -dx * ax[1] + dy * ax[0];
    return [c[0] + ax[0] * pa * along - ax[1] * pe * across, c[1] + ax[1] * pa * along + ax[0] * pe * across];
  };
  const O2 = O.map(tf), I2 = I.map(tf);
  const d = smooth([...O2, ...I2.slice().reverse()]);
  let fib = '';
  for (let k = 0; k <= part.n + 1; k++) {
    const t = k / (part.n + 1);
    fib += `M${polyAt(O2, t).map(r1).join(' ')}L${polyAt(I2, t).map(r1).join(' ')}`;
  }
  return { d, fib, tdn: '' };
}

// ---- Danh sách phần tử SVG theo thứ tự vẽ. Mỗi phần tử: { tag, cls, a: thuộc tính ở pha ph }; số phần tử và thứ tự không đổi giữa các pha.
export function frameOps(id, ph) {
  const f = FIG[id];
  const P = poseAt(id, ph);
  const sf = f.front;
  const ops = [];
  const act = {}, lvlOf = {};
  for (const m of f.mus) { act[m.id] = activationAt(id, m.id, ph); lvlOf[m.id] = m.lvl; }
  const trFr = frame(P.sh, P.hip, sf.tr);
  const trunk = limb(trFr, 'tr');
  const th1 = limb(frame(P.hip, P.k1, sf.th), 'th');
  const sh1 = limb(frame(P.k1, P.a1, sf.sh), 'sh');
  const th2 = limb(frame(P.hip, P.k2, sf.th), 'th');
  const sh2 = limb(frame(P.k2, P.a2, sf.sh), 'sh');
  const ua = limb(frame(P.sh, P.el, 1), 'ua');
  const fa = limb(frame(P.el, P.hd, 1), 'fa');
  const ft1 = foot(P.a1, P.t1), ft2 = foot(P.a2, P.t2);
  const Ftr = trFr.F, bk = [-Ftr[0], -Ftr[1]];
  const pel = (d, b) => [P.hip[0] + trFr.d[0] * d + bk[0] * b, P.hip[1] + trFr.d[1] * d + bk[1] * b];
  const anchor = ([k, a, b]) => {
    if (k === 'p') return pel(a, b);
    if (k === 't') return at(th1.fr, a, b * (b >= 0 ? th1.wf(a) : th1.wb(a)));
    if (k === 's') return at(sh1.fr, a, b * (b >= 0 ? sh1.wf(a) : sh1.wb(a)));
    return ft1.loc(a, b);
  };
  const push = (cls, d, extra = {}) => ops.push({ tag: 'path', cls, a: { d, ...extra } });
  const shadow = (cls, items) => {
    for (const it of items) push(`ol ${cls}`, it.e || it.d || it);
    for (const it of items) push(`sk ${cls}`, it.d || it);
  };
  // 1. chân xa: bóng da và vài nét xương
  shadow('far', [th2, sh2, ft2]);
  push('bone far', band(th2.fr, [[-0.04, 3.2, -3.2], [0.2, 2.1, -2.1], [0.8, 2.2, -2.4], [0.97, 3.6, -3.8]]));
  push('bone far', band(sh2.fr, [[-0.02, 3.6, -3.6], [0.3, 1.9, -2.2], [0.94, 2.5, -2.6]]));
  // 2. bóng da thân, đầu, chân gần
  shadow('', [trunk, headPath(P.head, P.sh, Ftr)]);
  shadow('leg', [th1, sh1, ft1]);
  // 3. khung xương
  const spine = [0.96, 0.84, 0.72, 0.6, 0.48, 0.36, 0.24, 0.12, 0, -0.12].map((u) => at(trFr, u, -0.5 * trunk.wb(u)));
  push('bone', smooth([pel(-14, 2), pel(-12, 8.8), pel(-5, 10.2), pel(1.5, 9), pel(5.6, 6.6), pel(6.4, 2.6), pel(4.5, -2.6), pel(2, -5.4), pel(-1.5, -4.2), pel(-6, -8.2), pel(-12, -6.6)]));
  push('bone spine', smoothOpen(spine));
  push('bone', band(trFr, [[0, 4.5, -4.5], [0.06, 7.5, -6.8], [0.2, 8, -7], [0.34, 6.8, -6], [0.44, 4.2, -4.6]]));
  push('bone rib', [0.12, 0.2, 0.28, 0.36].map((u) => `M${at(trFr, u, 6.4).map(r1).join(' ')}Q${at(trFr, u + 0.03, 0).map(r1).join(' ')} ${at(trFr, u - 0.01, -5.6).map(r1).join(' ')}`).join(''));
  push('bone', headPath(P.head, P.sh, Ftr, 0.84));
  push('bone', band(th1.fr, [[-0.04, 3.2, -3.2], [0.05, 2.6, -3.4], [0.2, 2.1, -2.1], [0.5, 1.9, -1.9], [0.8, 2.2, -2.4], [0.96, 3.6, -3.8], [1.03, 3, -3]]));
  push('bone', `${ellipse(P.hip, 3.4, 3.4, 0)}${ellipse(at(th1.fr, 1, 0.8 * th1.wf(1)), 2.4, 1.8, Math.atan2(th1.fr.d[1], th1.fr.d[0]) + Math.PI / 2)}`);
  push('bone', band(sh1.fr, [[-0.02, 3.6, -3.6], [0.06, 2.5, -2.8], [0.3, 1.9, -2.2], [0.7, 1.7, -2], [0.94, 2.5, -2.6], [1.03, 2.6, -2.8]]));
  push('bone', band(sh1.fr, [[0.05, -2.2, -3.8], [0.3, -2.6, -3.6], [0.8, -2.8, -3.9], [1.02, -2.2, -4.2]]));
  push('bone', ft1.bones);
  push('bone', band(ua.fr, [[0, 2.8, -2.8], [0.5, 1.5, -1.5], [1, 2.4, -2.4]]));
  push('bone', `${band(fa.fr, [[0, 2, -0.2], [0.5, 1.2, -0.5], [1, 1.6, 0.4]])}${band(fa.fr, [[0, 0.2, -2], [0.5, -0.1, -1.4], [1, -0.4, -1.4]])}`);
  // 4. cơ, từ sâu ra nông
  const parts = PARTS.filter((p) => f.ctx !== false || p.host === 'p');
  for (const part of parts) {
    const grpOf = Object.keys(GROUP).find((g) => GROUP[g].includes(part.m));
    const key = f.mus.some((m) => m.id === part.m) ? part.m : f.mus.some((m) => m.id === grpOf) ? grpOf : null;
    const lvl = key ? lvlOf[key] : 'ctx';
    const v = key ? act[key] : 0;
    const L = part.host === 's' ? sh1 : th1;
    const r = part.host === 'p' ? polyPart(part, v, lvl, anchor) : segPart(L, part, v, lvl, anchor);
    const op = lvl === 'ctx' ? 1 : lvl === 'stretch' ? 0.35 + 0.55 * v : 0.22 + 0.7 * v;
    if (key) push(`musg ${lvl}`, r.d, { opacity: r1(v * 0.45 * 100) / 100 });
    else push('musg ctx', r.d, { opacity: 0 });
    push(`mus ${lvl}${part.deep ? ' deep' : ''}`, r.d, { opacity: r1(op * 100) / 100 });
    push(`musl ${lvl}`, r.fib, { 'stroke-dashoffset': r1(-ph * 60), opacity: lvl === 'ctx' ? 1 : r1((0.3 + 0.6 * v) * 100) / 100 });
    push(`tdn ${lvl}`, r.tdn);
  }
  if (f.ctx !== false) for (const b of BANDS) push('tdn ctx', tendonPath(anchor(b.from), anchor(b.to), b.w));
  // 5. tay (bóng da) ở lớp trên cùng
  shadow('arm', [ua, { d: fa.d }]);
  return ops;
}

const attrs = (a) => Object.entries(a).map(([k, v]) => `${k}="${v}"`).join(' ');

// Trả về chuỗi SVG ở tư thế đỉnh (hình tĩnh); app gọi startFigures để cho chuyển động.
// dur = thời gian một lượt (giây), khớp nhịp đếm của trình dẫn tập.
export function figureSvg(id, dur = 2.5) {
  const f = FIG[id];
  if (!f) return '';
  let out = `<svg class="fig" viewBox="${f.box.join(' ')}" data-fig="${id}" data-dur="${dur}" role="img" aria-label="Hình minh hoạ động tác và nhóm cơ tác động"><defs><linearGradient id="fskin" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e8f0ff" stop-opacity=".34"/><stop offset="1" stop-color="#9fb4d6" stop-opacity=".07"/></linearGradient><linearGradient id="ffar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9fb4d6" stop-opacity=".16"/><stop offset="1" stop-color="#6f86ad" stop-opacity=".03"/></linearGradient></defs>`;
  const [bx, , bw] = f.box;
  if (f.floor) out += `<rect class="floor" x="${bx + 4}" y="${f.floor[0]}" width="${bw - 8}" height="${f.floor[1] - f.floor[0]}" rx="10"/>`;
  else out += `<line class="ground" x1="${bx + 4}" y1="${f.ground ?? GROUND + 5}" x2="${bx + bw - 4}" y2="${f.ground ?? GROUND + 5}"/>`;
  if (f.props === 'wall') out += `<line class="ground" x1="134" y1="20" x2="134" y2="${f.ground ?? GROUND + 5}"/>`;
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
  const els = svg.querySelectorAll('.ol, .sk, .bone, .musg, .mus, .musl, .tdn');
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

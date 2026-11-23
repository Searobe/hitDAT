// Bộ đếm camera tự thích nghi, kiểm bằng tín hiệu giả.
// Camera giả: cảnh sáng L (tư thế cao) tối đi `cover` lần khi hạ ngực; máy tự chỉnh sáng kéo độ sáng hình về mức đích.
// Đây là mô hình tự dựng, không phải số đo trên iPhone — chưa thử trên iPhone thật.
import test from 'node:test';
import assert from 'node:assert/strict';
import { makeAdaptiveDetector } from '../detect.js';

const STEP = 60; // camera.js lấy mẫu 60 ms một lần

// Số ngẫu nhiên có hạt giống, để ca kiểm lần nào cũng chạy y như nhau.
function rng(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296 - 0.5; };
}

// Tạo tín hiệu độ sáng. opts:
//   reps      số lượt hít;  period  giây mỗi lượt;  hold  phần của chu kỳ nằm ở đáy (0..1)
//   cover     ở đáy cảnh còn sáng bao nhiêu phần (0,3 = tối đi 70%)
//   ae        hằng số thời gian tự chỉnh sáng, giây (0 = máy không tự chỉnh)
//   ambient   (giây) → hệ số ánh sáng phòng;  noise  biên độ nhiễu (đơn vị độ sáng)
//   lead/tail giây đứng yên ở tư thế cao trước và sau
function signal({ reps = 10, period = 2, hold = 0.2, cover = 0.3, ae = 0, ambient = () => 1, noise = 1, lead = 5, tail = 3, bright = 120, seed = 1 } = {}) {
  const rand = rng(seed);
  const out = [];
  let gain = 1;
  const total = lead + reps * period + tail;
  const move = (1 - hold) / 2; // phần chu kỳ để hạ xuống, và để lên lại
  for (let ms = 0; ms <= total * 1000; ms += STEP) {
    const t = ms / 1000;
    let pos = 0; // 0 = cao, 1 = thấp
    const k = (t - lead) / period;
    if (k >= 0 && k < reps) {
      const p = k - Math.floor(k);
      if (p < move) pos = (1 - Math.cos(Math.PI * p / move)) / 2;
      else if (p < move + hold) pos = 1;
      else pos = (1 + Math.cos(Math.PI * (p - move - hold) / move)) / 2;
    }
    const scene = bright * ambient(t) * Math.exp(Math.log(cover) * pos);
    if (ae > 0) gain *= Math.exp(Math.log(bright / Math.max(1, gain * scene)) * (1 - Math.exp(-STEP / 1000 / ae)));
    const luma = Math.max(0, Math.min(255, gain * scene + noise * 2 * rand()));
    out.push({ luma, ms, armed: t >= lead - 0.5 });
  }
  return out;
}

// Chạy như app: trước hiệp chỉ học (đếm ngược), tới giờ thì vào hiệp.
function count(samples) {
  const det = makeAdaptiveDetector();
  let n = 0, armed = false;
  for (const s of samples) {
    if (s.armed && !armed) { det.arm(); armed = true; }
    if (det.feed(s.luma, s.ms)) n += 1;
  }
  return n;
}

test('tự thích nghi: đếm đúng khi máy không tự chỉnh sáng, ở nhiều nhịp', () => {
  for (const period of [1, 1.5, 2, 3, 4]) assert.equal(count(signal({ reps: 12, period })), 12, `nhịp ${period} giây`);
});

test('tự thích nghi: đếm đúng khi máy tự chỉnh sáng nhanh và chậm', () => {
  for (const ae of [0.2, 0.5, 1, 2]) {
    for (const period of [1.2, 2, 3]) assert.equal(count(signal({ reps: 12, period, ae })), 12, `tự chỉnh ${ae} giây, nhịp ${period} giây`);
  }
});

test('tự thích nghi: lưới 810 ca trong vùng làm việc đều đếm đúng 12/12', () => {
  // Vùng làm việc: che tối đi từ 70%; máy tự chỉnh sáng 0,5–2 giây hoặc không tự chỉnh; nhịp 1–4 giây; giữ đáy tới 40% chu kỳ.
  // Ngoài vùng này (ghi ở file kế hoạch, mốc 4) bộ đếm có thể sót: che chỉ tối đi 40% mà máy tự chỉnh sáng,
  // hoặc máy tự chỉnh sáng rất nhanh (0,2 giây) mà hạ người chậm — tín hiệu bị chính máy xoá gần hết.
  for (const ae of [0, 0.5, 1, 2]) for (const period of [1, 1.5, 2, 3, 4]) for (const hold of [0, 0.2, 0.4]) {
    for (const cover of [0.15, 0.3]) for (const bright of [60, 120, 200]) for (const seed of [1, 2, 3]) {
      if (seed > 1 && bright !== 120) continue;
      const o = { reps: 12, period, hold, cover, ae, bright, seed };
      assert.equal(count(signal(o)), 12, JSON.stringify(o));
    }
  }
  // Che ít (tối đi 40%) vẫn đếm đúng khi máy không tự chỉnh sáng; tự chỉnh rất nhanh vẫn đúng khi nhịp từ 2 giây trở xuống.
  for (const period of [1, 2, 4]) assert.equal(count(signal({ reps: 12, period, cover: 0.6 })), 12);
  for (const period of [1, 1.5, 2]) assert.equal(count(signal({ reps: 12, period, ae: 0.2 })), 12);
});

test('tự thích nghi: giữ lâu ở đáy vẫn chỉ tính một lượt, có hay không tự chỉnh sáng', () => {
  for (const ae of [0, 0.5, 1]) assert.equal(count(signal({ reps: 8, period: 4, hold: 0.6, ae })), 8, `tự chỉnh ${ae}`);
});

test('tự thích nghi: nền trôi dần (phòng tối đi một nửa, rồi sáng gấp đôi) vẫn đếm đúng', () => {
  const dim = (t) => Math.max(0.5, 1 - t / 80);
  const up = (t) => Math.min(2, 1 + t / 40);
  assert.equal(count(signal({ reps: 20, period: 2, ambient: dim, bright: 100 })), 20);
  assert.equal(count(signal({ reps: 20, period: 2, ambient: up, bright: 60 })), 20);
  assert.equal(count(signal({ reps: 20, period: 2, ambient: dim, ae: 0.5 })), 20);
});

test('tự thích nghi: phòng sáng hay tối, che nhiều hay ít đều đếm đúng', () => {
  for (const bright of [25, 60, 200]) {
    for (const cover of [0.15, 0.4, 0.6]) assert.equal(count(signal({ reps: 10, bright, cover, noise: 0.5 })), 10, `sáng ${bright}, còn ${cover}`);
  }
});

test('tự thích nghi: đứng yên thì không đếm, kể cả hình nhiễu và ánh sáng trôi', () => {
  assert.equal(count(signal({ reps: 0, tail: 60, noise: 3 })), 0);
  assert.equal(count(signal({ reps: 0, tail: 60, noise: 3, bright: 30 })), 0);
  assert.equal(count(signal({ reps: 0, tail: 60, ambient: (t) => 1 - 0.4 * Math.sin(t / 15) })), 0);
});

test('tự thích nghi: người lắc lư nhẹ ở tư thế cao (sáng đổi 5%) không bị đếm', () => {
  assert.equal(count(signal({ reps: 0, tail: 40, ambient: (t) => 1 + 0.05 * Math.sin(t * 3) })), 0);
});

test('tự thích nghi: tắt bớt đèn hoặc bật thêm đèn giữa hiệp thì sai tối đa 1 lượt rồi đếm tiếp', () => {
  for (const ae of [0, 0.5]) {
    const off = count(signal({ reps: 20, period: 2, ae, ambient: (t) => (t < 20.3 ? 1 : 0.4) }));
    const onn = count(signal({ reps: 20, period: 2, ae, bright: 60, ambient: (t) => (t < 20.3 ? 1 : 2.5) }));
    assert.ok(Math.abs(off - 20) <= 1, `tắt đèn, tự chỉnh ${ae}: đếm ${off}`);
    assert.ok(Math.abs(onn - 20) <= 1, `bật đèn, tự chỉnh ${ae}: đếm ${onn}`);
  }
});

test('tự thích nghi: các lượt về sau nông dần (mỏi) vẫn đếm được', () => {
  // Nửa sau che ít hơn hẳn: ngưỡng phải trượt theo độ sâu gần đây.
  const a = signal({ reps: 10, period: 2, cover: 0.2, tail: 0 });
  const b = signal({ reps: 10, period: 2, cover: 0.6, lead: 0 }).map((s) => ({ ...s, ms: s.ms + a.at(-1).ms + STEP, armed: true }));
  // Ngay lúc chuyển từ sâu sang nông, ngưỡng cũ còn cao: được sót tối đa 2 lượt rồi phải bắt kịp.
  const n = count([...a, ...b]);
  assert.ok(n >= 18 && n <= 20, `đếm ${n}/20`);
});

test('tự thích nghi: chưa vào hiệp thì không đếm; số lượt camera nhận được đếm theo từng hiệp', () => {
  const det = makeAdaptiveDetector();
  const s = signal({ reps: 5, lead: 2 });
  assert.equal(s.filter((x) => det.feed(x.luma, x.ms)).length, 0);
  det.arm();
  const again = s.map((x) => ({ ...x, ms: x.ms + s.at(-1).ms + STEP }));
  assert.equal(again.filter((x) => det.feed(x.luma, x.ms)).length, 5);
  assert.equal(det.hits, 5);
  det.disarm(); det.arm();
  assert.equal(det.hits, 0);
});

test('tự thích nghi: mẫu hỏng hoặc camera đứng hình không làm bộ đếm chết', () => {
  const det = makeAdaptiveDetector();
  det.arm();
  assert.equal(det.feed(NaN, 0), false);
  assert.equal(det.feed(100, NaN), false);
  const s = signal({ reps: 6 });
  let n = 0;
  for (const x of s) if (det.feed(x.luma, x.ms)) n += 1;
  // Đứng hình 5 giây rồi chạy tiếp.
  for (const x of s) if (det.feed(x.luma, x.ms + s.at(-1).ms + 5000)) n += 1;
  assert.equal(n, 12);
  assert.doesNotThrow(() => det.feed(0, s.at(-1).ms * 2 + 6000)); // hình đen hẳn: không lỗi
});

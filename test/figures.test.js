import test from 'node:test';
import assert from 'node:assert/strict';
import { EX } from '../legs.js';
import { FIG, JOINTS, poseAt, activationAt, frameOps, figureSvg } from '../figures.js';

const IDS = Object.keys(EX);
const phases = Array.from({ length: 41 }, (_, i) => i / 40);

test('mọi động tác có hình, và ngược lại', () => {
  assert.deepEqual(Object.keys(FIG).sort(), IDS.sort());
});

test('mỗi động tác có ít nhất 3 tư thế khoá khác nhau, lặp liền mạch', () => {
  for (const id of IDS) {
    const keys = FIG[id].keys;
    assert.equal(keys[0][0], 0, id);
    assert.equal(keys[keys.length - 1][0], 1, id);
    assert.deepEqual(keys[0][1], keys[keys.length - 1][1], `${id}: pha 1 phải trùng pha 0`);
    for (let i = 1; i < keys.length; i++) assert.ok(keys[i][0] > keys[i - 1][0], `${id}: pha khoá phải tăng dần`);
    const distinct = new Set(keys.map((k) => JSON.stringify(k[1])));
    assert.ok(distinct.size >= 3, `${id}: chỉ có ${distinct.size} tư thế khoá`);
    for (const j of JOINTS) poseAt(id, 0)[j].forEach((v, i) => assert.ok(Math.abs(v - poseAt(id, 1)[j][i]) < 1e-6, `${id}/${j}`));
  }
});

test('toạ độ luôn hữu hạn và nằm gần khung hình, chuyển động không giật', () => {
  for (const id of IDS) {
    const [bx, by, bw, bh] = FIG[id].box;
    let prev = poseAt(id, 0);
    for (const ph of phases) {
      const P = poseAt(id, ph);
      for (const j of JOINTS) {
        assert.ok(P[j].every(Number.isFinite), `${id}/${j}@${ph}`);
        assert.ok(P[j][0] > bx - 20 && P[j][0] < bx + bw + 20 && P[j][1] > by - 20 && P[j][1] < by + bh + 20, `${id}/${j}@${ph} ra ngoài khung`);
        assert.ok(Math.hypot(P[j][0] - prev[j][0], P[j][1] - prev[j][1]) < 14, `${id}/${j}@${ph} nhảy quá xa giữa hai khung`);
      }
      prev = P;
    }
  }
});

test('mỗi bó cơ trong hình khớp mức (chính / phụ / giãn) với danh sách cơ của động tác', () => {
  for (const id of IDS) {
    const fig = [...new Set(FIG[id].mus.map((m) => m.lvl))].sort();
    const ex = [...new Set(EX[id].muscles.map((m) => m[0]))].sort();
    assert.deepEqual(fig, ex, id);
    for (const m of FIG[id].mus) assert.ok(FIG[id].act[m.id], `${id}: cơ ${m.id} thiếu đường cường độ`);
  }
});

test('cường độ cơ trong [0, 1], cơ chính sáng nhất đúng lúc co và dịu khi thả', () => {
  for (const id of IDS) {
    for (const m of FIG[id].mus) {
      const v = phases.map((p) => activationAt(id, m.id, p));
      assert.ok(v.every((x) => x >= 0 && x <= 1), `${id}/${m.id}`);
      assert.ok(Math.max(...v) - Math.min(...v) >= 0.3, `${id}/${m.id}: cường độ gần như không đổi`);
    }
  }
  // Bắp chân: co khi nhón lên, dịu khi hạ xuống hẳn; cơ chày trước ngược pha với bắp chân khi gập duỗi cổ chân.
  assert.ok(activationAt('calf', 'gas', 0.4) > 0.9 && activationAt('calf', 'gas', 0) < 0.3);
  assert.ok(activationAt('ankle', 'gas', 0.65) > 0.9 && activationAt('ankle', 'gas', 0.26) < 0.3);
  assert.ok(activationAt('ankle', 'tib', 0.26) > 0.9 && activationAt('ankle', 'tib', 0.65) < 0.3);
  // Nâng hông: mông lớn sáng nhất ở đỉnh. Ngồi xổm: mông lớn sáng nhất khi đứng dậy.
  assert.ok(activationAt('bridge', 'gmax', 0.5) > 0.9 && activationAt('bridge', 'gmax', 0) < 0.3);
  assert.ok(activationAt('squat', 'gmax', 0.8) > activationAt('squat', 'gmax', 0.5));
  // Giãn cơ hình số 4: cơ kéo giãn nặng nhất lúc giữ sâu.
  assert.ok(activationAt('fig4', 'pir', 0.5) > activationAt('fig4', 'pir', 0));
});

test('hình vẽ: có thân khối, từng bó cơ có hình riêng, cơ giãn có sọc, không số hỏng', () => {
  for (const id of IDS) {
    for (const ph of [0, 0.25, 0.5, 0.75]) {
      const ops = frameOps(id, ph);
      assert.ok(!JSON.stringify(ops).match(/NaN|Infinity|undefined/), `${id}@${ph}`);
      assert.ok(ops.some((o) => o.cls === 'limb' && o.a.d.length > 30), `${id}: thiếu thân khối`);
      for (const lvl of new Set(FIG[id].mus.map((m) => m.lvl))) assert.ok(ops.some((o) => o.cls.startsWith(`mus ${lvl}`)), `${id}: thiếu cơ ${lvl}`);
      assert.equal(ops.filter((o) => o.cls.startsWith('mus ')).length, FIG[id].mus.length, id);
    }
    const svg = figureSvg(id, 2);
    assert.match(svg, new RegExp(`data-fig="${id}"`));
    for (const m of FIG[id].mus.filter((x) => x.lvl === 'stretch')) assert.ok(frameOps(id, 0.5).some((o) => o.cls === 'musl stretch' && o.a.d.length > 0), `${id}/${m.id} thiếu sọc kéo giãn`);
  }
});

test('cơ co phồng lên: bó cơ chính ở đỉnh co chiếm diện tích lớn hơn lúc thả', () => {
  const area = (d) => {
    const n = d.match(/-?\d+\.?\d*/g).map(Number);
    let a = 0;
    for (let i = 0; i + 3 < n.length; i += 2) a += n[i] * n[i + 3] - n[i + 2] * n[i + 1];
    return Math.abs(a / 2);
  };
  const gas = (ph) => frameOps('calf', ph).find((o) => o.cls.startsWith('mus main')).a.d;
  assert.ok(area(gas(0.4)) > area(gas(0)) * 1.1);
});

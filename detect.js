// Bộ đếm lượt bằng camera, tự thích nghi: không cần hiệu chỉnh trước buổi. Hàm thuần.
// Nguồn và cách đã loại: docs/ke-hoach/2026-11-23-lam-lai.md (mốc 4). Chưa thử trên iPhone thật.
//
// Ý chính: ngực hạ xuống che máy thì hình tối đi. Bộ đếm theo dõi «nền» = độ sáng ở tư thế cao,
// và tính một lượt khi độ sáng tụt dưới nền một khoảng đủ lớn so với các lượt gần đây.
// - Tính trên logarit độ sáng: máy tự chỉnh sáng hay phòng sáng – tối chỉ là nhân hệ số, biên độ không đổi.
// - Nền bám chậm theo tín hiệu khi ở tư thế cao, đứng yên khi đang thấp: ánh sáng trôi dần không làm lệch ngưỡng.
// - Ngưỡng là tỉ lệ của độ sâu các lượt gần đây, có sàn theo mức nhiễu; lâu không có lượt thì ngưỡng hạ dần.
// - Kẹt (tắt đèn, bật đèn) thì sau vài giây tự lấy nền mới.
export const DETECT = {
  smoothMs: 120, // làm mượt tín hiệu
  baseMs: 3000, // nền bám tín hiệu ở tư thế cao
  warmBaseMs: 400, // nền bám nhanh khi chưa vào hiệp
  noiseUpMs: 4000, // mức nhiễu: lên chậm, xuống nhanh — bám theo lúc hình yên, bỏ qua lúc người đang chuyển động
  noiseDownMs: 300,
  startDepth: 0.3, // độ sâu giả định trước lượt đầu (logarit: tối đi khoảng 40%)
  downFrac: 0.5, // tụt quá nửa độ sâu gần đây: tính một lượt
  upFrac: 0.4, // hồi lại tới còn 40% độ sâu của chính lượt này: nhận lượt kế
  minDepth: 0.12, // sàn của ngưỡng (tối đi khoảng 10%)
  maxFloor: 0.3, // trần của sàn khi nhiễu lớn
  noiseK: 12, // sàn = 12 lần mức nhiễu
  learn: 0.3, // mỗi lượt mới góp 30% vào độ sâu gần đây
  forgetMs: 10000, // không có lượt nào thì độ sâu gần đây giảm dần
  refractoryMs: 350, // hai lượt không gần nhau hơn mức này
  stuckDownMs: 6000, // «thấp» lâu hơn mức này: coi như ánh sáng đã đổi, lấy nền mới
  saturated: 245, // độ sáng từ mức này coi là hình cháy sáng
  calmMs: 1500, // sáng hơn nền hẳn và đứng yên lâu hơn mức này: lấy nền mới
};

const mix = (dt, tau) => 1 - Math.exp(-dt / tau);

export function makeAdaptiveDetector(cfg = {}) {
  const c = { ...DETECT, ...cfg };
  let fast = null; // tín hiệu đã làm mượt (logarit độ sáng)
  let base = null; // nền: mức ở tư thế cao
  let noise = 0;
  let amp = c.startDepth; // độ sâu của các lượt gần đây
  let armed = false; // false: chỉ học nền và nhiễu, không đếm
  let isDown = false;
  let depth = 0; // chỗ sâu nhất của lượt đang hạ
  let lastT = null;
  let prevX = null; // mẫu thô liền trước, để ước lượng nhiễu
  let downAt = -Infinity; // lúc tính lượt gần nhất
  let calmAt = null; // từ lúc nào tín hiệu sáng hơn nền mà đứng yên
  let calmRef = 0;
  // Theo dõi nhịp lên – xuống của chính tín hiệu, không cần nền: để nhận ra khi nền đã lệch.
  let dir = 1; // 1: đang sáng dần, -1: đang tối dần
  let ext = 0; // chỗ xa nhất của chặng hiện tại
  let peak = 0; // đỉnh mà chặng tối dần hiện tại bắt đầu
  let legCounted = true; // chặng tối dần hiện tại đã được tính lượt chưa
  let missed = 0; // độ sâu của chặng tối dần vừa qua mà không được tính (0 = không có)
  let hits = 0;

  const hear = (jump, dt) => { noise += (jump - noise) * mix(dt, jump > noise ? c.noiseUpMs : c.noiseDownMs); };
  const floor = () => Math.min(c.maxFloor, Math.max(c.minDepth, c.noiseK * noise));
  const threshold = () => Math.max(floor(), c.downFrac * amp);
  const restart = (x) => { base = x; dir = 1; ext = x; peak = x; legCounted = true; missed = 0; calmAt = null; isDown = false; };
  const hit = (t, from) => {
    isDown = true;
    depth = from - fast;
    downAt = t;
    legCounted = true;
    hits += 1;
    return true;
  };

  return {
    // luma: độ sáng trung bình 0..255; t: mốc giờ tính bằng mili giây. Trả true khi vừa tính một lượt.
    feed(luma, t) {
      if (!Number.isFinite(luma) || !Number.isFinite(t)) return false;
      const x = Math.log(Math.max(0, luma) + 2);
      if (fast == null || t - lastT > 2000 || t < lastT) {
        // Mẫu đầu, hoặc camera vừa đứng hình lâu: bắt đầu lại từ mẫu này.
        fast = x; lastT = t; prevX = x;
        restart(x);
        return false;
      }
      const dt = t - lastT;
      lastT = t;
      const jump = Math.abs(x - prevX);
      prevX = x;
      fast += (x - fast) * mix(dt, c.smoothMs);

      if (!armed) {
        base += (fast - base) * mix(dt, c.warmBaseMs);
        hear(jump, dt);
        return false;
      }

      // Độ sâu gần đây giảm dần khi lâu không có lượt, để lượt nông về sau vẫn qua được ngưỡng.
      if (!isDown && amp > floor()) amp += (floor() - amp) * mix(dt, c.forgetMs);
      const th = threshold();
      const free = t - downAt > c.refractoryMs;

      // Nhịp lên – xuống: một chặng được công nhận khi tín hiệu đi ngược lại quá ngưỡng.
      if (dir < 0) {
        if (fast < ext) ext = fast;
        else if (fast > ext + th) {
          // Vừa tối đi rồi sáng lại một nhịp rõ mà không được tính: có vẻ nền đang lệch.
          missed = legCounted ? 0 : peak - ext;
          dir = 1; ext = fast;
        }
      } else if (fast > ext) ext = fast;
      else if (fast < ext - th) {
        peak = ext; dir = -1; ext = fast; legCounted = false;
        if (free && (isDown || missed > 0)) {
          // Lại tối đi một nhịp nữa trong khi nền cũ không giải thích được:
          // (đang «thấp» mà đã lên rồi xuống lại, hoặc nhịp trước bị sót) → lấy đỉnh vừa rồi làm nền, tính lượt này.
          if (missed > 0) amp = Math.min(amp, missed);
          missed = 0;
          base = peak;
          calmAt = null;
          return hit(t, peak);
        }
        missed = 0;
      }

      const d = fast - base;
      if (isDown) {
        depth = Math.max(depth, -d);
        if (-d < c.upFrac * depth) {
          // Đã lên lại: lượt này góp vào độ sâu gần đây.
          isDown = false;
          amp += (depth - amp) * c.learn;
        } else if (t - downAt > c.stuckDownMs) {
          // Tối mãi không sáng lại: ánh sáng đã đổi chứ không phải đang hạ người.
          restart(fast);
        }
        return false;
      }

      if (d > th / 2) {
        // Sáng hơn nền hẳn. Loé sáng lúc máy tự chỉnh thì tự tắt dần: nền đứng yên chờ.
        // Sáng đều một lúc lâu mới là ánh sáng phòng đã đổi: lấy nền mới.
        // Hình cháy sáng (sát mức tối đa) thì không đo được gì: cũng chờ.
        if (calmAt == null || luma >= c.saturated || Math.abs(fast - calmRef) > th / 4) { calmAt = t; calmRef = fast; }
        else if (t - calmAt > c.calmMs) restart(fast);
        return false;
      }
      calmAt = null;
      base += (fast - base) * mix(dt, c.baseMs);

      // Một lượt: đang ở chặng tối dần và đã tối hơn nền quá ngưỡng.
      if (dir < 0 && !legCounted && -d > th && free) return hit(t, base);
      return false;
    },
    // Vào hiệp: bắt đầu đếm, coi tư thế lúc này là tư thế cao.
    arm() { armed = true; hits = 0; if (fast != null) restart(fast); },
    // Hết hiệp: thôi đếm, vẫn học nền và nhiễu trong giờ nghỉ.
    disarm() { armed = false; isDown = false; },
    get down() { return isDown; },
    get hits() { return hits; }, // số lượt camera nhận trong hiệp này
    get state() { return { base, fast, noise, amp, threshold: threshold() }; },
  };
}

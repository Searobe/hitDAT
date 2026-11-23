// Đồng hồ đếm lùi theo giờ thật. Hàm thuần: giờ hiện tại (ms) do bên gọi đưa vào.
// Không trừ dần mỗi nhịp, nên khoá màn hình hay đổi app rồi quay lại số vẫn đúng.
// units = số đơn vị cần đếm (giây, hoặc lượt); unitMs = độ dài một đơn vị.
export function makeCountdown(units, unitMs, now) {
  let end = now + units * unitMs;
  let pausedAt = null;
  return {
    left(t) { return Math.max(0, Math.ceil((end - (pausedAt ?? t)) / unitMs)); },
    add(n) { end += n * unitMs; },
    pause(t) { if (pausedAt == null) pausedAt = t; },
    resume(t) { if (pausedAt != null) { end += t - pausedAt; pausedAt = null; } },
    get paused() { return pausedAt != null; },
  };
}

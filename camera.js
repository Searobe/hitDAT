// Camera làm cảm biến.
// Hình chỉ được đọc tại chỗ để lấy độ sáng trung bình và độ tương phản; không lưu, không gửi đi đâu.
const $cam = document.getElementById('cam');

export const camera = {
  stream: null, timer: null, canvas: null, ctx: null, onSample: null,
  async start() {
    if (this.stream) return true;
    if (!navigator.mediaDevices?.getUserMedia) return false;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 320 }, height: { ideal: 240 } }, audio: false,
      });
      $cam.srcObject = this.stream;
      await $cam.play().catch(() => {});
      this.canvas = document.createElement('canvas');
      this.canvas.width = 32; this.canvas.height = 24;
      this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
      this.timer = setInterval(() => this.sample(), 60);
      return true;
    } catch {
      this.stop();
      return false;
    }
  },
  sample() {
    if (!this.onSample || $cam.readyState < 2) return;
    this.ctx.drawImage($cam, 0, 0, 32, 24);
    const px = this.ctx.getImageData(0, 0, 32, 24).data;
    let sum = 0, sq = 0;
    const n = px.length / 4;
    for (let i = 0; i < px.length; i += 4) {
      const y = 0.299 * px[i] + 0.587 * px[i + 1] + 0.114 * px[i + 2];
      sum += y; sq += y * y;
    }
    const luma = sum / n;
    const sd = Math.sqrt(Math.max(0, sq / n - luma * luma));
    this.onSample({ luma, sd });
  },
  stop() {
    clearInterval(this.timer); this.timer = null; this.onSample = null;
    if (this.stream) this.stream.getTracks().forEach((t) => t.stop());
    this.stream = null; $cam.srcObject = null;
  },
};

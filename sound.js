// Âm thanh: bíp, giai điệu, giọng đọc số.
import { db } from './data.js';

let actx = null;
export function unlockAudio() {
  try {
    // iOS: mặc định âm thanh web bị tắt theo cần gạt im lặng; kiểu «playback» cho kêu như app nghe nhạc.
    if (navigator.audioSession) navigator.audioSession.type = 'playback';
  } catch {}
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    if (actx.state === 'suspended') actx.resume();
  } catch {}
  try {
    // Mở khoá giọng đọc ngay trong lần chạm của người dùng (iOS chỉ cho đọc sau một lần chạm).
    if (db.state.settings.count === 'voice' && window.speechSynthesis) {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      speechSynthesis.speak(u);
    }
  } catch {}
}
// iOS ngắt âm thanh khi rời app; quay lại thì mở lại để bíp còn kêu.
export function resumeAudio() {
  try { if (actx && actx.state !== 'running') actx.resume().catch(() => {}); } catch {}
}
// Một nốt: tần số, độ dài (ms), âm lượng, trễ bao lâu mới kêu (ms).
export function beep(freq = 880, ms = 110, vol = 0.5, delay = 0) {
  if (!db.state.settings.sound || !actx) return;
  try {
    const t0 = actx.currentTime + delay / 1000;
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + ms / 1000);
    o.connect(g).connect(actx.destination);
    o.start(t0);
    o.stop(t0 + ms / 1000 + 0.02);
  } catch {}
}
function melody(notes) {
  let at = 0;
  for (const [freq, ms] of notes) { beep(freq, ms + 120, 0.5, at); at += ms; }
}
export const soundSetDone = () => melody([[784, 110], [1047, 110], [1319, 260]]); // xong một hiệp
export const soundFinish = () => melody([[523, 140], [659, 140], [784, 140], [1047, 280], [784, 140], [1047, 520]]); // xong cả bài
export function say(n) {
  try {
    if (!window.speechSynthesis) return false;
    speechSynthesis.cancel(); // hít nhanh thì bỏ số đang đọc dở, đọc số mới
    const u = new SpeechSynthesisUtterance(String(n));
    u.lang = 'vi-VN';
    u.rate = 1.25;
    speechSynthesis.speak(u);
    return true;
  } catch { return false; }
}
// Đếm ngược từng giây: đọc số nếu chọn giọng đọc, không thì bíp.
export function soundTick(left) {
  if (!db.state.settings.sound) return;
  if (db.state.settings.count === 'voice' && say(left)) return;
  beep(660, 120);
}
// Âm báo mỗi lượt: bíp, hoặc đọc con số đang hiện trên màn hình.
export function soundRep(shown) {
  if (!db.state.settings.sound) return;
  if (db.state.settings.count === 'voice' && say(shown)) return;
  beep(880);
}

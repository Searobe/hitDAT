// Trang «Hôm nay»: chọn MỘT việc chính cho hôm nay. Hàm thuần.
import { upcoming, canLower, applyLower } from './program.js';
import { legsLevel, legsPlan, pumpPlan, buildSteps, doneOn } from './legs.js';
import { resumable } from './store.js';

export function legsSteps(kind, level) {
  return buildSteps(kind === 'pump' ? pumpPlan() : legsPlan(level), kind === 'pump' ? 10 : undefined);
}

// Buổi chân / bơm máu đang dở còn nối lại được: cùng ngày, cùng mức, bước lưu còn nằm trong bài.
// at / total: đang ở động tác thứ mấy trên tổng số động tác.
export function legsResume(state, today) {
  const a = resumable(state, today);
  if (!a || a.kind === 'push') return null;
  const { level } = legsLevel(state.history);
  if (a.kind === 'legs' && a.level !== level) return null;
  const steps = legsSteps(a.kind, level);
  if (a.i >= steps.length) return null;
  const intros = (list) => list.filter((x) => x.type === 'intro').length;
  return { ...a, at: intros(steps.slice(0, a.i + 1)), total: intros(steps) };
}

// main — việc chính, theo thứ tự ưu tiên:
//   'first'       chưa làm bài thử đầu tiên
//   'push-resume' buổi hít đất hôm nay đang dở
//   'legs-resume' buổi chân / bơm máu hôm nay đang dở
//   'push'        tới ngày hít đất (buổi tập hoặc bài thử)
//   'legs'        ngày nghỉ hít đất, chưa tập chân
//   'rest'        hôm nay đã tập hít đất hoặc đã tập chân: không còn việc chính
export function todayPlan(state, today) {
  const legsActive = legsResume(state, today);
  const legsToday = doneOn(state.history, 'legs', today);
  if (state.T == null) return { main: 'first', legsActive, legsToday };
  const next = upcoming(state)[0];
  const early = !!state.nextDate && today < state.nextDate;
  const a = resumable(state, today);
  const pushActive = a && a.kind === 'push' ? a : null;
  const pushToday = state.history.some((h) => (h.type === 'session' || h.type === 'test') && h.date === today);
  const main = pushActive ? 'push-resume'
    : legsActive ? 'legs-resume'
    : !early ? 'push'
    : !legsToday && !pushToday ? 'legs'
    : 'rest';
  // Chỉ cho giảm khi buổi kế là buổi tập; bài thử thì đằng nào cũng xếp lại mức.
  const lowerTo = !pushActive && next.type === 'session' && canLower(state) ? applyLower(state, today).T : null;
  return { main, next, early, pushActive, legsActive, legsToday, pushToday, lowerTo };
}

// Thẻ «Tiến trình»: thành tích, lịch sắp tới, biểu đồ, lịch 4 tuần, lịch sử đầy đủ.
import { GOAL, upcoming } from './program.js';
import { FEEL, legsLevel, legsDone } from './legs.js';
import { pushBars, activityGrid, gridSummary, historyGroups } from './progress.js';
import { db } from './data.js';
import { today, fmtDate, fmtPast, setsText, DAY_NAME } from './format.js';
import { route, render, on } from './ui.js';

const PAGE = 30; // số dòng lịch sử hiện mỗi lần; bấm «Xem thêm» để hiện tiếp cho tới hết
let shown = PAGE;

function historyRow(h) {
  if (h.type === 'legs' || h.type === 'pump') {
    return `<div><div class="row"><span>${h.type === 'legs' ? 'Buổi chân · mức ' + h.level : 'Bơm máu bắp chân'}</span><span class="dim small">${fmtPast(h.date)}</span></div>
      <div class="dim small">${h.manual ? 'Tự tập, ghi nhận sau' : h.minutes + ' phút'}${h.skipped ? ' · bỏ qua ' + h.skipped + ' động tác' : ''}${h.feel ? ' · ' + FEEL[h.feel].toLowerCase() : ''}</div></div>`;
  }
  if (h.type === 'adjust') {
    return `<div><div class="row"><span>Tự giảm mức tập</span><span class="dim small">${fmtPast(h.date)}</span></div>
      <div class="small">${h.from} → <b>${h.to}</b></div></div>`;
  }
  if (h.type === 'test') {
    return `<div><div class="row"><span>Bài thử sức</span><span class="dim small">${fmtPast(h.date)}</span></div>
      <div class="small"><b>${h.count}</b> cái một hơi</div></div>`;
  }
  if (h.type === 'session') {
    return `<div>
      <div class="row"><span>Tuần ${h.week} · ${DAY_NAME[h.day]}</span>
        <span><span class="pill ${h.passed ? 'ok' : 'bad'}">${h.passed ? 'Đạt' : 'Hụt'}</span> <span class="dim small">${fmtPast(h.date)}</span></span></div>
      <div class="dim small">${h.done.join(' · ')} — tổng ${h.total}</div>
    </div>`;
  }
  // Loại dòng app này chưa biết (file sao lưu từ bản khác): vẫn hiện ngày, không bỏ sót.
  return `<div><div class="row"><span>Mục khác</span><span class="dim small">${fmtPast(h.date)}</span></div></div>`;
}

function barChart(bars) {
  const W = 320, H = 150, L = 6, R = 6, T = 18, B = 20;
  const max = Math.max(10, ...bars.map((b) => b.value));
  const slot = (W - L - R) / Math.max(bars.length, 5);
  const bw = Math.min(30, slot * 0.62);
  const y = (v) => T + (1 - v / max) * (H - T - B);
  return `<svg class="chart" viewBox="0 0 ${W} ${H}" role="img" aria-label="Số cái hít đất mỗi lần">
    <line class="axis" x1="${L}" x2="${W - R}" y1="${y(0)}" y2="${y(0)}"/>
    ${bars.map((b, i) => {
      const cx = L + slot * (i + 0.5);
      const top = y(b.value);
      return `<rect class="${b.kind === 'test' ? 'b-test' : 'b-session'}" x="${(cx - bw / 2).toFixed(1)}" y="${top.toFixed(1)}" width="${bw.toFixed(1)}" height="${(y(0) - top).toFixed(1)}" rx="4"${b.kind === 'session' && !b.passed ? ' fill-opacity=".55"' : ''}/>
        <text class="val" x="${cx.toFixed(1)}" y="${(top - 5).toFixed(1)}" text-anchor="middle">${b.value}</text>
        <text x="${cx.toFixed(1)}" y="${H - 5}" text-anchor="middle">${fmtPast(b.date)}</text>`;
    }).join('')}
  </svg>`;
}

// Ô «Quá trình tập»: cột hít đất từng lần + lịch 4 tuần.
function progressCard(history) {
  const bars = pushBars(history, 10);
  const grid = activityGrid(history, today(), 4);
  const sum = gridSummary(history, grid);
  return `
    ${bars.length ? `<div class="dim small">Số cái hít đất mỗi lần</div>${barChart(bars)}
    <div class="legend small"><span><i class="k-session"></i>Buổi tập (tổng cả buổi)</span><span><i class="k-test"></i>Bài thử (một hơi)</span></div>` : ''}
    <div class="dim small gap">4 tuần gần nhất · ${sum.days} ngày có tập · ${sum.reps} cái hít đất</div>
    <div class="cal">
      ${['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map((d) => `<b>${d}</b>`).join('')}
      ${grid.flat().map((c) => `<span class="${c.future ? 'future' : ''}${c.today ? ' today' : ''}${c.push || c.legs || c.pump ? ' did' : ''}">
        <em>${+c.date.slice(8)}</em><i>${c.push ? '<i class="k-session"></i>' : ''}${c.legs ? '<i class="k-legs"></i>' : ''}${c.pump ? '<i class="k-pump"></i>' : ''}</i></span>`).join('')}
    </div>
    <div class="legend small"><span><i class="k-session"></i>Hít đất</span><span><i class="k-legs"></i>Tập chân</span><span><i class="k-pump"></i>Bơm máu</span></div>`;
}

function viewProgress({ keep = false } = {}) {
  if (!keep) shown = PAGE;
  const { state } = db;
  const { history } = state;
  const tests = history.filter((h) => h.type === 'test');
  const sessions = history.filter((h) => h.type === 'session');
  const best = Math.max(0, ...tests.map((t) => t.count));
  const total = sessions.reduce((a, s) => a + s.total, 0) + tests.reduce((a, t) => a + t.count, 0);
  const up = state.T == null ? [] : upcoming(state);
  const lv = legsLevel(history);
  const nLegs = legsDone(history);
  const { groups, rest } = historyGroups(history, shown);

  render(`
    <h1>Tiến trình</h1>
    ${state.T == null ? '<p class="dim small">Chưa có mức tập. Làm bài thử đầu tiên ở thẻ Hôm nay.</p>' : `
    <div class="card">
      <div class="row">
        <div><div class="dim small">Một hơi tốt nhất</div><div class="big">${best}</div></div>
        <div class="right"><div class="dim small">Mức đang tập</div><div class="big">${state.T}</div></div>
      </div>
      <div class="bar" role="img" aria-label="Tốt nhất ${best} trên mục tiêu ${GOAL}"><i style="width:${Math.min(100, (best / GOAL) * 100)}%"></i></div>
      <p class="dim small last">${state.achieved ? `🏆 Đã hít được ${GOAL} cái một hơi. ` : `Mục tiêu: ${GOAL} cái một hơi. `}Đã hít tổng cộng ${total} cái qua ${sessions.length} buổi tập và ${tests.length} bài thử.</p>
    </div>`}

    ${up.length ? `
    <h2>Lịch sắp tới</h2>
    <div class="card list">
      ${up.map((u) => `
        <div>
          <div class="row"><span>${u.type === 'test' ? 'Bài thử sức' : DAY_NAME[u.day]}</span><span class="dim small">${fmtDate(u.date)}</span></div>
          ${u.type === 'session' ? `<div class="dim small">${setsText(u.sets)}</div>` : ''}
        </div>`).join('')}
    </div>` : ''}

    ${history.length ? `<h2>Quá trình tập</h2><div class="card">${progressCard(history)}</div>` : ''}

    <h2>Tập chân</h2>
    <div class="card">
      <div class="row"><b>Mức ${lv.level}</b><span class="dim small">${nLegs} buổi đã tập</span></div>
      <p class="dim small last">${lv.level >= 3 ? 'Đang ở mức cao nhất.' : `Còn ${lv.toNext} điểm nữa lên mức ${lv.level + 1}.`} Cuối buổi chọn nhẹ / vừa / nặng: nhẹ +2 điểm, vừa +1, nặng giữ mức; hai buổi nặng liền thì lùi một mức.</p>
    </div>

    <h2>Lịch sử${history.length ? ` · ${history.length} dòng` : ''}</h2>
    ${history.length ? groups.map((g) => `
      <h3>${g.label}</h3>
      <div class="card list">${g.rows.map(historyRow).join('')}</div>`).join('') : '<div class="card"><p class="dim small only">Chưa có buổi nào được ghi.</p></div>'}
    ${rest ? `<div class="btns"><button id="more">Xem thêm ${Math.min(PAGE, rest)} dòng (còn ${rest})</button></div>` : ''}
  `, { tab: 'progress', keep });
  on('more', () => { shown += PAGE; viewProgress({ keep: true }); });
}

route('progress', viewProgress);

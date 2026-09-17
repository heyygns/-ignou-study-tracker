import { el, minutesToLabel } from './utils.js';
import { state, subjectProgress } from './state.js';
import { todayStr } from './exams.js';

function totalStudySeconds() { return state.study_sessions.reduce((a, s) => a + (s.duration_sec || 0), 0); }

function last7DaysMinutes() {
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const mins = Math.round(state.study_sessions.filter(s => (s.start_time || '').slice(0, 10) === key).reduce((a, s) => a + (s.duration_sec || 0), 0) / 60);
    days.push({ key, label: d.toLocaleDateString('en-IN', { weekday: 'short' }), mins });
  }
  return days;
}

export async function render(container) {
  container.innerHTML = '';
  container.appendChild(el('div', { class: 'display', style: 'font-size:20px;margin-bottom:14px;' }, 'Statistics'));

  const grid = el('div', { class: 'grid-3' });
  const stat = (num, label) => el('div', { class: 'card' }, [el('div', { class: 'stat-num' }, String(num)), el('div', { class: 'stat-label' }, label)]);
  grid.appendChild(stat(minutesToLabel(Math.round(totalStudySeconds() / 60)), 'total study time'));
  grid.appendChild(stat(state.study_sessions.length, 'study sessions'));
  grid.appendChild(stat(state.tasks.filter(t => t.completed).length, 'tasks completed'));
  grid.appendChild(stat(state.units.filter(u => u.completed).length, 'units completed'));
  grid.appendChild(stat(state.pyqs.filter(p => p.completed).length, 'PYQs completed'));
  grid.appendChild(stat(state.revisions.filter(r => r.completed).length, 'revisions completed'));
  grid.appendChild(stat(state.answers.filter(a => a.status === 'reviewed' || a.status === 'written').length, 'answers written'));
  container.appendChild(grid);

  container.appendChild(el('div', { class: 'section-title' }, 'Last 7 days'));
  const days = last7DaysMinutes();
  const max = Math.max(60, ...days.map(d => d.mins));
  const barCard = el('div', { class: 'card', style: 'display:flex;align-items:flex-end;gap:10px;height:150px;' });
  days.forEach(d => {
    barCard.appendChild(el('div', { style: 'flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%;' }, [
      el('div', { class: 'muted', style: 'font-size:11px;margin-bottom:4px;' }, d.mins ? d.mins + 'm' : ''),
      el('div', { style: `width:100%;max-width:26px;border-radius:6px 6px 0 0;background:var(--indigo);height:${Math.max(2, (d.mins / max) * 100)}%;` }),
      el('div', { class: 'muted', style: 'font-size:11px;margin-top:6px;' }, d.label),
    ]));
  });
  container.appendChild(barCard);

  container.appendChild(el('div', { class: 'section-title' }, 'Subject progress'));
  const spCard = el('div', { class: 'card' });
  [...state.subjects].sort((a, b) => (a.exam_date || '').localeCompare(b.exam_date || '')).forEach(s => {
    const pct = subjectProgress(s.id);
    spCard.appendChild(el('div', { style: 'margin-bottom:12px;' }, [
      el('div', { class: 'flex-between', style: 'font-size:13px;margin-bottom:4px;' }, [el('span', {}, s.code), el('span', { class: 'muted' }, `${pct}%`)]),
      el('div', { class: 'progress' }, el('span', { style: `width:${pct}%` })),
    ]));
  });
  container.appendChild(spCard);
}

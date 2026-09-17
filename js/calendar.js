import { el } from './utils.js';
import { state } from './state.js';
import { EXAMS, examsOn, isDoubleExamDay, nextExam, previousExam, finalExam, todayStr, daysBetween, formatDate, formatTimeRange, STUDY_START, STUDY_END } from './exams.js';
import { setSelectedDate } from './planner.js';

let viewYear, viewMonth; // 0-indexed month

function initView() {
  const t = new Date();
  viewYear = t.getFullYear(); viewMonth = t.getMonth();
}

function pad(n) { return String(n).padStart(2, '0'); }

function tasksAndRevisionsOn(dateStr) {
  const tasks = state.tasks.filter(t => t.task_date === dateStr);
  const revs = state.revisions.filter(r => r.due_date === dateStr);
  return { tasks, revs };
}

function renderMonthGrid(container) {
  const grid = el('div', { class: 'cal-grid' });
  ['S', 'M', 'T', 'W', 'T', 'F', 'S'].forEach(d => grid.appendChild(el('div', { class: 'cal-dow' }, d)));

  const first = new Date(viewYear, viewMonth, 1);
  const startOffset = first.getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  for (let i = 0; i < startOffset; i++) grid.appendChild(el('div', { class: 'cal-day empty' }));

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${viewYear}-${pad(viewMonth + 1)}-${pad(day)}`;
    const exams = examsOn(dateStr);
    const double = isDoubleExamDay(dateStr);
    const { tasks, revs } = tasksAndRevisionsOn(dateStr);
    const inRange = dateStr >= STUDY_START && dateStr <= STUDY_END;
    const cls = ['cal-day'];
    if (dateStr === todayStr()) cls.push('today');
    if (double) cls.push('double-exam');
    else if (exams.length) cls.push('exam');

    const cell = el('div', { class: cls.join(' '), onclick: inRange ? () => openDay(container, dateStr) : null }, [
      el('div', {}, String(day)),
    ]);
    if (exams.length) cell.appendChild(el('div', { style: 'font-size:9px;font-weight:700;margin-top:2px;' }, exams.map(e => e.code).join(' + ')));
    if (tasks.length || revs.length) {
      cell.appendChild(el('div', { class: 'dot-row' }, Array.from({ length: Math.min(3, tasks.length + revs.length) }).map(() => el('div', { class: 'dot' }))));
    }
    grid.appendChild(cell);
  }
  container.appendChild(grid);
}

function openDay(container, dateStr) {
  const mount = document.getElementById('modalMount');
  mount.innerHTML = '';
  mount.appendChild(el('div', { class: 'modal-head' }, [el('div', { class: 'display' }, formatDate(dateStr)), el('button', { class: 'modal-close', onclick: () => document.getElementById('modalBackdrop').classList.add('hidden') }, '×')]));
  const exams = examsOn(dateStr);
  if (exams.length) {
    mount.appendChild(el('div', { class: `card exam-card ${exams.length > 1 ? 'double' : ''}` }, [
      el('div', { class: 'stat-label' }, exams.length > 1 ? 'TWO EXAMS' : 'EXAM'),
      ...exams.map(e => el('div', { style: 'margin-top:4px;' }, [el('div', { class: 'exam-code' }, e.code), el('div', { class: 'exam-name' }, e.name), el('div', { class: 'stat-label' }, formatTimeRange(e.start, e.end))])),
    ]));
  }
  const { tasks, revs } = tasksAndRevisionsOn(dateStr);
  if (tasks.length === 0 && revs.length === 0 && exams.length === 0) {
    mount.appendChild(el('div', { class: 'empty' }, 'Nothing scheduled this day.'));
  } else {
    if (tasks.length) {
      mount.appendChild(el('div', { class: 'section-title' }, 'Tasks'));
      tasks.forEach(t => mount.appendChild(el('div', { class: 'list-row' }, el('div', {}, t.title))));
    }
    if (revs.length) {
      mount.appendChild(el('div', { class: 'section-title' }, 'Revisions due'));
      revs.forEach(r => {
        const subj = state.subjects.find(s => s.id === r.subject_id);
        mount.appendChild(el('div', { class: 'list-row' }, el('div', {}, `${subj ? subj.code : ''} — ${r.stage}`)));
      });
    }
  }
  mount.appendChild(el('button', {
    class: 'btn btn-primary btn-block', style: 'margin-top:14px;', onclick: () => {
      document.getElementById('modalBackdrop').classList.add('hidden');
      setSelectedDate(dateStr);
      window.__navigate__('planner');
    },
  }, 'Open in Planner'));
  document.getElementById('modalBackdrop').classList.remove('hidden');
}

export async function render(container) {
  if (viewYear === undefined) initView();
  container.innerHTML = '';
  container.appendChild(el('div', { class: 'display', style: 'font-size:20px;margin-bottom:14px;' }, 'Calendar & exams'));

  const next = nextExam();
  if (next) {
    const days = daysBetween(todayStr(), next.date);
    container.appendChild(el('div', { class: `card exam-card ${isDoubleExamDay(next.date) ? 'double' : ''}` }, [
      el('div', { class: 'stat-label' }, 'NEXT EXAM'),
      el('div', { class: 'exam-code' }, next.code),
      el('div', { class: 'exam-name' }, next.name),
      el('div', { class: 'exam-days' }, `${days} DAY${days === 1 ? '' : 'S'} LEFT`),
      el('div', { class: 'stat-label' }, `${formatDate(next.date)} · ${formatTimeRange(next.start, next.end)}`),
    ]));
  } else {
    container.appendChild(el('div', { class: 'card' }, 'All exams in this schedule are complete. 🎉'));
  }

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
  container.appendChild(el('div', { class: 'flex-between', style: 'margin-top:18px;margin-bottom:8px;' }, [
    el('button', { class: 'btn btn-sm', onclick: () => { viewMonth--; if (viewMonth < 0) { viewMonth = 11; viewYear--; } render(container); } }, '←'),
    el('div', { style: 'font-weight:600;' }, monthLabel),
    el('button', { class: 'btn btn-sm', onclick: () => { viewMonth++; if (viewMonth > 11) { viewMonth = 0; viewYear++; } render(container); } }, '→'),
  ]));
  renderMonthGrid(container);

  container.appendChild(el('div', { class: 'section-title' }, 'All 20 exams'));
  const listCard = el('div', { class: 'card' });
  EXAMS.forEach(e => {
    listCard.appendChild(el('div', { class: 'list-row' }, [
      el('div', {}, [
        el('div', { style: 'font-weight:600;font-size:13.5px;' }, `${e.code} — ${e.name}`),
        el('div', { class: 'muted', style: 'font-size:12px;' }, `${formatDate(e.date)} · ${formatTimeRange(e.start, e.end)}`),
      ]),
      isDoubleExamDay(e.date) ? el('span', { class: 'badge badge-amber' }, 'Double') : (e.date < todayStr() ? el('span', { class: 'badge badge-muted' }, 'Done') : null),
    ]));
  });
  container.appendChild(listCard);
}

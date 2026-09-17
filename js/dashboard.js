import { el, minutesToLabel } from './utils.js';
import { state, subjectById, subjectProgress } from './state.js';
import { nextExam, todayStr, daysBetween, formatDate, formatTimeRange, isDoubleExamDay, examsOn, phaseForDate } from './exams.js';
import { toggleTaskDone } from './planner.js';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function studyStreak() {
  const days = new Set(state.study_sessions.filter(s => s.duration_sec > 0).map(s => (s.start_time || '').slice(0, 10)));
  let streak = 0;
  let cursor = new Date();
  for (;;) {
    const y = cursor.getFullYear(), m = String(cursor.getMonth() + 1).padStart(2, '0'), d = String(cursor.getDate()).padStart(2, '0');
    const key = `${y}-${m}-${d}`;
    if (days.has(key)) { streak++; cursor.setDate(cursor.getDate() - 1); }
    else break;
  }
  return streak;
}

function minutesStudiedOn(dateStr) {
  const sec = state.study_sessions.filter(s => (s.start_time || '').slice(0, 10) === dateStr).reduce((a, s) => a + (s.duration_sec || 0), 0);
  return Math.round(sec / 60);
}

function overallProgress() {
  if (state.subjects.length === 0) return 0;
  const total = state.subjects.reduce((a, s) => a + subjectProgress(s.id), 0);
  return Math.round(total / state.subjects.length);
}

function buildPriorities(today) {
  const items = [];

  // overdue tasks first
  const overdue = state.tasks.filter(t => !t.completed && t.task_date < today);
  overdue.forEach(t => items.push({ kind: 'overdue', task: t, label: t.title, meta: `Overdue · was ${t.task_date}` }));

  // today's revisions due
  state.revisions.filter(r => !r.completed && r.due_date === today).forEach(r => {
    const subj = subjectById(r.subject_id);
    items.push({ kind: 'revision', revision: r, label: `${subj ? subj.code : ''} — Revision (${r.stage})`, meta: 'Due today' });
  });

  // today's tasks
  state.tasks.filter(t => !t.completed && t.task_date === today).forEach(t => {
    items.push({ kind: 'task', task: t, label: t.title, meta: `${minutesToLabel(t.duration_min || 30)}${t.carried_forward ? ' · carried forward' : ''}` });
  });

  // high-importance unattempted questions
  state.questions.filter(q => q.importance === 'high' && q.status !== 'reviewed' && q.confidence === 'weak').slice(0, 2).forEach(q => {
    const subj = subjectById(q.subject_id);
    items.push({ kind: 'question', question: q, label: `${subj ? subj.code : ''} — ${q.question.slice(0, 60)}`, meta: 'High-priority weak question' });
  });

  return items.slice(0, 5);
}

export async function render(container) {
  const today = todayStr();
  const profile = state.profile;
  const name = profile?.name || '';
  const minsToday = minutesStudiedOn(today);
  const goal = profile?.daily_goal_minutes || 120;
  const streak = studyStreak();
  const phase = phaseForDate(today);
  const next = nextExam(today);
  const todaysExams = examsOn(today);

  container.innerHTML = '';
  container.appendChild(el('div', { class: 'greeting display' }, `${greeting()}${name ? ', ' + name : ''}`));
  container.appendChild(el('div', { class: 'greeting-date' }, `${formatDate(today)} · ${phase.label} phase`));

  if (todaysExams.length) {
    const c = el('div', { class: `card exam-card ${todaysExams.length > 1 ? 'double' : ''}` });
    c.appendChild(el('div', { class: 'stat-label' }, "TODAY'S EXAM" + (todaysExams.length > 1 ? 'S' : '')));
    todaysExams.forEach(e => {
      c.appendChild(el('div', { class: 'exam-code' }, e.code));
      c.appendChild(el('div', { class: 'exam-name' }, e.name));
      c.appendChild(el('div', { class: 'stat-label', style: 'margin-top:2px;' }, formatTimeRange(e.start, e.end)));
    });
    container.appendChild(c);
  }

  const grid = el('div', { class: 'grid-3' });
  grid.appendChild(el('div', { class: 'card' }, [
    el('div', { class: 'stat-num' }, minutesToLabel(minsToday)),
    el('div', { class: 'stat-label' }, `of ${minutesToLabel(goal)} today's goal`),
    el('div', { class: 'progress', style: 'margin-top:10px;' }, el('span', { style: `width:${Math.min(100, Math.round((minsToday / goal) * 100))}%` })),
  ]));
  grid.appendChild(el('div', { class: 'card' }, [
    el('div', { class: 'stat-num' }, String(streak)),
    el('div', { class: 'stat-label' }, streak === 1 ? 'day streak' : 'day streak'),
  ]));
  grid.appendChild(el('div', { class: 'card' }, [
    el('div', { class: 'stat-num' }, `${overallProgress()}%`),
    el('div', { class: 'stat-label' }, 'overall syllabus progress'),
  ]));
  container.appendChild(grid);

  // priorities
  container.appendChild(el('div', { class: 'section-title' }, "Today's priorities"));
  const priorities = buildPriorities(today);
  const pcard = el('div', { class: 'card' });
  if (priorities.length === 0) {
    pcard.appendChild(el('div', { class: 'empty' }, [el('div', { class: 'display' }, 'Nothing urgent'), el('div', {}, 'Head to Planner to line up tasks for today.')]));
  } else {
    priorities.forEach((p, i) => {
      const row = el('div', { class: 'priority-row' }, [
        el('div', { class: 'priority-num' }, String(i + 1)),
        el('div', { style: 'flex:1;' }, [el('div', { class: 'priority-title' }, p.label), el('div', { class: 'priority-meta' }, p.meta)]),
      ]);
      if (p.kind === 'task' || p.kind === 'overdue') {
        row.appendChild(el('input', {
          type: 'checkbox', style: 'width:19px;height:19px;accent-color:var(--indigo);', onchange: async (e) => {
            await toggleTaskDone(p.task, e.target.checked);
            render(container);
          },
        }));
      }
      pcard.appendChild(row);
    });
  }
  container.appendChild(pcard);

  // next exam countdown
  if (next) {
    const days = daysBetween(today, next.date);
    container.appendChild(el('div', { class: 'section-title' }, 'Next exam'));
    const ec = el('div', { class: `card exam-card ${isDoubleExamDay(next.date) ? 'double' : ''}` });
    ec.appendChild(el('div', { class: 'stat-label' }, 'NEXT EXAM'));
    ec.appendChild(el('div', { class: 'exam-code' }, next.code));
    ec.appendChild(el('div', { class: 'exam-name' }, next.name));
    ec.appendChild(el('div', { class: 'exam-days' }, `${days} DAY${days === 1 ? '' : 'S'} LEFT`));
    ec.appendChild(el('div', { class: 'stat-label' }, `${formatDate(next.date)} · ${formatTimeRange(next.start, next.end)}`));
    if (isDoubleExamDay(next.date)) {
      const others = examsOn(next.date).filter(e => e.code !== next.code);
      others.forEach(o => ec.appendChild(el('div', { class: 'stat-label', style: 'margin-top:6px;' }, `Also that day: ${o.code} — ${o.name}`)));
    }
    container.appendChild(ec);
  }

  container.appendChild(el('button', {
    class: 'btn btn-primary btn-block', style: 'margin-top:16px;', onclick: () => window.__navigate__('timer'),
  }, '▶ Start study session'));
}

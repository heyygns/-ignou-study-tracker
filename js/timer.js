import { el, secondsToLabel, minutesToLabel } from './utils.js';
import { state } from './state.js';
import * as db from './db.js';
import { todayStr } from './exams.js';
import { closeModal } from './app.js';

let tickHandle = null;

function elapsedSeconds() {
  const t = state.timer;
  if (!t.running) return t.elapsedBeforePause;
  return t.elapsedBeforePause + Math.floor((Date.now() - t.startedAt) / 1000);
}

function weekMonthTotals() {
  const now = new Date();
  const startOfWeek = new Date(now); startOfWeek.setDate(now.getDate() - now.getDay());
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  let today = 0, week = 0, month = 0;
  const todayD = todayStr();
  state.study_sessions.forEach(s => {
    const d = new Date(s.start_time);
    const sec = s.duration_sec || 0;
    if ((s.start_time || '').slice(0, 10) === todayD) today += sec;
    if (d >= startOfWeek) week += sec;
    if (d >= startOfMonth) month += sec;
  });
  return { today, week, month };
}

function openStopModal(container, durationSec) {
  const mount = document.getElementById('modalMount');
  mount.innerHTML = '';
  mount.appendChild(el('div', { class: 'modal-head' }, [el('div', { class: 'display' }, 'What did you study?'), el('button', { class: 'modal-close', onclick: () => { closeModal(); render(container); } }, '×')]));
  const form = el('form', {}, [
    el('div', { class: 'field' }, [el('label', {}, 'Subject'), el('select', { id: 'tsSubject' }, [el('option', { value: '' }, '— none —'), ...state.subjects.map(s => el('option', { value: s.id }, s.code))])]),
    el('div', { class: 'field' }, [el('label', {}, 'What / which unit'), el('input', { id: 'tsLabel', placeholder: 'e.g. Unit 4 — reading' })]),
    el('div', { class: 'field' }, [el('label', {}, 'Notes'), el('textarea', { id: 'tsNotes' })]),
    el('div', { class: 'muted', style: 'margin-bottom:12px;' }, `Session length: ${secondsToLabel(durationSec)}`),
    el('button', { class: 'btn btn-primary btn-block', type: 'submit' }, 'Save session'),
  ]);
  form.onsubmit = async (e) => {
    e.preventDefault();
    const end = new Date();
    const start = new Date(end.getTime() - durationSec * 1000);
    const row = await db.insertRow('study_sessions', {
      subject_id: document.getElementById('tsSubject').value || null,
      label: document.getElementById('tsLabel').value.trim() || null,
      notes: document.getElementById('tsNotes').value.trim() || null,
      start_time: start.toISOString(),
      end_time: end.toISOString(),
      duration_sec: durationSec,
    });
    state.study_sessions.push(row);
    state.timer = { running: false, subjectId: null, label: '', startedAt: null, elapsedBeforePause: 0 };
    closeModal();
    render(container);
  };
  mount.appendChild(form);
  document.getElementById('modalBackdrop').classList.remove('hidden');
}

export async function render(container) {
  container.innerHTML = '';
  container.appendChild(el('div', { class: 'display', style: 'font-size:20px;margin-bottom:14px;' }, 'Study timer'));

  const card = el('div', { class: 'card' });
  const display = el('div', { class: 'timer-display' }, secondsToLabel(elapsedSeconds()));
  card.appendChild(display);

  const controls = el('div', { class: 'timer-controls' });
  const t = state.timer;

  if (!t.running && t.elapsedBeforePause === 0) {
    controls.appendChild(el('button', {
      class: 'btn btn-primary', onclick: () => {
        state.timer = { ...t, running: true, startedAt: Date.now() };
        startTicking(container);
        render(container);
      },
    }, '▶ Start'));
  } else if (t.running) {
    controls.appendChild(el('button', {
      class: 'btn', onclick: () => {
        state.timer = { ...t, running: false, elapsedBeforePause: elapsedSeconds() };
        stopTicking();
        render(container);
      },
    }, '⏸ Pause'));
    controls.appendChild(el('button', {
      class: 'btn btn-amber', onclick: () => {
        const dur = elapsedSeconds();
        state.timer = { ...t, running: false };
        stopTicking();
        openStopModal(container, dur);
      },
    }, '⏹ Stop'));
  } else {
    controls.appendChild(el('button', {
      class: 'btn btn-primary', onclick: () => {
        state.timer = { ...t, running: true, startedAt: Date.now() };
        startTicking(container);
        render(container);
      },
    }, '▶ Resume'));
    controls.appendChild(el('button', {
      class: 'btn btn-amber', onclick: () => {
        const dur = elapsedSeconds();
        openStopModal(container, dur);
      },
    }, '⏹ Stop'));
    controls.appendChild(el('button', {
      class: 'btn btn-ghost', onclick: () => {
        state.timer = { running: false, subjectId: null, label: '', startedAt: null, elapsedBeforePause: 0 };
        stopTicking();
        render(container);
      },
    }, '↺ Reset'));
  }
  card.appendChild(controls);
  container.appendChild(card);

  if (state.timer.running) startTicking(container, display);

  const totals = weekMonthTotals();
  const grid = el('div', { class: 'grid-3' });
  grid.appendChild(el('div', { class: 'card' }, [el('div', { class: 'stat-num' }, minutesToLabel(Math.round(totals.today / 60))), el('div', { class: 'stat-label' }, "today's study time")]));
  grid.appendChild(el('div', { class: 'card' }, [el('div', { class: 'stat-num' }, minutesToLabel(Math.round(totals.week / 60))), el('div', { class: 'stat-label' }, 'this week')]));
  grid.appendChild(el('div', { class: 'card' }, [el('div', { class: 'stat-num' }, minutesToLabel(Math.round(totals.month / 60))), el('div', { class: 'stat-label' }, 'this month')]));
  container.appendChild(grid);

  container.appendChild(el('div', { class: 'section-title' }, 'Recent sessions'));
  const recent = [...state.study_sessions].sort((a, b) => b.start_time.localeCompare(a.start_time)).slice(0, 10);
  const rcard = el('div', { class: 'card' });
  if (recent.length === 0) {
    rcard.appendChild(el('div', { class: 'empty' }, 'No sessions logged yet.'));
  } else {
    recent.forEach(s => {
      const subj = s.subject_id ? state.subjects.find(x => x.id === s.subject_id) : null;
      rcard.appendChild(el('div', { class: 'list-row' }, [
        el('div', {}, [
          el('div', { style: 'font-weight:600;font-size:13.5px;' }, [subj ? subj.code + ' — ' : '', s.label || 'Study session'].join('')),
          el('div', { class: 'muted', style: 'font-size:12px;' }, new Date(s.start_time).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })),
        ]),
        el('div', { class: 'badge badge-indigo' }, secondsToLabel(s.duration_sec || 0)),
      ]));
    });
  }
  container.appendChild(rcard);
}

function startTicking(container, displayEl) {
  stopTicking();
  tickHandle = setInterval(() => {
    const d = displayEl || document.querySelector('.timer-display');
    if (d) d.textContent = secondsToLabel(elapsedSeconds());
    else stopTicking();
  }, 1000);
}
function stopTicking() { if (tickHandle) { clearInterval(tickHandle); tickHandle = null; } }

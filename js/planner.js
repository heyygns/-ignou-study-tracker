import { el, toast, minutesToLabel } from './utils.js';
import { state, subjectById } from './state.js';
import * as db from './db.js';
import { todayStr, formatDate, STUDY_START, STUDY_END, examsOn } from './exams.js';
import { closeModal } from './app.js';

let selectedDate = todayStr();
let carriedThisSession = false;

export function setSelectedDate(d) { selectedDate = d; }

export async function toggleTaskDone(task, completed) {
  const patch = { completed, completed_at: completed ? new Date().toISOString() : null };
  const updated = await db.updateRow('tasks', task.id, patch);
  const idx = state.tasks.findIndex(t => t.id === task.id);
  if (idx >= 0) state.tasks[idx] = updated;

  // completing a task tied to a unit marks the unit done + builds a revision schedule
  if (completed && task.unit_id) {
    const unit = state.units.find(u => u.id === task.unit_id);
    if (unit && !unit.completed) {
      const updatedUnit = await db.updateRow('units', unit.id, { completed: true, completed_at: new Date().toISOString() });
      const uidx = state.units.findIndex(u => u.id === unit.id);
      if (uidx >= 0) state.units[uidx] = updatedUnit;
      const revs = await db.createRevisionSchedule(unit.subject_id, unit.id, todayStr());
      state.revisions.push(...revs);
      toast('Unit marked complete — revision schedule created.', 'success');
    }
  }
}

async function autoCarryForward() {
  if (carriedThisSession) return;
  carriedThisSession = true;
  const today = todayStr();
  const overdue = state.tasks.filter(t => !t.completed && t.task_date < today);
  for (const t of overdue) {
    const original = t.original_date || t.task_date;
    const updated = await db.updateRow('tasks', t.id, { task_date: today, carried_forward: true, original_date: original });
    const idx = state.tasks.findIndex(x => x.id === t.id);
    if (idx >= 0) state.tasks[idx] = updated;
  }
  if (overdue.length) toast(`${overdue.length} missed task${overdue.length > 1 ? 's' : ''} carried forward to today.`);
}

function shiftDate(dateStr, delta) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + delta);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function openTaskModal(container) {
  const mount = document.getElementById('modalMount');
  mount.innerHTML = '';
  const subjOptions = state.subjects.map(s => el('option', { value: s.id }, `${s.code} — ${s.name}`));
  mount.appendChild(el('div', { class: 'modal-head' }, [el('div', { class: 'display' }, 'New task'), el('button', { class: 'modal-close', onclick: closeModal }, '×')]));
  const form = el('form', {}, [
    el('div', { class: 'field' }, [el('label', {}, 'Title'), el('input', { id: 'tkTitle', required: true, placeholder: 'e.g. BPCS187 — Unit 4' })]),
    el('div', { class: 'field-row' }, [
      el('div', { class: 'field' }, [el('label', {}, 'Subject'), el('select', { id: 'tkSubject' }, [el('option', { value: '' }, '— none —'), ...subjOptions])]),
      el('div', { class: 'field' }, [el('label', {}, 'Type'), el('select', { id: 'tkType' }, ['study', 'revision', 'pyq', 'answer', 'light'].map(t => el('option', { value: t }, t)))]),
    ]),
    el('div', { class: 'field-row' }, [
      el('div', { class: 'field' }, [el('label', {}, 'Date'), el('input', { type: 'date', id: 'tkDate', value: selectedDate, min: STUDY_START, max: STUDY_END })]),
      el('div', { class: 'field' }, [el('label', {}, 'Minutes'), el('input', { type: 'number', id: 'tkDuration', value: 30, min: 5, step: 5 })]),
    ]),
    el('button', { class: 'btn btn-primary btn-block', type: 'submit' }, 'Add task'),
  ]);
  form.onsubmit = async (e) => {
    e.preventDefault();
    const row = await db.insertRow('tasks', {
      title: document.getElementById('tkTitle').value.trim(),
      subject_id: document.getElementById('tkSubject').value || null,
      task_type: document.getElementById('tkType').value,
      task_date: document.getElementById('tkDate').value,
      duration_min: Number(document.getElementById('tkDuration').value) || 30,
    });
    state.tasks.push(row);
    closeModal();
    render(container);
  };
  mount.appendChild(form);
  document.getElementById('modalBackdrop').classList.remove('hidden');
}

export async function render(container) {
  await autoCarryForward();
  container.innerHTML = '';

  const header = el('div', { class: 'flex-between', style: 'margin-bottom:14px;' }, [
    el('div', { class: 'flex' }, [
      el('button', { class: 'btn btn-sm', onclick: () => { selectedDate = shiftDate(selectedDate, -1); render(container); } }, '←'),
      el('div', { class: 'display', style: 'font-size:18px;min-width:170px;text-align:center;' }, selectedDate === todayStr() ? 'Today' : formatDate(selectedDate)),
      el('button', { class: 'btn btn-sm', onclick: () => { selectedDate = shiftDate(selectedDate, 1); render(container); } }, '→'),
    ]),
    el('button', { class: 'btn btn-primary btn-sm', onclick: () => openTaskModal(container) }, '+ Add task'),
  ]);
  container.appendChild(header);

  const exams = examsOn(selectedDate);
  if (exams.length) {
    container.appendChild(el('div', { class: `card exam-card ${exams.length > 1 ? 'double' : ''}`, style: 'margin-bottom:14px;' }, [
      el('div', { class: 'stat-label' }, exams.length > 1 ? 'TWO EXAMS TODAY' : 'EXAM TODAY'),
      ...exams.map(e => el('div', {}, [el('div', { class: 'exam-code' }, e.code), el('div', { class: 'exam-name' }, e.name)])),
    ]));
  }

  const dayTasks = state.tasks.filter(t => t.task_date === selectedDate).sort((a, b) => Number(a.completed) - Number(b.completed));
  const card = el('div', { class: 'card' });
  if (dayTasks.length === 0) {
    card.appendChild(el('div', { class: 'empty' }, [el('div', { class: 'display' }, 'Nothing planned'), el('div', {}, 'Add a task to build your plan for this day.')]));
  } else {
    dayTasks.forEach(t => {
      const subj = t.subject_id ? subjectById(t.subject_id) : null;
      const line = el('div', { class: `checkline ${t.completed ? 'done' : ''}` }, [
        el('input', { type: 'checkbox', checked: t.completed ? 'checked' : null, onchange: async (e) => { await toggleTaskDone(t, e.target.checked); render(container); } }),
        el('div', { style: 'flex:1;' }, [
          el('div', { class: 'checkline-title' }, t.title),
          el('div', { class: 'checkline-meta' }, [subj ? subj.code + ' · ' : '', minutesToLabel(t.duration_min || 30), t.carried_forward ? ' · carried forward' : '', ' · ', t.task_type].join('')),
        ]),
        el('button', { class: 'btn btn-ghost btn-sm', onclick: async () => { await db.deleteRow('tasks', t.id); state.tasks = state.tasks.filter(x => x.id !== t.id); render(container); } }, '🗑'),
      ]);
      card.appendChild(line);
    });
  }
  container.appendChild(card);
}

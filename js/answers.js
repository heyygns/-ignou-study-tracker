import { el } from './utils.js';
import { state, subjectById } from './state.js';
import * as db from './db.js';
import { closeModal } from './app.js';

const STATUSES = ['not_attempted', 'outline', 'written', 'reviewed', 'needs_improvement'];
const STATUS_LABEL = { not_attempted: 'Not attempted', outline: 'Outline created', written: 'Answer written', reviewed: 'Reviewed', needs_improvement: 'Needs improvement' };
const STATUS_BADGE = { not_attempted: 'badge-muted', outline: 'badge-amber', written: 'badge-indigo', reviewed: 'badge-green', needs_improvement: 'badge-red' };

function openAddModal(container) {
  const mount = document.getElementById('modalMount');
  mount.innerHTML = '';
  mount.appendChild(el('div', { class: 'modal-head' }, [el('div', { class: 'display' }, 'New answer-writing practice'), el('button', { class: 'modal-close', onclick: closeModal }, '×')]));
  const form = el('form', {}, [
    el('div', { class: 'field' }, [el('label', {}, 'Subject'), el('select', { id: 'aSubject', required: true }, state.subjects.map(s => el('option', { value: s.id }, s.code)))]),
    el('div', { class: 'field' }, [el('label', {}, 'Question'), el('textarea', { id: 'aQuestion', required: true })]),
    el('button', { class: 'btn btn-primary btn-block', type: 'submit' }, 'Add'),
  ]);
  form.onsubmit = async (e) => {
    e.preventDefault();
    const row = await db.insertRow('answers', { subject_id: document.getElementById('aSubject').value, question: document.getElementById('aQuestion').value.trim() });
    state.answers.push(row);
    closeModal();
    render(container);
  };
  mount.appendChild(form);
  document.getElementById('modalBackdrop').classList.remove('hidden');
}

export async function render(container) {
  container.innerHTML = '';
  container.appendChild(el('div', { class: 'flex-between', style: 'margin-bottom:14px;' }, [
    el('div', { class: 'display', style: 'font-size:20px;' }, 'Answer writing'),
    el('button', { class: 'btn btn-primary btn-sm', onclick: () => openAddModal(container) }, '+ Add question'),
  ]));

  if (state.answers.length === 0) {
    container.appendChild(el('div', { class: 'card empty' }, [el('div', { class: 'display' }, 'No practice logged yet'), el('div', {}, 'Add a question and track it through outline → written → reviewed.')]));
    return;
  }

  state.answers.forEach(a => {
    const subj = subjectById(a.subject_id);
    const card = el('div', { class: 'card' });
    card.appendChild(el('div', { class: 'flex-between' }, [
      el('div', { style: 'font-weight:600;font-size:14px;flex:1;' }, a.question),
      el('button', { class: 'btn btn-ghost btn-sm', onclick: async () => { await db.deleteRow('answers', a.id); state.answers = state.answers.filter(x => x.id !== a.id); render(container); } }, '🗑'),
    ]));
    card.appendChild(el('div', { class: 'flex', style: 'margin-top:6px;' }, [
      el('span', { class: 'badge badge-muted' }, subj ? subj.code : ''),
      el('span', { class: `badge ${STATUS_BADGE[a.status]}` }, STATUS_LABEL[a.status]),
    ]));
    card.appendChild(el('div', { class: 'field-row', style: 'margin-top:12px;' }, [
      el('div', { class: 'field', style: 'margin-bottom:0;' }, [
        el('label', {}, 'Status'),
        el('select', {
          onchange: async (e) => { const updated = await db.updateRow('answers', a.id, { status: e.target.value, updated_at: new Date().toISOString() }); const i = state.answers.findIndex(x => x.id === a.id); state.answers[i] = updated; render(container); },
        }, STATUSES.map(s => el('option', { value: s, selected: s === a.status ? 'selected' : null }, STATUS_LABEL[s]))),
      ]),
      el('div', { class: 'field', style: 'margin-bottom:0;' }, [
        el('label', {}, 'Word count'),
        el('input', { type: 'number', value: a.word_count || '', min: 0, onchange: async (e) => { const updated = await db.updateRow('answers', a.id, { word_count: Number(e.target.value) || null }); const i = state.answers.findIndex(x => x.id === a.id); state.answers[i] = updated; } }),
      ]),
      el('div', { class: 'field', style: 'margin-bottom:0;' }, [
        el('label', {}, 'Time (min)'),
        el('input', { type: 'number', value: a.time_taken_min || '', min: 0, onchange: async (e) => { const updated = await db.updateRow('answers', a.id, { time_taken_min: Number(e.target.value) || null }); const i = state.answers.findIndex(x => x.id === a.id); state.answers[i] = updated; } }),
      ]),
    ]));
    card.appendChild(el('div', { class: 'field', style: 'margin-top:6px;margin-bottom:0;' }, [
      el('label', {}, 'Self-review notes'),
      el('textarea', { value: a.notes || '', onchange: async (e) => { const updated = await db.updateRow('answers', a.id, { notes: e.target.value }); const i = state.answers.findIndex(x => x.id === a.id); state.answers[i] = updated; } }),
    ]));
    container.appendChild(card);
  });
}

import { el } from './utils.js';
import { state, subjectById } from './state.js';
import * as db from './db.js';
import { todayStr } from './exams.js';
import { closeModal } from './app.js';

let filterSubject = '';

function subjectSelect(id) {
  return el('select', { id }, [el('option', { value: '' }, '— none —'), ...state.subjects.map(s => el('option', { value: s.id }, s.code))]);
}

function openAddModal(container) {
  const mount = document.getElementById('modalMount');
  mount.innerHTML = '';
  mount.appendChild(el('div', { class: 'modal-head' }, [el('div', { class: 'display' }, 'Add question'), el('button', { class: 'modal-close', onclick: closeModal }, '×')]));
  const form = el('form', {}, [
    el('div', { class: 'field' }, [el('label', {}, 'Question'), el('textarea', { id: 'qText', required: true })]),
    el('div', { class: 'field-row' }, [
      el('div', { class: 'field' }, [el('label', {}, 'Subject'), subjectSelect('qSubject')]),
      el('div', { class: 'field' }, [el('label', {}, 'Unit #'), el('input', { id: 'qUnit', type: 'number', min: 1 })]),
    ]),
    el('div', { class: 'field-row' }, [
      el('div', { class: 'field' }, [el('label', {}, 'Importance'), el('select', { id: 'qImportance' }, ['low', 'medium', 'high'].map(v => el('option', { value: v }, v)))]),
      el('div', { class: 'field' }, [el('label', {}, 'Confidence'), el('select', { id: 'qConfidence' }, ['weak', 'okay', 'strong'].map(v => el('option', { value: v }, v)))]),
    ]),
    el('button', { class: 'btn btn-primary btn-block', type: 'submit' }, 'Add question'),
  ]);
  form.onsubmit = async (e) => {
    e.preventDefault();
    const row = await db.insertRow('questions', {
      question: document.getElementById('qText').value.trim(),
      subject_id: document.getElementById('qSubject').value || null,
      unit_number: Number(document.getElementById('qUnit').value) || null,
      importance: document.getElementById('qImportance').value,
      confidence: document.getElementById('qConfidence').value,
    });
    state.questions.push(row);
    closeModal();
    render(container);
  };
  mount.appendChild(form);
  document.getElementById('modalBackdrop').classList.remove('hidden');
}

const IMPORTANCE_BADGE = { low: 'badge-muted', medium: 'badge-amber', high: 'badge-red' };
const CONFIDENCE_BADGE = { weak: 'badge-red', okay: 'badge-amber', strong: 'badge-green' };

export async function render(container) {
  container.innerHTML = '';
  container.appendChild(el('div', { class: 'flex-between', style: 'margin-bottom:14px;' }, [
    el('div', { class: 'display', style: 'font-size:20px;' }, 'Question bank'),
    el('button', { class: 'btn btn-primary btn-sm', onclick: () => openAddModal(container) }, '+ Add question'),
  ]));

  container.appendChild(el('div', { class: 'field' }, [
    el('label', {}, 'Subject'),
    el('select', { onchange: e => { filterSubject = e.target.value; render(container); } }, [
      el('option', { value: '' }, 'All subjects'),
      ...state.subjects.map(s => el('option', { value: s.id, selected: s.id === filterSubject ? 'selected' : null }, s.code)),
    ]),
  ]));

  let items = state.questions.filter(q => !filterSubject || q.subject_id === filterSubject);
  items = items.sort((a, b) => (a.importance === 'high' ? -1 : 1) - (b.importance === 'high' ? -1 : 1));

  const card = el('div', { class: 'card' });
  if (items.length === 0) {
    card.appendChild(el('div', { class: 'empty' }, [el('div', { class: 'display' }, 'No questions yet'), el('div', {}, 'Build your own bank of important questions per unit.')]));
  } else {
    items.forEach(q => {
      const subj = q.subject_id ? subjectById(q.subject_id) : null;
      const row = el('div', { class: 'card', style: 'margin-top:0;margin-bottom:10px;padding:14px;' });
      row.appendChild(el('div', { class: 'flex-between' }, [
        el('div', { style: 'font-size:14px;flex:1;' }, q.question),
        el('button', { class: 'btn btn-ghost btn-sm', onclick: async () => { await db.deleteRow('questions', q.id); state.questions = state.questions.filter(x => x.id !== q.id); render(container); } }, '🗑'),
      ]));
      row.appendChild(el('div', { class: 'flex', style: 'margin-top:8px;flex-wrap:wrap;gap:6px;' }, [
        el('span', { class: 'badge badge-muted' }, subj ? subj.code : 'No subject'),
        el('span', { class: `badge ${IMPORTANCE_BADGE[q.importance]}` }, `${q.importance} importance`),
        el('span', { class: `badge ${CONFIDENCE_BADGE[q.confidence]}` }, q.confidence),
      ]));
      row.appendChild(el('div', { class: 'field-row', style: 'margin-top:10px;' }, [
        el('div', { class: 'field', style: 'margin-bottom:0;' }, [
          el('label', {}, 'Confidence'),
          el('select', {
            onchange: async (e) => { const updated = await db.updateRow('questions', q.id, { confidence: e.target.value }); const i = state.questions.findIndex(x => x.id === q.id); state.questions[i] = updated; },
          }, ['weak', 'okay', 'strong'].map(v => el('option', { value: v, selected: v === q.confidence ? 'selected' : null }, v))),
        ]),
        el('div', { class: 'field', style: 'margin-bottom:0;' }, [
          el('button', {
            class: 'btn btn-sm btn-block', style: 'margin-top:20px;', onclick: async () => {
              const updated = await db.updateRow('questions', q.id, { attempts: (q.attempts || 0) + 1, last_attempted: todayStr(), status: 'attempted' });
              const i = state.questions.findIndex(x => x.id === q.id); state.questions[i] = updated; render(container);
            },
          }, `Mark attempted (${q.attempts || 0})`),
        ]),
      ]));
      card.appendChild(row);
    });
  }
  container.appendChild(card);
}

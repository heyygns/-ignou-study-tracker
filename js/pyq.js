import { el } from './utils.js';
import { state, subjectById } from './state.js';
import * as db from './db.js';
import { closeModal } from './app.js';

let filterSubject = '';

function openAddModal(container) {
  const mount = document.getElementById('modalMount');
  mount.innerHTML = '';
  mount.appendChild(el('div', { class: 'modal-head' }, [el('div', { class: 'display' }, 'Add PYQ paper'), el('button', { class: 'modal-close', onclick: closeModal }, '×')]));
  const form = el('form', {}, [
    el('div', { class: 'field' }, [el('label', {}, 'Subject'), el('select', { id: 'pSubject', required: true }, state.subjects.map(s => el('option', { value: s.id }, s.code)))]),
    el('div', { class: 'field-row' }, [
      el('div', { class: 'field' }, [el('label', {}, 'Year'), el('input', { id: 'pYear', type: 'number', min: 2015, max: 2026, value: new Date().getFullYear() })]),
      el('div', { class: 'field' }, [el('label', {}, 'URL (verified only)'), el('input', { id: 'pUrl', type: 'url', placeholder: 'https://' })]),
    ]),
    el('div', { class: 'field' }, [el('label', {}, 'Notes'), el('textarea', { id: 'pNotes' })]),
    el('button', { class: 'btn btn-primary btn-block', type: 'submit' }, 'Add'),
  ]);
  form.onsubmit = async (e) => {
    e.preventDefault();
    const row = await db.insertRow('pyqs', {
      subject_id: document.getElementById('pSubject').value,
      year: Number(document.getElementById('pYear').value) || null,
      url: document.getElementById('pUrl').value.trim() || null,
      notes: document.getElementById('pNotes').value.trim() || null,
    });
    state.pyqs.push(row);
    closeModal();
    render(container);
  };
  mount.appendChild(form);
  document.getElementById('modalBackdrop').classList.remove('hidden');
}

export async function render(container) {
  container.innerHTML = '';
  container.appendChild(el('div', { class: 'flex-between', style: 'margin-bottom:14px;' }, [
    el('div', { class: 'display', style: 'font-size:20px;' }, 'Previous year questions'),
    el('button', { class: 'btn btn-primary btn-sm', onclick: () => openAddModal(container) }, '+ Add paper'),
  ]));

  container.appendChild(el('div', { class: 'field' }, [
    el('label', {}, 'Subject'),
    el('select', { onchange: e => { filterSubject = e.target.value; render(container); } }, [
      el('option', { value: '' }, 'All subjects'),
      ...state.subjects.map(s => el('option', { value: s.id, selected: s.id === filterSubject ? 'selected' : null }, s.code)),
    ]),
  ]));

  const items = state.pyqs.filter(p => !filterSubject || p.subject_id === filterSubject).sort((a, b) => (b.year || 0) - (a.year || 0));
  const card = el('div', { class: 'card' });
  if (items.length === 0) {
    card.appendChild(el('div', { class: 'empty' }, [el('div', { class: 'display' }, 'No PYQ papers yet'), el('div', {}, 'Add verified previous-year paper links as you find them.')]));
  } else {
    items.forEach(p => {
      const subj = subjectById(p.subject_id);
      card.appendChild(el('div', { class: 'checkline' }, [
        el('input', { type: 'checkbox', checked: p.completed ? 'checked' : null, onchange: async (e) => { const updated = await db.updateRow('pyqs', p.id, { completed: e.target.checked }); const i = state.pyqs.findIndex(x => x.id === p.id); state.pyqs[i] = updated; render(container); } }),
        el('div', { style: 'flex:1;' }, [
          el('div', { class: 'checkline-title' }, p.url ? el('a', { href: p.url, target: '_blank', rel: 'noopener' }, `${subj ? subj.code : ''} — ${p.year || 'Year unknown'}`) : `${subj ? subj.code : ''} — ${p.year || 'Year unknown'}`),
          p.notes ? el('div', { class: 'checkline-meta' }, p.notes) : null,
        ]),
        el('button', { class: 'btn btn-ghost btn-sm', onclick: async () => { await db.deleteRow('pyqs', p.id); state.pyqs = state.pyqs.filter(x => x.id !== p.id); render(container); } }, '🗑'),
      ]));
    });
  }
  container.appendChild(card);
}

import { el } from './utils.js';
import { state, subjectById } from './state.js';
import * as db from './db.js';
import { closeModal } from './app.js';

let query = '';

function openAddModal(container) {
  const mount = document.getElementById('modalMount');
  mount.innerHTML = '';
  mount.appendChild(el('div', { class: 'modal-head' }, [el('div', { class: 'display' }, 'New note'), el('button', { class: 'modal-close', onclick: closeModal }, '×')]));
  const form = el('form', {}, [
    el('div', { class: 'field' }, [el('label', {}, 'Title'), el('input', { id: 'nTitle', required: true })]),
    el('div', { class: 'field-row' }, [
      el('div', { class: 'field' }, [el('label', {}, 'Subject'), el('select', { id: 'nSubject' }, [el('option', { value: '' }, '— none —'), ...state.subjects.map(s => el('option', { value: s.id }, s.code))])]),
      el('div', { class: 'field' }, [el('label', {}, 'Unit #'), el('input', { id: 'nUnit', type: 'number', min: 1 })]),
    ]),
    el('div', { class: 'field' }, [el('label', {}, 'Content'), el('textarea', { id: 'nContent', rows: 6 })]),
    el('div', { class: 'field' }, [el('label', {}, 'Tags (comma separated)'), el('input', { id: 'nTags', placeholder: 'e.g. important, formula' })]),
    el('button', { class: 'btn btn-primary btn-block', type: 'submit' }, 'Save note'),
  ]);
  form.onsubmit = async (e) => {
    e.preventDefault();
    const tags = document.getElementById('nTags').value.split(',').map(t => t.trim()).filter(Boolean);
    const row = await db.insertRow('notes', {
      title: document.getElementById('nTitle').value.trim(),
      subject_id: document.getElementById('nSubject').value || null,
      unit_number: Number(document.getElementById('nUnit').value) || null,
      content: document.getElementById('nContent').value,
      tags,
    });
    state.notes.push(row);
    closeModal();
    render(container);
  };
  mount.appendChild(form);
  document.getElementById('modalBackdrop').classList.remove('hidden');
}

export async function render(container) {
  container.innerHTML = '';
  container.appendChild(el('div', { class: 'flex-between', style: 'margin-bottom:14px;' }, [
    el('div', { class: 'display', style: 'font-size:20px;' }, 'Notes'),
    el('button', { class: 'btn btn-primary btn-sm', onclick: () => openAddModal(container) }, '+ New note'),
  ]));

  container.appendChild(el('div', { class: 'field search-box' }, [
    el('input', { placeholder: 'Search notes…', value: query, oninput: e => { query = e.target.value; renderList(); } }),
  ]));

  const listMount = el('div');
  container.appendChild(listMount);

  function renderList() {
    listMount.innerHTML = '';
    const q = query.trim().toLowerCase();
    const items = state.notes.filter(n => !q || n.title.toLowerCase().includes(q) || (n.content || '').toLowerCase().includes(q) || (n.tags || []).some(t => t.toLowerCase().includes(q)))
      .sort((a, b) => (b.updated_at || b.created_at).localeCompare(a.updated_at || a.created_at));
    if (items.length === 0) {
      listMount.appendChild(el('div', { class: 'card empty' }, [el('div', { class: 'display' }, 'No notes found'), el('div', {}, 'Keep it simple — write what you need to remember.')]));
      return;
    }
    items.forEach(n => {
      const subj = n.subject_id ? subjectById(n.subject_id) : null;
      const card = el('div', { class: 'card' });
      card.appendChild(el('div', { class: 'flex-between' }, [
        el('div', { style: 'font-weight:600;' }, n.title),
        el('button', { class: 'btn btn-ghost btn-sm', onclick: async () => { await db.deleteRow('notes', n.id); state.notes = state.notes.filter(x => x.id !== n.id); renderList(); } }, '🗑'),
      ]));
      card.appendChild(el('div', { class: 'muted', style: 'font-size:12px;margin:4px 0 8px;' }, [subj ? subj.code : '', n.unit_number ? ` · Unit ${n.unit_number}` : ''].join('')));
      card.appendChild(el('textarea', {
        rows: 4, value: n.content || '', oninput: async (e) => {
          const updated = await db.updateRow('notes', n.id, { content: e.target.value, updated_at: new Date().toISOString() });
          const i = state.notes.findIndex(x => x.id === n.id); state.notes[i] = updated;
        },
      }));
      if ((n.tags || []).length) card.appendChild(el('div', { class: 'flex', style: 'margin-top:8px;flex-wrap:wrap;gap:5px;' }, n.tags.map(t => el('span', { class: 'badge badge-muted' }, t))));
      listMount.appendChild(card);
    });
  }
  renderList();
}

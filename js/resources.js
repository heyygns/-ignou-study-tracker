import { el, toast, escapeHtml } from './utils.js';
import { state, subjectById } from './state.js';
import * as db from './db.js';
import { closeModal } from './app.js';

let filterSubject = '';
let filterType = '';

const TYPES = ['slm', 'pdf', 'youtube', 'pyq', 'website', 'other'];
const TYPE_LABEL = { slm: 'SLM', pdf: 'PDF', youtube: 'YouTube', pyq: 'PYQ', website: 'Website', other: 'Other' };
const SOURCE_LABEL = { official: 'Official', egyankosh: 'eGyanKosh', 'third-party': 'Third-party' };

function subjectSelect(id, selected) {
  return el('select', { id }, [el('option', { value: '' }, '— none —'), ...state.subjects.map(s => el('option', { value: s.id, selected: s.id === selected ? 'selected' : null }, `${s.code}`))]);
}

function openAddModal(container) {
  const mount = document.getElementById('modalMount');
  mount.innerHTML = '';
  mount.appendChild(el('div', { class: 'modal-head' }, [el('div', { class: 'display' }, 'Add resource'), el('button', { class: 'modal-close', onclick: closeModal }, '×')]));
  const form = el('form', {}, [
    el('div', { class: 'field' }, [el('label', {}, 'Title'), el('input', { id: 'rTitle', required: true })]),
    el('div', { class: 'field' }, [el('label', {}, 'URL (must be a real, verified link)'), el('input', { id: 'rUrl', type: 'url', placeholder: 'https://' })]),
    el('div', { class: 'field-row' }, [
      el('div', { class: 'field' }, [el('label', {}, 'Subject'), subjectSelect('rSubject')]),
      el('div', { class: 'field' }, [el('label', {}, 'Unit #'), el('input', { id: 'rUnit', type: 'number', min: 1 })]),
    ]),
    el('div', { class: 'field-row' }, [
      el('div', { class: 'field' }, [el('label', {}, 'Type'), el('select', { id: 'rType' }, TYPES.map(t => el('option', { value: t }, TYPE_LABEL[t])))]),
      el('div', { class: 'field' }, [el('label', {}, 'Source'), el('select', { id: 'rSource' }, Object.keys(SOURCE_LABEL).map(s => el('option', { value: s }, SOURCE_LABEL[s])))]),
    ]),
    el('div', { class: 'field' }, [el('label', {}, 'Notes'), el('textarea', { id: 'rNotes' })]),
    el('button', { class: 'btn btn-primary btn-block', type: 'submit' }, 'Add resource'),
  ]);
  form.onsubmit = async (e) => {
    e.preventDefault();
    const row = await db.insertRow('resources', {
      title: document.getElementById('rTitle').value.trim(),
      url: document.getElementById('rUrl').value.trim() || null,
      subject_id: document.getElementById('rSubject').value || null,
      unit_number: Number(document.getElementById('rUnit').value) || null,
      type: document.getElementById('rType').value,
      source: document.getElementById('rSource').value,
      notes: document.getElementById('rNotes').value.trim() || null,
    });
    state.resources.push(row);
    closeModal();
    render(container);
  };
  mount.appendChild(form);
  document.getElementById('modalBackdrop').classList.remove('hidden');
}

export async function render(container) {
  container.innerHTML = '';
  container.appendChild(el('div', { class: 'flex-between', style: 'margin-bottom:14px;' }, [
    el('div', { class: 'display', style: 'font-size:20px;' }, 'Resources'),
    el('button', { class: 'btn btn-primary btn-sm', onclick: () => openAddModal(container) }, '+ Add resource'),
  ]));

  container.appendChild(el('div', { class: 'field-row' }, [
    el('div', { class: 'field' }, [
      el('label', {}, 'Subject'),
      el('select', {
        onchange: (e) => { filterSubject = e.target.value; render(container); },
      }, [el('option', { value: '', selected: filterSubject === '' ? 'selected' : null }, 'All subjects'), ...state.subjects.map(s => el('option', { value: s.id, selected: s.id === filterSubject ? 'selected' : null }, s.code))]),
    ]),
    el('div', { class: 'field' }, [
      el('label', {}, 'Type'),
      el('select', {
        onchange: (e) => { filterType = e.target.value; render(container); },
      }, [el('option', { value: '', selected: filterType === '' ? 'selected' : null }, 'All types'), ...TYPES.map(t => el('option', { value: t, selected: t === filterType ? 'selected' : null }, TYPE_LABEL[t]))]),
    ]),
  ]));

  const items = state.resources.filter(r => (!filterSubject || r.subject_id === filterSubject) && (!filterType || r.type === filterType));
  const card = el('div', { class: 'card' });
  if (items.length === 0) {
    card.appendChild(el('div', { class: 'empty' }, [el('div', { class: 'display' }, 'No resources yet'), el('div', {}, 'Add real, verified links you find for your syllabus.')]));
  } else {
    items.forEach(r => {
      const subj = r.subject_id ? subjectById(r.subject_id) : null;
      card.appendChild(el('div', { class: 'checkline' }, [
        el('input', { type: 'checkbox', checked: r.completed ? 'checked' : null, onchange: async (e) => { const updated = await db.updateRow('resources', r.id, { completed: e.target.checked }); const i = state.resources.findIndex(x => x.id === r.id); state.resources[i] = updated; render(container); } }),
        el('div', { style: 'flex:1;' }, [
          el('div', { class: 'checkline-title' }, r.url ? el('a', { href: r.url, target: '_blank', rel: 'noopener' }, r.title) : r.title),
          el('div', { class: 'checkline-meta' }, [subj ? subj.code : '', r.unit_number ? ` · Unit ${r.unit_number}` : '', ` · ${TYPE_LABEL[r.type]} · ${SOURCE_LABEL[r.source] || r.source}`].join('')),
        ]),
        el('button', { class: 'btn btn-ghost btn-sm', onclick: async () => { await db.deleteRow('resources', r.id); state.resources = state.resources.filter(x => x.id !== r.id); render(container); } }, '🗑'),
      ]));
    });
  }
  container.appendChild(card);
}

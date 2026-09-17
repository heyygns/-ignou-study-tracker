import { el, toast } from './utils.js';
import { state, subjectById, unitsFor, subjectProgress, prepStatus } from './state.js';
import * as db from './db.js';
import { formatDate, formatTimeRange, daysBetween, todayStr } from './exams.js';

function statusBadge(level) {
  const map = { green: ['badge-green', 'Well prepared'], yellow: ['badge-amber', 'In progress'], red: ['badge-red', 'Needs attention'] };
  const [cls, label] = map[level];
  return el('span', { class: `badge ${cls}` }, label);
}

export async function render(container, openSubjectId = null) {
  container.innerHTML = '';
  if (openSubjectId) return renderDetail(container, openSubjectId);

  container.appendChild(el('div', { class: 'display', style: 'font-size:20px;margin-bottom:14px;' }, 'Subjects'));
  const sorted = [...state.subjects].sort((a, b) => (a.exam_date || '').localeCompare(b.exam_date || ''));
  sorted.forEach(s => {
    const pct = subjectProgress(s.id);
    const ps = prepStatus(s.id);
    const days = s.exam_date ? daysBetween(todayStr(), s.exam_date) : null;
    const card = el('div', {
      class: 'card', style: 'cursor:pointer;', onclick: () => render(container, s.id),
    }, [
      el('div', { class: 'card-row' }, [
        el('div', {}, [
          el('div', { style: 'font-weight:600;font-size:15px;' }, `${s.code} — ${s.name}`),
          el('div', { class: 'muted', style: 'font-size:12.5px;margin-top:2px;' }, s.exam_date ? `${formatDate(s.exam_date)}${days !== null ? ' · ' + (days >= 0 ? days + ' days left' : 'completed') : ''}` : 'No exam date set'),
        ]),
        statusBadge(ps.level),
      ]),
      el('div', { class: 'flex-between', style: 'margin-top:12px;' }, [
        el('div', { class: 'progress', style: 'flex:1;' }, el('span', { style: `width:${pct}%` })),
        el('div', { class: 'muted', style: 'font-size:12px;margin-left:10px;' }, `${pct}%`),
      ]),
    ]);
    container.appendChild(card);
  });
}

function addUnitForm(container, subject) {
  const wrap = el('div', { class: 'field-row', style: 'margin-top:10px;' });
  const numInput = el('input', { type: 'number', placeholder: 'Unit #', style: 'max-width:90px;', min: 1 });
  const titleInput = el('input', { placeholder: 'Unit title (verify against your SLM — leave blank to mark "Needs verification")' });
  wrap.appendChild(el('div', { class: 'field', style: 'flex:0;' }, numInput));
  wrap.appendChild(el('div', { class: 'field' }, titleInput));
  wrap.appendChild(el('button', {
    class: 'btn btn-sm', style: 'height:38px;align-self:flex-start;margin-top:1px;', onclick: async () => {
      const num = Number(numInput.value);
      if (!num) { toast('Enter a unit number', 'error'); return; }
      const row = await db.insertRow('units', { subject_id: subject.id, unit_number: num, title: titleInput.value.trim() || 'Needs verification' });
      state.units.push(row);
      render(container, subject.id);
    },
  }, 'Add unit'));
  return wrap;
}

function renderDetail(container, subjectId) {
  const subject = subjectById(subjectId);
  if (!subject) { render(container); return; }
  const units = unitsFor(subject.id);
  const pct = subjectProgress(subject.id);
  const ps = prepStatus(subject.id);

  container.appendChild(el('button', { class: 'btn btn-ghost btn-sm', style: 'margin-bottom:10px;padding-left:0;', onclick: () => render(container) }, '← All subjects'));

  const head = el('div', { class: 'card' }, [
    el('div', { class: 'card-row' }, [
      el('div', {}, [
        el('div', { class: 'display', style: 'font-size:19px;' }, subject.code),
        el('div', { class: 'muted', style: 'margin-top:2px;' }, subject.name),
      ]),
      statusBadge(ps.level),
    ]),
    el('div', { class: 'muted', style: 'font-size:12.5px;margin-top:10px;' }, subject.exam_date ? `Exam: ${formatDate(subject.exam_date)}${subject.exam_time ? ' · ' + formatTimeRange(...subject.exam_time.split('-')) : ''}` : 'No exam date'),
    el('div', { class: 'flex-between', style: 'margin-top:10px;' }, [
      el('div', { class: 'progress', style: 'flex:1;' }, el('span', { style: `width:${pct}%` })),
      el('div', { class: 'muted', style: 'font-size:12px;margin-left:10px;' }, `${pct}% units done`),
    ]),
  ]);
  container.appendChild(head);

  // transparent prep status explanation
  const psCard = el('div', { class: 'card' });
  psCard.appendChild(el('div', { class: 'card-row' }, [el('div', { style: 'font-weight:600;' }, 'Preparation status'), el('div', { class: 'muted' }, `${ps.score}/100`)]));
  ps.factors.forEach(f => {
    psCard.appendChild(el('div', { style: 'margin-top:8px;' }, [
      el('div', { class: 'flex-between', style: 'font-size:12.5px;' }, [el('span', {}, `${f.label} (${f.weight}% weight)`), el('span', { class: 'muted' }, `${f.pct}%`)]),
      el('div', { class: 'progress', style: 'margin-top:4px;' }, el('span', { style: `width:${f.pct}%` })),
    ]));
  });
  container.appendChild(psCard);

  // units
  container.appendChild(el('div', { class: 'section-title' }, `Units (${units.filter(u=>u.completed).length}/${units.length})`));
  const unitsCard = el('div', { class: 'card' });
  if (units.length === 0) {
    unitsCard.appendChild(el('div', { class: 'empty' }, [el('div', { class: 'display' }, 'No units yet'), el('div', {}, 'Add units below — verify titles against your official IGNOU study material.')]));
  } else {
    units.forEach(u => {
      unitsCard.appendChild(el('div', { class: `checkline ${u.completed ? 'done' : ''}` }, [
        el('input', {
          type: 'checkbox', checked: u.completed ? 'checked' : null, onchange: async (e) => {
            const completed = e.target.checked;
            const updated = await db.updateRow('units', u.id, { completed, completed_at: completed ? new Date().toISOString() : null });
            const idx = state.units.findIndex(x => x.id === u.id);
            if (idx >= 0) state.units[idx] = updated;
            if (completed) {
              const revs = await db.createRevisionSchedule(subject.id, u.id, todayStr());
              state.revisions.push(...revs);
              toast('Revision schedule created (day 1/3/7/14).', 'success');
            }
            render(container, subject.id);
          },
        }),
        el('div', { style: 'flex:1;' }, [
          el('div', { class: 'checkline-title' }, `Unit ${u.unit_number} — ${u.title}`),
          u.title === 'Needs verification' ? el('div', { class: 'checkline-meta' }, 'Title needs verification against official material') : null,
        ]),
        el('button', { class: 'btn btn-ghost btn-sm', onclick: async () => { await db.deleteRow('units', u.id); state.units = state.units.filter(x => x.id !== u.id); render(container, subject.id); } }, '🗑'),
      ]));
    });
  }
  unitsCard.appendChild(addUnitForm(container, subject));
  container.appendChild(unitsCard);

  // quick links to filtered content
  container.appendChild(el('div', { class: 'section-title' }, 'Related material for this subject'));
  const linksCard = el('div', { class: 'grid-2' });
  const linkBtn = (label, count, route) => el('button', {
    class: 'card', style: 'text-align:left;cursor:pointer;', onclick: () => window.__navigate__(route),
  }, [el('div', { style: 'font-weight:600;' }, label), el('div', { class: 'muted', style: 'font-size:12.5px;' }, `${count} item${count === 1 ? '' : 's'}`)]);
  linksCard.appendChild(linkBtn('Resources', state.resources.filter(r => r.subject_id === subject.id).length, 'resources'));
  linksCard.appendChild(linkBtn('Notes', state.notes.filter(n => n.subject_id === subject.id).length, 'notes'));
  linksCard.appendChild(linkBtn('PYQs', state.pyqs.filter(p => p.subject_id === subject.id).length, 'pyqs'));
  linksCard.appendChild(linkBtn('Question bank', state.questions.filter(q => q.subject_id === subject.id).length, 'questions'));
  container.appendChild(linksCard);
}

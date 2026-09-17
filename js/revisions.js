import { el } from './utils.js';
import { state, subjectById } from './state.js';
import * as db from './db.js';
import { todayStr, formatDate } from './exams.js';

const STAGE_LABEL = { day1: 'Day 1', day3: 'Day 3', day7: 'Day 7', day14: 'Day 14', final: 'Final revision' };

export async function render(container) {
  container.innerHTML = '';
  container.appendChild(el('div', { class: 'display', style: 'font-size:20px;margin-bottom:14px;' }, 'Revisions'));

  const today = todayStr();
  const pending = state.revisions.filter(r => !r.completed);
  const overdue = pending.filter(r => r.due_date < today).sort((a, b) => a.due_date.localeCompare(b.due_date));
  const dueToday = pending.filter(r => r.due_date === today);
  const upcoming = pending.filter(r => r.due_date > today).sort((a, b) => a.due_date.localeCompare(b.due_date)).slice(0, 20);

  async function markDone(r) {
    const updated = await db.updateRow('revisions', r.id, { completed: true, completed_at: new Date().toISOString() });
    const i = state.revisions.findIndex(x => x.id === r.id);
    state.revisions[i] = updated;
    render(container);
  }

  function section(title, items, badgeClass) {
    container.appendChild(el('div', { class: 'section-title' }, `${title} (${items.length})`));
    const card = el('div', { class: 'card' });
    if (items.length === 0) {
      card.appendChild(el('div', { class: 'muted', style: 'padding:8px 0;' }, 'Nothing here.'));
    } else {
      items.forEach(r => {
        const subj = subjectById(r.subject_id);
        const unit = state.units.find(u => u.id === r.unit_id);
        card.appendChild(el('div', { class: 'list-row' }, [
          el('div', {}, [
            el('div', { style: 'font-weight:600;font-size:13.5px;' }, `${subj ? subj.code : ''} — ${unit ? 'Unit ' + unit.unit_number : ''}`),
            el('div', { class: 'muted', style: 'font-size:12px;' }, `${STAGE_LABEL[r.stage] || r.stage} · due ${formatDate(r.due_date)}`),
          ]),
          el('button', { class: 'btn btn-sm btn-primary', onclick: () => markDone(r) }, 'Revise ✓'),
        ]));
      });
    }
    container.appendChild(card);
  }

  section('Overdue', overdue);
  section("Today's revision", dueToday);
  section('Upcoming', upcoming);
}

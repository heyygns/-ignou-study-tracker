import { $, el, toast } from './utils.js';
import * as db from './db.js';
import { EXAMS, formatDate, formatTimeRange, isDoubleExamDay } from './exams.js';
import { supabase } from './supabaseClient.js';

export function runSetupWizard() {
  return new Promise((resolve) => {
    const backdrop = $('#wizardBackdrop');
    const modal = $('#wizardModal');
    let step = 1;
    const data = { name: '', weekdayWindows: [{ start: '06:15', end: '07:45', label: 'Morning' }, { start: '21:30', end: '23:30', label: 'Night' }], weekendWindows: [{ start: '07:00', end: '10:00', label: 'Morning' }, { start: '16:00', end: '19:00', label: 'Afternoon' }] };

    function steps() { return el('div', { class: 'wizard-steps' }, [1, 2, 3, 4].map(n => el('span', { class: n <= step ? 'done' : '' }))); }

    function renderStep1() {
      modal.innerHTML = '';
      modal.appendChild(steps());
      modal.appendChild(el('div', { class: 'display', style: 'font-size:22px;margin-bottom:4px;' }, 'Welcome to your IGNOU Study Command Center'));
      modal.appendChild(el('p', { class: 'muted' }, "Let's set things up — this takes under a minute."));
      const nameField = el('div', { class: 'field' }, [el('label', {}, 'What should we call you?'), el('input', { id: 'wizName', placeholder: 'Your name', value: data.name })]);
      modal.appendChild(nameField);
      modal.appendChild(el('button', {
        class: 'btn btn-primary btn-block', onclick: () => {
          data.name = $('#wizName').value.trim() || 'there';
          step = 2; renderStep2();
        },
      }, 'Continue'));
    }

    function renderStep2() {
      modal.innerHTML = '';
      modal.appendChild(steps());
      modal.appendChild(el('div', { class: 'display', style: 'font-size:20px;margin-bottom:4px;' }, 'Confirm your exam schedule'));
      modal.appendChild(el('p', { class: 'muted' }, `${EXAMS.length} papers, 18 Sep 2026 → 7 Jan 2027. This is fixed — edit dates isn't offered on purpose to avoid mistakes.`));
      const list = el('div', { class: 'card', style: 'max-height:280px;overflow-y:auto;padding:6px 14px;' });
      EXAMS.forEach(e => {
        list.appendChild(el('div', { class: 'list-row' }, [
          el('div', {}, [
            el('div', { style: 'font-weight:600;font-size:13.5px;' }, `${e.code} — ${e.name}`),
            el('div', { class: 'muted', style: 'font-size:12px;' }, `${formatDate(e.date)} · ${formatTimeRange(e.start, e.end)}`),
          ]),
          isDoubleExamDay(e.date) ? el('span', { class: 'badge badge-amber' }, 'Double-exam day') : null,
        ]));
      });
      modal.appendChild(list);
      modal.appendChild(el('button', { class: 'btn btn-primary btn-block', style: 'margin-top:14px;', onclick: () => { step = 3; renderStep3(); } }, 'Looks right — continue'));
    }

    function windowRow(w, idx, arr) {
      return el('div', { class: 'field-row', style: 'align-items:flex-end;' }, [
        el('div', { class: 'field' }, [el('label', {}, 'Start'), el('input', { type: 'time', value: w.start, oninput: e => arr[idx].start = e.target.value })]),
        el('div', { class: 'field' }, [el('label', {}, 'End'), el('input', { type: 'time', value: w.end, oninput: e => arr[idx].end = e.target.value })]),
      ]);
    }

    function renderStep3() {
      modal.innerHTML = '';
      modal.appendChild(steps());
      modal.appendChild(el('div', { class: 'display', style: 'font-size:20px;margin-bottom:4px;' }, 'Set your study windows'));
      modal.appendChild(el('p', { class: 'muted' }, 'Based on a 9 AM–8 PM workday. You can change these anytime in Settings.'));
      modal.appendChild(el('div', { class: 'section-title', style: 'margin-top:16px;' }, 'Weekdays'));
      data.weekdayWindows.forEach((w, i) => modal.appendChild(windowRow(w, i, data.weekdayWindows)));
      modal.appendChild(el('div', { class: 'section-title' }, 'Weekends'));
      data.weekendWindows.forEach((w, i) => modal.appendChild(windowRow(w, i, data.weekendWindows)));
      modal.appendChild(el('button', { class: 'btn btn-primary btn-block', style: 'margin-top:6px;', onclick: () => { step = 4; renderStep4(); } }, 'Continue'));
    }

    async function renderStep4() {
      modal.innerHTML = '';
      modal.appendChild(steps());
      modal.appendChild(el('div', { class: 'display', style: 'font-size:20px;margin-bottom:4px;' }, 'Generating your study plan…'));
      modal.appendChild(el('p', { class: 'muted' }, 'Creating your 20 subjects. Unit lists start empty — add units on each subject page (official unit names should be verified against your IGNOU study material before you rely on them).'));
      modal.appendChild(el('div', { class: 'spinner', style: 'margin:24px auto;' }));

      try {
        // seed subjects (idempotent-ish: only if none exist yet)
        const { data: existing } = await supabase.from('subjects').select('id').limit(1);
        if (!existing || existing.length === 0) {
          const rows = EXAMS.map((e, i) => ({
            user_id: db.uid(), code: e.code, name: e.name, exam_date: e.date, exam_time: `${e.start}-${e.end}`, sort_order: i,
          }));
          await supabase.from('subjects').insert(rows);
        }
        await db.updateProfile({
          name: data.name,
          weekday_windows: data.weekdayWindows,
          weekend_windows: data.weekendWindows,
          onboarded: true,
        });
        toast('Your study plan is ready.', 'success');
      } catch (err) {
        toast('Setup failed: ' + err.message, 'error');
      }
      backdrop.classList.add('hidden');
      resolve();
    }

    backdrop.classList.remove('hidden');
    renderStep1();
  });
}

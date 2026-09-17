import { el, toast } from './utils.js';
import { state } from './state.js';
import * as db from './db.js';
import * as auth from './auth.js';

function windowEditor(list, onChange) {
  const wrap = el('div');
  function draw() {
    wrap.innerHTML = '';
    list.forEach((w, i) => {
      wrap.appendChild(el('div', { class: 'field-row', style: 'align-items:flex-end;' }, [
        el('div', { class: 'field' }, [el('label', {}, 'Start'), el('input', { type: 'time', value: w.start, onchange: e => { w.start = e.target.value; onChange(); } })]),
        el('div', { class: 'field' }, [el('label', {}, 'End'), el('input', { type: 'time', value: w.end, onchange: e => { w.end = e.target.value; onChange(); } })]),
        el('button', { class: 'btn btn-ghost btn-sm', style: 'margin-bottom:14px;', onclick: () => { list.splice(i, 1); onChange(); draw(); } }, '🗑'),
      ]));
    });
    wrap.appendChild(el('button', { class: 'btn btn-sm', onclick: () => { list.push({ start: '07:00', end: '08:00' }); onChange(); draw(); } }, '+ Add window'));
  }
  draw();
  return wrap;
}

export async function render(container) {
  container.innerHTML = '';
  container.appendChild(el('div', { class: 'display', style: 'font-size:20px;margin-bottom:14px;' }, 'Settings'));

  const profile = state.profile;
  const weekday = [...(profile.weekday_windows || [])];
  const weekend = [...(profile.weekend_windows || [])];

  const save = async (patch) => {
    const updated = await db.updateProfile(patch);
    state.profile = updated;
  };
  const debounced = {};
  const debounceSave = (key, patch) => {
    clearTimeout(debounced[key]);
    debounced[key] = setTimeout(() => save(patch), 500);
  };

  const profileCard = el('div', { class: 'card' });
  profileCard.appendChild(el('div', { class: 'field' }, [el('label', {}, 'Name'), el('input', { value: profile.name || '', onchange: e => save({ name: e.target.value.trim() }) })]));
  profileCard.appendChild(el('div', { class: 'field' }, [el('label', {}, "Daily study goal (minutes)"), el('input', { type: 'number', min: 15, step: 15, value: profile.daily_goal_minutes || 120, onchange: e => save({ daily_goal_minutes: Number(e.target.value) || 120 }) })]));
  container.appendChild(el('div', { class: 'section-title' }, 'Profile'));
  container.appendChild(profileCard);

  container.appendChild(el('div', { class: 'section-title' }, 'Weekday study windows'));
  container.appendChild(el('div', { class: 'card' }, windowEditor(weekday, () => debounceSave('weekday', { weekday_windows: weekday }))));

  container.appendChild(el('div', { class: 'section-title' }, 'Weekend study windows'));
  container.appendChild(el('div', { class: 'card' }, windowEditor(weekend, () => debounceSave('weekend', { weekend_windows: weekend }))));

  container.appendChild(el('div', { class: 'section-title' }, 'Appearance'));
  const themeCard = el('div', { class: 'card' });
  const current = localStorage.getItem('theme') || 'system';
  themeCard.appendChild(el('div', { class: 'field' }, [
    el('label', {}, 'Theme'),
    el('select', {
      onchange: e => {
        localStorage.setItem('theme', e.target.value);
        if (e.target.value === 'system') document.documentElement.removeAttribute('data-theme');
        else document.documentElement.setAttribute('data-theme', e.target.value);
      },
    }, ['system', 'light', 'dark'].map(v => el('option', { value: v, selected: v === current ? 'selected' : null }, v.charAt(0).toUpperCase() + v.slice(1)))),
  ]));
  container.appendChild(themeCard);

  container.appendChild(el('div', { class: 'section-title' }, 'Backup'));
  const backupCard = el('div', { class: 'card flex', style: 'gap:10px;flex-wrap:wrap;' });
  backupCard.appendChild(el('button', {
    class: 'btn', onclick: async () => {
      try {
        const payload = await db.exportAllData();
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = el('a', { href: url, download: `ignou-study-backup-${new Date().toISOString().slice(0, 10)}.json` });
        document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
        toast('Backup downloaded.', 'success');
      } catch (err) { toast('Export failed: ' + err.message, 'error'); }
    },
  }, '⬇ Export data (JSON)'));

  const importInput = el('input', { type: 'file', accept: 'application/json', class: 'hidden' });
  importInput.addEventListener('change', async () => {
    const file = importInput.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const payload = JSON.parse(text);
      if (!confirm('Import will add these records to your account (not replace existing data). Continue?')) return;
      await db.importAllData(payload);
      toast('Import complete — reloading your data.', 'success');
      const { refreshAllData } = await import('./app.js');
      await refreshAllData();
      render(container);
    } catch (err) { toast('Import failed: ' + err.message, 'error'); }
  });
  backupCard.appendChild(el('button', { class: 'btn', onclick: () => importInput.click() }, '⬆ Import data (JSON)'));
  backupCard.appendChild(importInput);
  container.appendChild(backupCard);

  container.appendChild(el('div', { class: 'section-title' }, 'Account'));
  const acctCard = el('div', { class: 'card' });
  acctCard.appendChild(el('div', { class: 'muted', style: 'margin-bottom:12px;' }, state.session?.user?.email || ''));
  acctCard.appendChild(el('button', { class: 'btn btn-danger', onclick: async () => { if (confirm('Sign out?')) await auth.signOut(); } }, 'Sign out'));
  container.appendChild(acctCard);
}

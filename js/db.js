import { supabase } from './supabaseClient.js';

let currentUserId = null;
export function setCurrentUser(id) { currentUserId = id; }
export function uid() { return currentUserId; }

// ---- generic helpers, table name is the only thing that changes ----

export async function listAll(table, { orderBy = 'created_at', ascending = true } = {}) {
  const { data, error } = await supabase.from(table).select('*').order(orderBy, { ascending });
  if (error) throw error;
  return data;
}

export async function insertRow(table, row) {
  const { data, error } = await supabase.from(table).insert({ ...row, user_id: uid() }).select().single();
  if (error) throw error;
  return data;
}

export async function updateRow(table, id, patch) {
  const { data, error } = await supabase.from(table).update(patch).eq('id', id).select().single();
  if (error) throw error;
  return data;
}

export async function deleteRow(table, id) {
  const { error } = await supabase.from(table).delete().eq('id', id);
  if (error) throw error;
}

// ---- profile ----

export async function getProfile() {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', uid()).single();
  if (error) throw error;
  return data;
}

export async function updateProfile(patch) {
  const { data, error } = await supabase.from('profiles').update(patch).eq('id', uid()).select().single();
  if (error) throw error;
  return data;
}

// ---- bulk fetch used at app startup: one round trip per table ----

export async function fetchAllData() {
  const tables = ['subjects', 'units', 'tasks', 'study_sessions', 'resources', 'questions', 'pyqs', 'answers', 'notes', 'revisions'];
  const results = await Promise.all(tables.map(t => supabase.from(t).select('*')));
  const out = {};
  tables.forEach((t, i) => {
    if (results[i].error) throw results[i].error;
    out[t] = results[i].data;
  });
  return out;
}

// ---- tasks: carry-forward helper ----

export async function carryForwardTask(task, newDate) {
  return insertRow('tasks', {
    subject_id: task.subject_id,
    unit_id: task.unit_id,
    title: task.title,
    task_date: newDate,
    task_type: task.task_type,
    duration_min: task.duration_min,
    carried_forward: true,
    original_date: task.original_date || task.task_date,
  });
}

// ---- revisions: spaced schedule created when a unit is completed ----

const REVISION_OFFSETS = [
  { stage: 'day1', days: 1 },
  { stage: 'day3', days: 3 },
  { stage: 'day7', days: 7 },
  { stage: 'day14', days: 14 },
];

export async function createRevisionSchedule(subjectId, unitId, completedDateStr) {
  const base = new Date(completedDateStr + 'T00:00:00');
  const rows = REVISION_OFFSETS.map(o => {
    const d = new Date(base);
    d.setDate(d.getDate() + o.days);
    const due = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    return { subject_id: subjectId, unit_id: unitId, stage: o.stage, due_date: due, user_id: uid() };
  });
  const { data, error } = await supabase.from('revisions').insert(rows).select();
  if (error) throw error;
  return data;
}

// ---- export / import (JSON backup) ----

export async function exportAllData() {
  const profile = await getProfile();
  const data = await fetchAllData();
  return { exported_at: new Date().toISOString(), profile, ...data };
}

export async function importAllData(payload) {
  const tables = ['subjects', 'units', 'tasks', 'study_sessions', 'resources', 'questions', 'pyqs', 'answers', 'notes', 'revisions'];
  for (const t of tables) {
    const rows = payload[t];
    if (!Array.isArray(rows) || rows.length === 0) continue;
    const cleaned = rows.map(r => {
      const { id, ...rest } = r; // let DB assign fresh ids to avoid collisions across accounts
      return { ...rest, user_id: uid() };
    });
    const { error } = await supabase.from(t).insert(cleaned);
    if (error) throw error;
  }
}

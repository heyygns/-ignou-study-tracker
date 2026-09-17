// A single in-memory store. Every feature module reads from this
// and calls refreshFromServer() (or mutates + re-renders) after a
// Supabase write, so every screen stays in sync within one tab.
// Cross-device sync happens because every write goes to Supabase
// first — this object is just a local cache for fast rendering.

export const state = {
  session: null,
  profile: null,
  subjects: [],
  units: [],
  tasks: [],
  study_sessions: [],
  resources: [],
  questions: [],
  pyqs: [],
  answers: [],
  notes: [],
  revisions: [],
  route: 'dashboard',
  timer: { running: false, subjectId: null, label: '', startedAt: null, elapsedBeforePause: 0 },
};

export function subjectById(id) {
  return state.subjects.find(s => s.id === id);
}

export function unitsFor(subjectId) {
  return state.units.filter(u => u.subject_id === subjectId).sort((a, b) => a.unit_number - b.unit_number);
}

export function subjectProgress(subjectId) {
  const units = unitsFor(subjectId);
  if (units.length === 0) return 0;
  const done = units.filter(u => u.completed).length;
  return Math.round((done / units.length) * 100);
}

// Transparent GREEN / YELLOW / RED preparation status.
// Score out of 100, built from five measurable, explainable factors.
export function prepStatus(subjectId) {
  const units = unitsFor(subjectId);
  const unitPct = units.length ? units.filter(u => u.completed).length / units.length : 0;

  const revs = state.revisions.filter(r => r.subject_id === subjectId);
  const revPct = revs.length ? revs.filter(r => r.completed).length / revs.length : 0;

  const pyqs = state.pyqs.filter(p => p.subject_id === subjectId);
  const pyqPct = pyqs.length ? pyqs.filter(p => p.completed).length / pyqs.length : 0;

  const answers = state.answers.filter(a => a.subject_id === subjectId);
  const answerScore = Math.min(1, answers.filter(a => a.status === 'reviewed' || a.status === 'written').length / 3);

  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const recentActivity = state.study_sessions.some(s => s.subject_id === subjectId && new Date(s.start_time) > weekAgo) ? 1 : 0;

  const score = Math.round((unitPct * 40) + (revPct * 20) + (pyqPct * 15) + (answerScore * 15) + (recentActivity * 10));
  let level = 'red';
  if (score >= 70) level = 'green';
  else if (score >= 40) level = 'yellow';
  return {
    score, level,
    factors: [
      { label: 'Units completed', pct: Math.round(unitPct * 100), weight: 40 },
      { label: 'Revisions done', pct: Math.round(revPct * 100), weight: 20 },
      { label: 'PYQs attempted', pct: Math.round(pyqPct * 100), weight: 15 },
      { label: 'Answers written', pct: Math.round(answerScore * 100), weight: 15 },
      { label: 'Studied in last 7 days', pct: recentActivity * 100, weight: 10 },
    ],
  };
}

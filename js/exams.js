// ============================================================
// Fixed IGNOU exam schedule — exactly as provided. Do not edit
// dates/times here; edit study preferences in Settings instead.
// ============================================================

export const STUDY_START = '2026-09-18';
export const STUDY_END = '2027-01-07';

export const EXAMS = [
  { code: 'BPCS187', name: 'Managing Human Resources', date: '2026-11-27', start: '14:00', end: '17:00' },
  { code: 'BEGG171', name: 'Media and Communication Skills', date: '2026-12-02', start: '14:00', end: '17:00' },
  { code: 'BSOC134', name: 'Methods of Sociological Enquiry', date: '2026-12-03', start: '10:00', end: '13:00' },
  { code: 'BPCS188', name: 'Application of Social Psychology', date: '2026-12-03', start: '14:00', end: '17:00' },
  { code: 'BPSC105', name: 'Introduction to Comparative Government and Politics', date: '2026-12-08', start: '10:00', end: '13:00' },
  { code: 'BHIC132', name: 'History of India from C.300 to 1206', date: '2026-12-11', start: '14:00', end: '17:00' },
  { code: 'BEGAE182', name: 'English Communication Skills', date: '2026-12-14', start: '10:00', end: '13:00' },
  { code: 'BSOC132', name: 'Sociology of India', date: '2026-12-15', start: '14:00', end: '17:00' },
  { code: 'BSOC131', name: 'Introduction to Sociology', date: '2026-12-17', start: '14:00', end: '17:00' },
  { code: 'BHIC133', name: 'History of India from C.1206 to 1707', date: '2026-12-18', start: '10:00', end: '13:00' },
  { code: 'BSOC133', name: 'Sociological Theories', date: '2026-12-21', start: '10:00', end: '13:00' },
  { code: 'BECS184', name: 'Data Analysis', date: '2026-12-23', start: '14:00', end: '17:00' },
  { code: 'BHIC134', name: 'History of India from C.1707 to 1950', date: '2026-12-24', start: '10:00', end: '13:00' },
  { code: 'BPSC107', name: 'Perspectives on International Relations and World History', date: '2026-12-28', start: '10:00', end: '13:00' },
  { code: 'BCOS185', name: 'Entrepreneurship', date: '2026-12-28', start: '14:00', end: '17:00' },
  { code: 'BPSC102', name: 'Constitutional Government and Democracy in India', date: '2026-12-29', start: '14:00', end: '17:00' },
  { code: 'BPSC101', name: 'Understanding Political Theory', date: '2026-12-31', start: '14:00', end: '17:00' },
  { code: 'BCOS186', name: 'Personal Selling and Salesmanship', date: '2027-01-02', start: '10:00', end: '13:00' },
  { code: 'BPCS185', name: 'Developing Emotional Competence', date: '2027-01-06', start: '14:00', end: '17:00' },
  { code: 'BPCS183', name: 'Emotional Intelligence', date: '2027-01-07', start: '10:00', end: '13:00' },
];

// dates that carry two exams — the UI must flag these clearly
export const DOUBLE_EXAM_DATES = ['2026-12-03', '2026-12-28'];

export function examsOn(dateStr) {
  return EXAMS.filter(e => e.date === dateStr);
}

export function isDoubleExamDay(dateStr) {
  return DOUBLE_EXAM_DATES.includes(dateStr);
}

export function todayStr(d = new Date()) {
  const y = d.getFullYear(), m = String(d.getMonth() + 1).padStart(2, '0'), day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function daysBetween(fromStr, toStr) {
  const a = new Date(fromStr + 'T00:00:00');
  const b = new Date(toStr + 'T00:00:00');
  return Math.round((b - a) / 86400000);
}

export function formatDate(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatTimeRange(start, end) {
  const fmt = t => {
    const [h, m] = t.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const h12 = ((h + 11) % 12) + 1;
    return m ? `${h12}:${String(m).padStart(2, '0')} ${period}` : `${h12} ${period}`;
  };
  return `${fmt(start)} – ${fmt(end)}`;
}

// next exam strictly after "today" (or today if it hasn't started based on end time)
export function nextExam(today = todayStr()) {
  const now = new Date();
  const upcoming = EXAMS
    .filter(e => e.date > today || (e.date === today && `${today}T${e.end}` >= `${todayStr()}T${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`))
    .sort((a, b) => (a.date + a.start).localeCompare(b.date + b.start));
  return upcoming[0] || null;
}

export function previousExam(today = todayStr()) {
  const past = EXAMS.filter(e => e.date < today).sort((a, b) => (b.date).localeCompare(a.date));
  return past[0] || null;
}

export function finalExam() {
  return EXAMS[EXAMS.length - 1];
}

// study phases, derived automatically from the calendar + how much
// of the syllabus is done — see computePhase() in dashboard.js for
// the progress-aware version; this is the date-only fallback.
export const PHASES = [
  { key: 'foundation', label: 'Foundation', from: '2026-09-18', to: '2026-10-15' },
  { key: 'first_pass', label: 'First-pass syllabus completion', from: '2026-10-16', to: '2026-11-20' },
  { key: 'revision', label: 'Revision', from: '2026-11-21', to: '2026-12-05' },
  { key: 'pyq_answers', label: 'PYQ + answer writing', from: '2026-12-06', to: '2026-12-20' },
  { key: 'final_push', label: 'Final exam revision', from: '2026-12-21', to: '2027-01-07' },
];

export function phaseForDate(dateStr = todayStr()) {
  return PHASES.find(p => dateStr >= p.from && dateStr <= p.to) || PHASES[PHASES.length - 1];
}

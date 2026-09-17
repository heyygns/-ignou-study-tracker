import { supabase } from './supabaseClient.js';
import * as auth from './auth.js';
import * as db from './db.js';
import { state } from './state.js';
import { $, $all, el, toast } from './utils.js';
import { runSetupWizard } from './setupWizard.js';

import * as Dashboard from './dashboard.js';
import * as Planner from './planner.js';
import * as Subjects from './subjects.js';
import * as Revisions from './revisions.js';
import * as Questions from './questions.js';
import * as Pyq from './pyq.js';
import * as Answers from './answers.js';
import * as Resources from './resources.js';
import * as Notes from './notes.js';
import * as Timer from './timer.js';
import * as Stats from './stats.js';
import * as CalendarPage from './calendar.js';
import * as Settings from './settings.js';

const ROUTES = [
  { key: 'dashboard', label: 'Dashboard', icon: '🏠', render: Dashboard.render, bottom: true },
  { key: 'planner', label: 'Planner', icon: '🗓️', render: Planner.render, bottom: true },
  { key: 'subjects', label: 'Subjects', icon: '📘', render: Subjects.render, bottom: true },
  { key: 'timer', label: 'Study Timer', icon: '⏱️', render: Timer.render, bottom: true },
  { key: 'revisions', label: 'Revisions', icon: '🔁', render: Revisions.render },
  { key: 'questions', label: 'Question Bank', icon: '❓', render: Questions.render },
  { key: 'pyqs', label: 'PYQs', icon: '📄', render: Pyq.render },
  { key: 'answers', label: 'Answer Writing', icon: '✍️', render: Answers.render },
  { key: 'resources', label: 'Resources', icon: '🔗', render: Resources.render },
  { key: 'notes', label: 'Notes', icon: '🗒️', render: Notes.render },
  { key: 'stats', label: 'Statistics', icon: '📊', render: Stats.render },
  { key: 'calendar', label: 'Calendar & Exams', icon: '📆', render: CalendarPage.render },
  { key: 'settings', label: 'Settings', icon: '⚙️', render: Settings.render },
];

window.__ROUTES__ = ROUTES; // used by dashboard "see all" links etc.

function buildNav() {
  const sideNav = $('#sideNav');
  sideNav.innerHTML = '';
  ROUTES.filter(r => r.key !== 'settings').forEach(r => {
    sideNav.appendChild(el('button', {
      class: 'nav-item', 'data-route': r.key, onclick: () => navigate(r.key),
    }, [el('span', { class: 'nav-icon' }, r.icon), r.label]));
  });

  const bottomNav = $('#bottomNav');
  bottomNav.innerHTML = '';
  const bottomRoutes = ROUTES.filter(r => r.bottom);
  bottomRoutes.forEach(r => {
    bottomNav.appendChild(el('button', {
      class: 'bottom-nav-item', 'data-route': r.key, onclick: () => navigate(r.key),
    }, [el('span', { class: 'nav-icon' }, r.icon), r.label]));
  });
  bottomNav.appendChild(el('button', { class: 'bottom-nav-item', onclick: openMoreMenu }, [el('span', { class: 'nav-icon' }, '⋯'), 'More']));
}

function openMoreMenu() {
  const extra = ROUTES.filter(r => !r.bottom);
  const mount = $('#modalMount');
  mount.innerHTML = '';
  mount.appendChild(el('div', { class: 'modal-head' }, [el('div', { class: 'display' }, 'More'), el('button', { class: 'modal-close', onclick: closeModal }, '×')]));
  extra.forEach(r => {
    mount.appendChild(el('button', {
      class: 'nav-item', style: 'font-size:15px;padding:12px 8px;', onclick: () => { closeModal(); navigate(r.key); },
    }, [el('span', { class: 'nav-icon' }, r.icon), r.label]));
  });
  $('#modalBackdrop').classList.remove('hidden');
}

export function closeModal() { $('#modalBackdrop').classList.add('hidden'); $('#modalMount').innerHTML = ''; }
$('#modalBackdrop').addEventListener('click', e => { if (e.target.id === 'modalBackdrop') closeModal(); });

async function navigate(routeKey) {
  const route = ROUTES.find(r => r.key === routeKey) || ROUTES[0];
  state.route = route.key;
  $all('.nav-item[data-route]').forEach(b => b.classList.toggle('active', b.dataset.route === route.key));
  $all('.bottom-nav-item[data-route]').forEach(b => b.classList.toggle('active', b.dataset.route === route.key));
  const content = $('#content');
  content.innerHTML = '';
  content.appendChild(el('div', { class: 'spinner', style: 'margin:60px auto;' }));
  try {
    await route.render(content);
  } catch (err) {
    console.error(err);
    content.innerHTML = '';
    content.appendChild(el('div', { class: 'card empty' }, `Something went wrong loading this page: ${err.message || err}`));
  }
  window.location.hash = route.key;
}
window.__navigate__ = navigate;

export async function refreshAllData() {
  const [profile, tables] = await Promise.all([db.getProfile(), db.fetchAllData()]);
  state.profile = profile;
  Object.assign(state, tables);
}

async function bootApp(session) {
  state.session = session;
  db.setCurrentUser(session.user.id);
  await refreshAllData();

  $('#authScreen').classList.add('hidden');
  $('#app').classList.remove('hidden');
  buildNav();

  if (!state.profile?.onboarded) {
    await runSetupWizard();
    await refreshAllData();
  }

  const startRoute = (window.location.hash || '').replace('#', '') || 'dashboard';
  navigate(ROUTES.some(r => r.key === startRoute) ? startRoute : 'dashboard');
}

function showAuthScreen() {
  $('#app').classList.add('hidden');
  $('#authScreen').classList.remove('hidden');
}

// ---------------- auth screen wiring ----------------
function switchAuthPane(id) {
  ['authSignIn', 'authSignUp', 'authReset'].forEach(p => $(`#${p}`).classList.toggle('hidden', p !== id));
}
$('#gotoSignUp').onclick = () => switchAuthPane('authSignUp');
$('#gotoSignIn').onclick = () => switchAuthPane('authSignIn');
$('#gotoReset').onclick = () => switchAuthPane('authReset');
$('#gotoSignInFromReset').onclick = () => switchAuthPane('authSignIn');

$('#signInForm').addEventListener('submit', async e => {
  e.preventDefault();
  try {
    await auth.signIn($('#siEmail').value.trim(), $('#siPassword').value);
  } catch (err) { toast(err.message, 'error'); }
});

$('#signUpForm').addEventListener('submit', async e => {
  e.preventDefault();
  try {
    const { session } = await auth.signUp($('#suEmail').value.trim(), $('#suPassword').value);
    if (!session) toast('Account created — check your email to confirm, then sign in.', 'success');
  } catch (err) { toast(err.message, 'error'); }
});

$('#resetForm').addEventListener('submit', async e => {
  e.preventDefault();
  try {
    await auth.sendPasswordReset($('#rsEmail').value.trim());
    toast('Reset link sent — check your email.', 'success');
    switchAuthPane('authSignIn');
  } catch (err) { toast(err.message, 'error'); }
});

$('#signOutBtn').onclick = async () => { await auth.signOut(); };
$('#topSettingsBtn').onclick = () => navigate('settings');

// ---------------- theme (localStorage UI preference only) ----------------
function applyStoredTheme() {
  const t = localStorage.getItem('theme') || 'system';
  if (t === 'system') document.documentElement.removeAttribute('data-theme');
  else document.documentElement.setAttribute('data-theme', t);
}
applyStoredTheme();

// ---------------- session lifecycle ----------------
let booted = false;
auth.onAuthChange(async (session) => {
  if (session && !booted) { booted = true; await bootApp(session); }
  else if (session && booted) { state.session = session; }
  else { booted = false; showAuthScreen(); }
});

(async () => {
  const session = await auth.getSession();
  if (session) { booted = true; await bootApp(session); }
  else { showAuthScreen(); }
})();

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}

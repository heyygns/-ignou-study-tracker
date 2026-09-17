# IGNOU Study Command Center

A free, cloud-synced study/exam/revision tracker for your Dec 2026 / Jan 2027
IGNOU TEE. Runs entirely on **GitHub Pages (free) + Supabase (free tier)**.
No servers, no paid hosting, no terminal needed for day-to-day use.

```
Phone  ↕
Office PC  ↕  →  one Supabase account/database  →  same data everywhere
Home PC  ↕
Laptop  ↕
```

---

## 1. What's inside

```
ignou-study-tracker/
├── index.html            single-page app shell
├── css/style.css         all styling (light + dark mode)
├── js/                   vanilla JS, one module per feature
├── supabase/schema.sql   run once in Supabase to create your database
├── manifest.json + sw.js optional "add to home screen" support
└── README.md             this file
```

**Simplification note:** the spec asked for a separate "Tasks" screen and a
separate "Planner" screen. They'd track the same underlying data, so this
build merges them into one **Planner** screen (a date-by-date task list with
carry-forward) to avoid two screens doing the same job. Everything else in
the spec — Subjects, Units, Revisions, Question Bank, PYQs, Answer Writing,
Resources, Notes, Timer, Statistics, Calendar/Exams, Settings — is its own
screen, exactly as requested.

---

## 2. Set up Supabase (5 minutes)

1. Go to **supabase.com** → sign up (free) → **New project**.
   - Pick any name, a strong database password (save it somewhere safe —
     you won't need it for the app itself), and the region closest to India.
2. Once the project is ready, open **SQL Editor → New query**.
3. Open `supabase/schema.sql` from this folder, copy **all** of it, paste it
   into the SQL editor, and click **Run**. This creates every table, turns
   on Row Level Security, and adds policies so each account can only ever
   see its own data.
4. Go to **Project Settings → API**. Copy:
   - **Project URL**
   - **anon / public** key (⚠️ never copy the `service_role` key anywhere
     in this app — that one must stay secret)
5. Open `js/config.js` in this project and paste both values in:

   ```js
   export const SUPABASE_URL = 'https://xxxxxxxx.supabase.co';
   export const SUPABASE_ANON_KEY = 'eyJhbGciOi...';
   ```

6. (Recommended) In Supabase → **Authentication → Providers → Email**,
   you can turn **off** "Confirm email" while testing, so sign-up logs you
   in immediately. Turn it back on later if you want email verification.

The anon key is safe to leave in this public file — Row Level Security
(step 3) is what actually keeps your data private, not secrecy of that key.

---

## 3. Deploy to GitHub Pages (5 minutes, no terminal)

1. Create a free GitHub account at **github.com** if you don't have one.
2. Click **New repository** → name it e.g. `ignou-study-tracker` → **Public**
   → Create repository.
3. On the new repo page, click **Add file → Upload files**, then drag in
   *every file and folder* from this project (`index.html`, `css/`, `js/`,
   `manifest.json`, `sw.js`, `supabase/` — the `supabase/schema.sql` file is
   just for reference, it's fine to upload it too). Commit.
4. Go to the repo's **Settings → Pages**. Under "Build and deployment",
   set **Source: Deploy from a branch**, **Branch: main**, folder **/ (root)**
   → **Save**.
5. Wait ~1 minute, refresh that page — GitHub shows your live URL, something
   like `https://yourusername.github.io/ignou-study-tracker/`.
6. Open that URL. You should see the sign-in screen.

That's it — **open URL → sign up → use app**, on every device, forever, for
₹0.

---

## 4. First run

1. **Create account** with your email + a password.
2. If email confirmation is on, check your inbox and confirm, then sign in.
3. The setup wizard walks you through: your name → confirming the fixed
   20-exam schedule → your study windows → generating your plan (this seeds
   your 20 subjects — units start empty, see below).
4. You land on the Dashboard.

---

## 5. Adding your syllabus content (important — read this)

Per the "don't fabricate" requirement, this app does **not** pre-fill unit
names, PDFs, or YouTube links for you — inventing those would risk giving
you wrong information to study from. Instead:

- **Units:** open a subject → **Add unit** → enter the unit number and
  title exactly as it appears in your official Self Learning Material (SLM)
  or programme guide. Until you do, a unit shows "Needs verification".
- **Resources / PYQs:** the two genuinely official sources are:
  - `https://www.ignou.ac.in/` — official university site (programme
    guides, notices, previous-year question papers are sometimes linked
    from here or your Student Zone login)
  - `https://egyankosh.ac.in/` — IGNOU's own **official** digital
    repository of SLMs; search it by course code (e.g. `BPCS187`)
  - Anything else (YouTube channels, coaching sites, forums) — add it via
    **Resources → Add resource** and mark its **Source** as "Third-party"
    so you always know what's official vs. not.
- Only add a link once you've actually opened it and confirmed it works —
  the app will never invent or guess a URL for you.

---

## 6. Test multi-device sync

1. **Device 1:** Planner → add task "BPCS187 Unit 1" → check it complete.
2. **Device 2:** open the same URL, sign in with the same account.
   Confirm "BPCS187 Unit 1" shows as completed.
3. On Device 2, add a note or start a timer session.
4. Back on Device 1, refresh — confirm it appears.

Every write in this app goes straight to Supabase; the only thing kept in
your browser's local storage is your theme preference (light/dark/system).

---

## 7. Acceptance checklist

- [ ] Sign up / sign in / sign out all work
- [ ] Data written on one device appears on another after a refresh
- [ ] Two different accounts cannot see each other's data (RLS)
- [ ] All 20 exams show with correct dates/times; 3 Dec and 28 Dec are
      flagged as double-exam days on the Dashboard, Planner, and Calendar
- [ ] Completing a task carried from a previous day, or missing a task,
      correctly carries it forward to today (Planner)
- [ ] Completing a unit auto-creates a day 1/3/7/14 revision schedule
- [ ] Export downloads a JSON backup; Import adds it back in
- [ ] The app is usable one-handed on a phone (bottom nav, large targets)
- [ ] No paid service, terminal, or local server is required to use it day
      to day

---

## 8. Updating the app later

Whenever you want to change something: edit the file on GitHub directly
(pencil icon on any file → edit → commit), or re-upload changed files via
**Add file → Upload files**. GitHub Pages redeploys automatically in
under a minute. No build step, no terminal.

## 9. Costs

GitHub Pages: free, forever, for public repos.
Supabase free tier: free database + auth, generous enough for one person's
personal tracker (500 MB database, 50k monthly active users). If you ever
outgrow it, that's a "nice problem" months away — nothing here requires you
to pay anything to get started or to run this through January 2027.

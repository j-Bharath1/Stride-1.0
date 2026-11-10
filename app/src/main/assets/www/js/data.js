/* STRIDE content: run plans, guided runs, exercises, workouts, challenges, badges. */
'use strict';

// ============================================================ exercises & workouts
// items: [exerciseId, seconds] or [exerciseId, 'reps']
const Workouts = {
  all() { return WORKOUTS.concat(DB.get('custom') || []); },
  get(id) { return Workouts.all().find(w => w.id === id); },
  steps(w) { // flatten rounds into [{ex, sec|reps, round}]
    const out = [];
    for (let r = 1; r <= (w.rounds || 1); r++) w.items.forEach(([ex, v]) => out.push({ ex, sec: typeof v === 'number' ? v : 0, reps: typeof v === 'string' ? +v : 0, round: r }));
    return out;
  },
  minutes(w) { const st = Workouts.steps(w); return Math.max(1, Math.round((sum(st, s => s.sec || s.reps * 3) + (st.length - 1) * (w.rest || 0)) / 60)); },
};

// ============================================================ challenges
// Evil Russian push-up program (formula from The Modern Rogue; calculator by Logan Schmidt, MIT).
const EVIL = [
  // week 1 (based on first max)
  { pct: 1, test: true, setPct: .30, every: 60 }, { pct: .50, every: 60 }, { pct: .60, every: 45 }, { pct: .25, every: 60 },
  { pct: .45, every: 30 }, { pct: .40, every: 60 }, { pct: .20, every: 90 },
  // week 2 (based on the re-test)
  { pct: 1, test: true, setPct: .35, every: 45, w2: true }, { pct: .55, every: 20, w2: true }, { pct: .30, every: 15, w2: true },
  { pct: .65, every: 60, w2: true }, { pct: .35, every: 45, w2: true }, { pct: .45, every: 60, w2: true }, { pct: .25, every: 120, w2: true },
  // day 15: final test
  { pct: 1, test: true, final: true, w2: true },
];

const CHALLENGE_PRESETS = [
  { kind: 'evil', name: 'Evil Russian', e: '🐻', days: 15, desc: '14 days of push-up sets all day long, sized from your max. Ends with a re-test.' },
  { kind: 'count', name: '100 Push-ups a Day', e: '💪', ex: 'pushup', target: 100, days: 30, desc: 'Count down 100 push-ups every day for 30 days, in as many sets as you like.' },
  { kind: 'count', name: '50 Squats a Day', e: '🦵', ex: 'squat', target: 50, days: 30, desc: '50 squats daily for a month.' },
  { kind: 'count', name: '1,000 Push-ups Week', e: '🔥', ex: 'pushup', target: 143, days: 7, desc: 'Hit 1,000 push-ups in 7 days: 143 a day.' },
  { kind: 'count', name: 'Custom challenge', e: '✨', ex: 'pushup', target: 50, days: 21, desc: 'Pick the exercise, daily target and length.', custom: true },
];

const Ch = {
  all() { return DB.get('challenges'); },
  active() { return Ch.all().filter(c => !c.ended && D.diff(D.today(), c.start) < c.days); },
  get(id) { return Ch.all().find(c => c.id === id); },
  save() { DB.save('challenges'); App.emit('data'); },
  dayIndex(c, date = D.today()) { return D.diff(date, c.start); },
  repsOn(c, date) { return ((c.log || {})[date] || []).reduce((a, s) => a + s.reps, 0); },
  // For Evil Russian: today's plan {reps per set, every, test...}
  evilDay(c, i) {
    const d = EVIL[i]; if (!d) return null;
    const base = d.w2 && c.max2 ? c.max2 : c.max;
    const reps = d.test ? (d.setPct ? Math.max(1, Math.round(base * d.setPct)) : 0) : Math.max(1, Math.round(base * d.pct));
    return Object.assign({ base, reps, retestDue: d.w2 && !c.max2 }, d);
  },
  target(c, date) {
    if (c.kind === 'evil') {
      const d = Ch.evilDay(c, Ch.dayIndex(c, date)); if (!d) return 0;
      if (d.final) return 0;
      // sets from 7am to 10pm (or the alert window)
      const win = Math.max(1, ((c.to || 22) - (c.from || 7)) * 60);
      return d.reps * (Math.floor(win / d.every) + 1);
    }
    return c.target;
  },
  addSet(c, reps, date = D.today()) {
    c.log = c.log || {};
    (c.log[date] = c.log[date] || []).push({ ts: Date.now(), reps });
    Ch.save();
    // mirror into the diary log as one entry per day per challenge
    const exId = c.ex || 'pushup';
    const type = exId === 'squat' ? 'home' : 'pushups';
    const total = Ch.repsOn(c, date);
    const existing = Log.all().find(e => e.src === 'challenge' && e.refId === c.id && e.date === date);
    if (existing) Log.update(existing.id, { reps: total });
    else Log.add({ date, type, title: c.name, reps: total, src: 'challenge', refId: c.id });
  },
  undoSet(c, date = D.today()) {
    const sets = (c.log || {})[date]; if (!sets || !sets.length) return;
    sets.pop(); Ch.save();
    const total = Ch.repsOn(c, date);
    const existing = Log.all().find(e => e.src === 'challenge' && e.refId === c.id && e.date === date);
    if (existing) { if (total) Log.update(existing.id, { reps: total }); else Log.remove(existing.id); }
  },
  streak(c) {
    let n = 0, d = D.today();
    if (Ch.repsOn(c, d) < Ch.target(c, d)) d = D.add(d, -1);
    while (D.diff(d, c.start) >= 0 && Ch.target(c, d) && Ch.repsOn(c, d) >= Ch.target(c, d)) { n++; d = D.add(d, -1); }
    return n;
  },
  completed(c) {
    if (c.kind === 'evil') return D.diff(D.today(), c.start) >= c.days - 1 && !!c.finalMax;
    let ok = true;
    for (let i = 0; i < c.days; i++) { const d = D.add(c.start, i); if (Ch.repsOn(c, d) < c.target) { ok = false; break; } }
    return ok;
  },
};

// ============================================================ club: badges & records
const BADGES = [
  { id: 'first', e: '👟', n: 'First Run', d: 'Log your first run', test: s => s.runs >= 1 },
  { id: '5k', e: '5K', n: '5K', d: 'Run 5 km in one go', test: s => s.longest >= 5000 },
  { id: '10k', e: '10K', n: '10K', d: 'Run 10 km in one go', test: s => s.longest >= 10000 },
  { id: 'half', e: '21K', n: 'Half Marathon', d: 'Run 21.1 km', test: s => s.longest >= 21097 },
  { id: 'full', e: '42K', n: 'Marathon', d: 'Run 42.2 km', test: s => s.longest >= 42195 },
  { id: 'k100', e: '💯', n: '100 km Club', d: '100 km total', test: s => s.totalKm >= 100 },
  { id: 'k500', e: '🌍', n: '500 km Club', d: '500 km total', test: s => s.totalKm >= 500 },
  { id: 'k1000', e: '🚀', n: '1,000 km Club', d: '1,000 km total', test: s => s.totalKm >= 1000 },
  { id: 's7', e: '🔥', n: 'On Fire', d: '7-day activity streak', test: s => s.bestStreak >= 7 },
  { id: 's30', e: '⚡', n: 'Unstoppable', d: '30-day streak', test: s => s.bestStreak >= 30 },
  { id: 'w10', e: '🏋️', n: 'Getting Strong', d: '10 workouts', test: s => s.workouts >= 10 },
  { id: 'w50', e: '🦾', n: 'Machine', d: '50 workouts', test: s => s.workouts >= 50 },
  { id: 'p1k', e: '💪', n: '1K Push-ups', d: '1,000 push-ups total', test: s => s.pushups >= 1000 },
  { id: 'p10k', e: '🐻', n: '10K Push-ups', d: '10,000 push-ups total', test: s => s.pushups >= 10000 },
  { id: 'early', e: '🌅', n: 'Early Bird', d: 'Run before 7 am', test: s => s.early },
  { id: 'night', e: '🌙', n: 'Night Owl', d: 'Run after 9 pm', test: s => s.night },
  { id: 'chal', e: '🏅', n: 'Challenger', d: 'Complete a challenge', test: s => s.challengesDone >= 1 },
  { id: 'month', e: '📅', n: 'Goal Getter', d: 'Hit a monthly goal', test: s => s.monthGoal },
];

const Club = {
  stats() {
    const ents = Log.all();
    const runEnts = ents.filter(e => e.type === 'run');
    return {
      runs: runEnts.length,
      longest: Math.max(0, ...runEnts.map(e => e.distM || 0)),
      totalKm: sum(ents.filter(e => ['run', 'walk', 'hike'].includes(e.type)), e => e.distM) / 1000,
      workouts: ents.filter(e => e.src === 'workout' || e.src === 'gym' || e.type === 'home' || e.type === 'gym' || e.type === 'yoga').length,
      pushups: sum(ents.filter(e => e.type === 'pushups'), e => e.reps),
      early: runEnts.some(e => new Date(e.ts || 0).getHours() < 7),
      night: runEnts.some(e => new Date(e.ts || 0).getHours() >= 21),
      challengesDone: Ch.all().filter(Ch.completed).length,
      bestStreak: Club.bestStreak(),
      monthGoal: Club.anyMonthGoal(),
    };
  },

  bestStreak() {
    const days = Array.from(new Set(Log.all().filter(Log.isActive).map(e => e.date))).sort();
    let best = 0, cur = 0, prev = null;
    for (const d of days) { cur = prev && D.diff(d, prev) === 1 ? cur + 1 : 1; best = Math.max(best, cur); prev = d; }
    return best;
  },
  month(ym) {
    const from = ym + '-01', to = ym + '-' + String(D.daysInMonth(ym)).padStart(2, '0');
    const e = Log.range(from, to);
    return {
      km: sum(e.filter(x => x.type === 'run'), x => x.distM) / 1000,
      workouts: e.filter(x => Log.isActive(x) && x.type !== 'run' && x.type !== 'walk').length,
      pushups: sum(e.filter(x => x.type === 'pushups'), x => x.reps),
    };
  },
  anyMonthGoal() {
    const st = DB.get('settings'); const months = new Set(Log.all().map(e => D.month(e.date)));
    for (const ym of months) { const m = Club.month(ym); if (m.km >= st.monthlyKm || m.workouts >= st.monthlyWorkouts) return true; }
    return false;
  },
  records() {
    const ents = Log.all();
    const far = ents.filter(e => e.distM > 0).sort((a, b) => b.distM - a.distM)[0];
    const longTime = ents.filter(e => e.durSec > 0).sort((a, b) => b.durSec - a.durSec)[0];
    const perDay = {};
    ents.filter(e => e.type === 'pushups').forEach(e => { perDay[e.date] = (perDay[e.date] || 0) + e.reps; });
    const pushDay = Object.entries(perDay).sort((a, b) => b[1] - a[1])[0];
    const week = {};
    ents.forEach(e => { const m = D.monday(e.date); week[m] = (week[m] || 0) + (e.durSec || 0); });
    const bigWeek = Object.entries(week).sort((a, b) => b[1] - a[1])[0];
    return { far, longTime, pushDay, bigWeek };
  },
};

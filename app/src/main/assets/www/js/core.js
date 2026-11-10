/* STRIDE core: native bridge, storage, helpers, navigation. */
'use strict';

// ------------------------------------------------------------ native bridge
// On the phone `window.Android` is provided by MainActivity. In a desktop browser a
// mock stands in so the UI can be developed and tested.
const N = (function () {
  if (window.Android) return window.Android;
  const ls = (() => { try { return window.localStorage; } catch (e) { return null; } })();
  const mem = {};
  let prox = false;
  const mock = {
    _mock: true, _spoken: [],
    load: k => (ls ? ls.getItem('stride_' + k) : mem[k]) || '',
    save: (k, v) => { if (ls) ls.setItem('stride_' + k, v); else mem[k] = v; return true; },
    speak: t => { mock._spoken.push(t); console.log('[voice]', t); },
    speakNow: t => mock.speak(t), stopSpeaking() {}, setVoice() {},
    vibrate() {}, keepAwake() {}, toast: t => console.log('[toast]', t),
    media(c) { console.log('[media]', c); }, musicActive: () => false, openMusic() { mock.toast('Open music app'); },
    reminderSet(i, f, t, title) { mock._rem = { on: true, interval: i, from: f, to: t, next: Date.now() + i * 60000, title }; },
    reminderClear() { mock._rem = { on: false }; },
    reminderState: () => JSON.stringify(mock._rem || { on: false }),
    hasProximity: () => true, proximity(on) { prox = on; },
    exportData(json, name) { mock._export = json; mock.toast('Exported ' + name); },
    importData() {}, share(t) { console.log('[share]', t); },
    // workout engine stand-in (mirrors WorkoutService.java)
    _w: null,
    workoutStart(json) {
      const p = JSON.parse(json), now = Date.now();
      const w = mock._w = { title: p.title, steps: p.steps || [], rest: p.rest || 0, restMode: !!p.restMode, status: 'running', phase: p.restMode ? 'rest' : 'ready', idx: p.restMode ? 0 : -1,
        endAt: now + (p.restMode ? p.steps[0].sec : (p.ready != null ? p.ready : 5)) * 1000, bank: 0, seg: now, left: 0 };
      clearInterval(mock._wt);
      const startWork = () => { const s = w.steps[w.idx]; if (!s) return done(); w.phase = 'work'; w.endAt = s.sec > 0 ? Date.now() + s.sec * 1000 : 0; mock.speak(s.name); };
      const done = () => { if (w.status === 'running') w.bank += Date.now() - w.seg; w.status = 'done'; w.phase = 'done'; w.endAt = 0; };
      w.advance = skip => {
        if (w.phase === 'ready') { w.idx = 0; return startWork(); }
        if (w.phase === 'work') { if (w.idx + 1 >= w.steps.length) return done(); if (w.rest > 0 && !skip) { w.phase = 'rest'; w.endAt = Date.now() + w.rest * 1000; return; } w.idx++; return startWork(); }
        if (w.phase === 'rest') { if (w.restMode) return done(); w.idx++; startWork(); }
      };
      w.startWork = startWork;
      mock._wt = setInterval(() => { if (w.status === 'running' && w.endAt && Date.now() >= w.endAt) w.advance(false); }, 200);
    },
    workoutCmd(c) {
      const w = mock._w; if (!w) return; const now = Date.now();
      if (c === 'toggle') c = w.status === 'running' ? 'pause' : 'resume';
      if (c === 'pause' && w.status === 'running') { w.left = w.endAt ? w.endAt - now : -1; w.bank += now - w.seg; w.status = 'paused'; }
      else if (c === 'resume' && w.status === 'paused') { if (w.left >= 0) w.endAt = now + w.left; w.seg = now; w.status = 'running'; }
      else if (c === 'next') w.advance(true); else if (c === 'done') w.advance(false);
      else if (c === 'prev' && w.idx > 0) { w.idx--; w.startWork(); }
      else if (c === 'add15' && w.endAt) w.endAt += 15000; else if (c === 'sub15' && w.endAt) w.endAt = Math.max(now + 1000, w.endAt - 15000);
      else if (c === 'stop') { w.status = 'idle'; }
    },
    workoutState() {
      const w = mock._w; if (!w) return JSON.stringify({ status: 'idle' }); const now = Date.now();
      return JSON.stringify({ status: w.status, phase: w.phase, idx: w.idx, n: w.steps.length, title: w.title,
        leftMs: w.status === 'paused' ? w.left : (w.endAt ? Math.max(0, w.endAt - now) : -1), elapsedMs: w.bank + (w.status === 'running' ? now - w.seg : 0) });
    },
    workoutReset() { mock._w = null; clearInterval(mock._wt); },
    bgStatus: () => JSON.stringify({ notif: true, battery: true, exact: true, maker: 'web' }),
    openNotifSettings() {}, openBatterySettings() {}, openAlarmSettings() {}, openAppSettings() {},
    info: () => JSON.stringify({ native: false, version: 'web', sdk: 0 }),
  };
  return mock;
})();

// ------------------------------------------------------------ helpers
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const sum = (arr, f = x => x) => arr.reduce((a, x) => a + (f(x) || 0), 0);

const D = {
  iso(d = new Date()) { return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); },
  parse(s) { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); },
  today() { return D.iso(); },
  add(s, n) { const d = D.parse(s); d.setDate(d.getDate() + n); return D.iso(d); },
  diff(a, b) { return Math.round((D.parse(a) - D.parse(b)) / 864e5); },   // a - b in days
  dow(s) { return (D.parse(s).getDay() + 6) % 7; },                     // Monday = 0
  monday(s) { return D.add(s, -D.dow(s)); },
  month(s) { return s.slice(0, 7); },
  monthStart(ym) { return ym + '-01'; },
  daysInMonth(ym) { const [y, m] = ym.split('-').map(Number); return new Date(y, m, 0).getDate(); },
  addMonth(ym, n) { const [y, m] = ym.split('-').map(Number); const d = new Date(y, m - 1 + n, 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); },
  MONTHS: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  DAYS: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  DAYS_LONG: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
  monthName(ym) { return D.MONTHS[+ym.slice(5, 7) - 1]; },
  nice(s) { const d = D.parse(s); return D.DAYS[D.dow(s)] + ', ' + d.getDate() + ' ' + D.MONTHS[d.getMonth()].slice(0, 3); },
  long(s) { const d = D.parse(s); return D.DAYS_LONG[D.dow(s)] + ', ' + d.getDate() + ' ' + D.MONTHS[d.getMonth()] + ' ' + d.getFullYear(); },
  rel(s) { const n = D.diff(D.today(), s); return n === 0 ? 'Today' : n === 1 ? 'Yesterday' : n < 7 && n > 0 ? D.DAYS_LONG[D.dow(s)] : D.nice(s); },
  time(ts) { const d = new Date(ts); return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }); },
};

const F = {
  km(m, dp = 2) { return (m / 1000).toFixed(dp); },
  clock(sec) {
    sec = Math.max(0, Math.round(sec));
    const h = Math.floor(sec / 3600), m = Math.floor(sec % 3600 / 60), s = sec % 60;
    return h ? h + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0') : String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
  },
  pace(secPerKm) { if (!secPerKm || !isFinite(secPerKm) || secPerKm > 3600) return "-'--\""; secPerKm = Math.round(secPerKm); return Math.floor(secPerKm / 60) + "'" + String(secPerKm % 60).padStart(2, '0') + '"'; },
  dur(sec) { sec = Math.round(sec); const h = Math.floor(sec / 3600), m = Math.round(sec % 3600 / 60); return h ? h + 'h ' + m + 'm' : m + ' min'; },
  durWords(sec) { const m = Math.round(sec / 60); return m >= 60 ? Math.floor(m / 60) + ' hour' + (m >= 120 ? 's' : '') + (m % 60 ? ' ' + m % 60 + ' minutes' : '') : m + ' minute' + (m === 1 ? '' : 's'); },
  int(n) { return Math.round(n).toLocaleString(); },
};

// ------------------------------------------------------------ storage
// Each key is a JSON file on the phone. Everything is loaded at start and kept in memory.
const DB = {
  KEYS: ['settings', 'entries', 'diary', 'goals', 'runs', 'plan', 'challenges', 'custom', 'gym', 'program', 'routines'],
  DEFAULTS: {
    settings: { name: '', weightKg: 70, voice: true, announceM: 1000, sayPace: true, sayTime: true, countdown: 3,
      monthlyKm: 50, monthlyWorkouts: 12, monthlyPushups: 1500, restSec: 15, onboarded: false },
    entries: [], diary: {}, goals: {}, runs: [], plan: null, challenges: [], custom: [], gym: [], program: null, routines: [],
  },
  data: {},
  init() {
    for (const k of DB.KEYS) {
      let v = null;
      try { const raw = N.load(k); if (raw) v = JSON.parse(raw); } catch (e) { v = null; }
      const def = JSON.parse(JSON.stringify(DB.DEFAULTS[k]));
      DB.data[k] = v == null ? def : (def && typeof def === 'object' && !Array.isArray(def) && v && !Array.isArray(v) ? Object.assign(def, v) : v);
    }
  },
  get(k) { return DB.data[k]; },
  set(k, v) { DB.data[k] = v; DB.save(k); },
  save(k) { N.save(k, JSON.stringify(DB.data[k])); },
  exportAll() { const o = { app: 'stride', version: 1, exportedAt: new Date().toISOString() }; for (const k of DB.KEYS) o[k] = DB.data[k]; return JSON.stringify(o); },
  importAll(json) {
    // Validate the entire backup before changing anything. A malformed or partial file
    // must never leave the user's current data half-restored.
    const o = JSON.parse(json);
    if (!o || typeof o !== 'object' || Array.isArray(o) || o.app !== 'stride') throw new Error('Not a STRIDE backup');
    if (o.version != null && (!Number.isFinite(+o.version) || +o.version < 1 || +o.version > 20)) throw new Error('Unsupported backup version');
    const next = {};
    for (const k of DB.KEYS) {
      if (!(k in o)) continue; // older backups may legitimately omit newer keys
      const v = o[k], def = DB.DEFAULTS[k];
      const expectsArray = Array.isArray(def);
      if (expectsArray && !Array.isArray(v)) throw new Error('Invalid backup data: ' + k);
      if (!expectsArray && def && typeof def === 'object' && !Array.isArray(def) && (!v || typeof v !== 'object' || Array.isArray(v))) throw new Error('Invalid backup data: ' + k);
      if (k === 'diary' && (!v || typeof v !== 'object' || Array.isArray(v))) throw new Error('Invalid diary data');
      next[k] = v;
    }
    // Merge settings with defaults so a backup from an older app remains usable.
    if (next.settings) next.settings = Object.assign({}, DB.DEFAULTS.settings, next.settings);
    for (const k of DB.KEYS) if (k in next) DB.data[k] = next[k];
    for (const k of DB.KEYS) if (k in next) DB.save(k);
  },
};

// ------------------------------------------------------------ log entries
const TYPES = [
  { id: 'run', e: '🏃', name: 'Run', unit: 'dist' },
  { id: 'walk', e: '🚶', name: 'Walk', unit: 'dist' },
  { id: 'home', e: '🏠', name: 'Home workout', unit: 'time' },
  { id: 'gym', e: '🏋️', name: 'Gym', unit: 'time' },
  { id: 'pushups', e: '💪', name: 'Push-ups', unit: 'reps' },
  { id: 'cycle', e: '🚴', name: 'Cycle', unit: 'dist' },
  { id: 'yoga', e: '🧘', name: 'Yoga / Stretch', unit: 'time' },
  { id: 'swim', e: '🏊', name: 'Swim', unit: 'dist' },
  { id: 'sport', e: '⚽', name: 'Sport', unit: 'time' },
  { id: 'hike', e: '🥾', name: 'Hike', unit: 'dist' },
  { id: 'rest', e: '😴', name: 'Rest day', unit: 'none' },
  { id: 'sick', e: '🤒', name: 'Sick / sore', unit: 'none' },
];
const TYPE = Object.fromEntries(TYPES.map(t => [t.id, t]));
const MOODS = [{ id: 'fire', e: '🔥', name: 'On fire' }, { id: 'good', e: '🙂', name: 'Good' }, { id: 'meh', e: '😐', name: 'Meh' }, { id: 'tough', e: '😩', name: 'Tough' }];
const EFFORT = ['Very easy', 'Easy', 'Moderate', 'Hard', 'All out'];

const Log = {
  all() { return DB.get('entries'); },
  forDay(date) { return Log.all().filter(e => e.date === date).sort((a, b) => (a.ts || 0) - (b.ts || 0)); },
  range(from, to) { return Log.all().filter(e => e.date >= from && e.date <= to); },
  add(e) {
    const entry = Object.assign({ id: uid(), date: D.today(), ts: Date.now(), type: 'home', durSec: 0, distM: 0, reps: 0, note: '', src: 'manual' }, e);
    Log.all().push(entry); DB.save('entries'); App.emit('data');
    return entry;
  },
  update(id, patch) { const e = Log.all().find(x => x.id === id); if (e) { Object.assign(e, patch); DB.save('entries'); App.emit('data'); } return e; },
  remove(id) { DB.set('entries', Log.all().filter(e => e.id !== id)); App.emit('data'); },
  isActive(e) { return e.type !== 'rest' && e.type !== 'sick'; },
  emojis(date) {
    const seen = []; for (const e of Log.forDay(date)) { const em = (TYPE[e.type] || TYPE.home).e; if (!seen.includes(em)) seen.push(em); }
    const mood = Diary.get(date).mood; if (mood) { const m = MOODS.find(x => x.id === mood); if (m) seen.push(m.e); }
    return seen;
  },
  streak() {
    const days = new Set(Log.all().filter(Log.isActive).map(e => e.date));
    let d = D.today(), n = 0;
    if (!days.has(d)) d = D.add(d, -1);
    while (days.has(d)) { n++; d = D.add(d, -1); }
    return n;
  },
  label(e) { return e.title || (TYPE[e.type] || TYPE.home).name; },
  detail(e) {
    const p = [];
    if (e.distM) p.push(F.km(e.distM) + ' km');
    if (e.durSec) p.push(F.dur(e.durSec));
    if (e.distM && e.durSec && (e.type === 'run' || e.type === 'walk')) p.push(F.pace(e.durSec / (e.distM / 1000)) + '/km');
    if (e.reps) p.push(e.reps + ' reps');
    return p.join(' · ');
  },
};

const Diary = {
  get(date) { return DB.get('diary')[date] || {}; },
  set(date, patch, silent) {
    const d = DB.get('diary'); const cur = Object.assign({}, d[date], patch);
    for (const k of Object.keys(cur)) if (cur[k] === '' || cur[k] == null) delete cur[k];
    if (Object.keys(cur).length) d[date] = cur; else delete d[date];
    DB.save('diary'); if (!silent) App.emit('data');
  },
};

// ------------------------------------------------------------ app shell
const App = {
  tab: 'home', screens: {}, stack: [], listeners: {}, sheetOnClose: null,

  register(name, screen) { App.screens[name] = screen; },
  on(evt, fn) { (App.listeners[evt] = App.listeners[evt] || []).push(fn); },
  emit(evt, data) { (App.listeners[evt] || []).forEach(fn => { try { fn(data); } catch (e) { console.error(e); } }); },

  boot() {
    DB.init();
    N.setVoice(!!DB.get('settings').voice);
    $$('#tabs button').forEach(b => b.addEventListener('click', () => App.go(b.dataset.tab)));
    $('#sheet-bg').addEventListener('click', () => App.closeSheet());
    App.on('data', () => { if (!App.stack.length) App.render(); });
    App.go('home');
    App.emit('boot');
  },

  go(tab) {
    App.tab = tab;
    $$('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
    App.render(true);
  },

  render(scrollTop) {
    const s = App.screens[App.tab];
    const view = $('#view');
    const y = view.scrollTop;
    view.innerHTML = '';
    if (s) s.render(view);
    view.scrollTop = scrollTop ? 0 : y;
  },

  // Full-screen page above the tabs. render(el) fills it; returns the element.
  push(title, render, opts = {}) {
    const el = document.createElement('div');
    el.className = 'ov' + (opts.fade ? ' fade' : '');
    const draw = () => {
      const y = el.scrollTop;
      el.innerHTML = opts.bare ? '' : `<div class="ov-bar"><button class="icon-btn plain" data-back><svg viewBox="0 0 24 24"><path d="M15.4 7.4 14 6l-6 6 6 6 1.4-1.4L10.8 12z"/></svg></button><div class="t">${esc(title)}</div><div class="ov-actions row"></div></div>`;
      const body = document.createElement('div');
      el.appendChild(body);
      render(body, el);
      const back = el.querySelector('[data-back]'); if (back) back.onclick = () => App.pop();
      el.scrollTop = y;
    };
    el._redraw = draw; el._onPop = opts.onPop;
    draw();
    $('#overlay').appendChild(el);
    App.stack.push(el);
    return el;
  },
  pop() {
    const el = App.stack.pop(); if (!el) return false;
    if (el._onPop) el._onPop();
    el.remove();
    const top = App.stack[App.stack.length - 1];
    if (top && top._redraw) top._redraw(); else App.render();
    return true;
  },
  popAll() { while (App.stack.length) App.pop(); },
  redrawTop() { const t = App.stack[App.stack.length - 1]; if (t && t._redraw) t._redraw(); else App.render(); },

  sheet(render, onClose) {
    const s = $('#sheet'); s.innerHTML = ''; render(s);
    App.sheetOnClose = onClose || null;
    $('#sheet-wrap').classList.add('open'); s.scrollTop = 0;
  },
  closeSheet() {
    if (!$('#sheet-wrap').classList.contains('open')) return false;
    $('#sheet-wrap').classList.remove('open');
    const cb = App.sheetOnClose; App.sheetOnClose = null; if (cb) cb();
    return true;
  },

  // Topmost modal layer (live run, workout player, writer) can claim the back button.
  modal: null,
  back() {
    if (App.modal && App.modal.back) return App.modal.back() !== false;
    if (App.closeSheet()) return true;
    if (App.pop()) return true;
    if (App.tab !== 'home') { App.go('home'); return true; }
    // On Home, one Back press warns and the next one leaves, so the app is never
    // closed by an accidental tap but Back still behaves the way Android users expect.
    if (App._exitAt && Date.now() - App._exitAt < 2500) { App._exitAt = 0; return false; }
    App._exitAt = Date.now();
    App.toast('Press back again to exit');
    return true;
  },

  toast(t) {
    const el = $('#toast'); el.textContent = t; el.classList.add('on');
    clearTimeout(App._tt); App._tt = setTimeout(() => el.classList.remove('on'), 2200);
  },

  confirm(title, text, okLabel, onOk, danger) {
    App.sheet(s => {
      s.innerHTML = `<div class="h2">${esc(title)}</div><p class="muted">${esc(text)}</p>
        <div class="row mt16"><button class="btn ghost grow" data-x>Cancel</button><button class="btn ${danger ? 'danger' : 'volt'} grow" data-ok>${esc(okLabel)}</button></div>`;
      s.querySelector('[data-x]').onclick = () => App.closeSheet();
      s.querySelector('[data-ok]').onclick = () => { App.closeSheet(); onOk(); };
    });
  },
};

// Long-press helper: fn on hold, tap on short press.
function onPress(el, tap, hold, ms = 450) {
  let t = null, held = false, sx = 0, sy = 0;
  el.addEventListener('pointerdown', e => {
    held = false; sx = e.clientX; sy = e.clientY;
    t = setTimeout(() => { held = true; t = null; if (hold) { N.vibrate(25); hold(e); } }, ms);
  });
  el.addEventListener('pointermove', e => { if (t && (Math.abs(e.clientX - sx) > 10 || Math.abs(e.clientY - sy) > 10)) { clearTimeout(t); t = null; held = true; } });
  const end = () => { if (t) { clearTimeout(t); t = null; } };
  el.addEventListener('pointerup', end); el.addEventListener('pointercancel', () => { end(); held = true; });
  el.addEventListener('click', e => { if (held) { e.preventDefault(); return; } if (tap) tap(e); });
  el.addEventListener('contextmenu', e => e.preventDefault());
}

// Events from Java: onNative(name, data)
window.onNative = function (name, data) { App.emit('native:' + name, data); };
App.on('native:route', r => { if (r === 'challenge') { App.popAll(); App.go('train'); setTimeout(() => App.emit('open-active-challenge'), 50); } });
App.on('native:import', txt => {
  try { DB.importAll(txt); App.toast('Backup restored'); App.popAll(); App.go('home'); }
  catch (e) { App.toast('That file isn\'t a STRIDE backup'); }
});

// Simple beep for countdowns (Web Audio works offline).
const Beep = {
  ctx: null,
  play(freq = 880, ms = 140, vol = 0.25) {
    try {
      this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
      const o = this.ctx.createOscillator(), g = this.ctx.createGain();
      o.frequency.value = freq; o.type = 'sine'; g.gain.value = vol;
      o.connect(g); g.connect(this.ctx.destination); o.start();
      g.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + ms / 1000);
      o.stop(this.ctx.currentTime + ms / 1000 + 0.02);
    } catch (e) { /* no audio */ }
  },
};

const ICON = {
  play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6zm8-14v14h4V5z"/></svg>',
  stop: '<svg viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg>',
  next: '<svg viewBox="0 0 24 24"><path d="m6 18 8.5-6L6 6zM16 6v12h2V6z"/></svg>',
  prev: '<svg viewBox="0 0 24 24"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>',
  music: '<svg viewBox="0 0 24 24"><path d="M12 3v10.6A4 4 0 1 0 14 17V7h4V3z"/></svg>',
  plus: '<svg viewBox="0 0 24 24"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6z"/></svg>',
  close: '<svg viewBox="0 0 24 24"><path d="M19 6.4 17.6 5 12 10.6 6.4 5 5 6.4 10.6 12 5 17.6 6.4 19 12 13.4 17.6 19 19 17.6 13.4 12z"/></svg>',
  user: '<svg viewBox="0 0 24 24"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm0 2c-2.7 0-8 1.3-8 4v2h16v-2c0-2.7-5.3-4-8-4Z"/></svg>',
  left: '<svg viewBox="0 0 24 24"><path d="M15.4 7.4 14 6l-6 6 6 6 1.4-1.4L10.8 12z"/></svg>',
  right: '<svg viewBox="0 0 24 24"><path d="M10 6 8.6 7.4 13.2 12l-4.6 4.6L10 18l6-6z"/></svg>',
  pen: '<svg viewBox="0 0 24 24"><path d="M3 17.2V21h3.8L17.8 9.9l-3.7-3.7zM20.7 7a1 1 0 0 0 0-1.4l-2.3-2.3a1 1 0 0 0-1.4 0l-1.8 1.8 3.7 3.7z"/></svg>',
  trash: '<svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8a2 2 0 0 0 2-2V7H6zM19 4h-3.5l-1-1h-5l-1 1H5v2h14z"/></svg>',
  gear: '<svg viewBox="0 0 24 24"><path d="M19.1 12.9a7 7 0 0 0 0-1.8l2-1.5-2-3.4-2.3.9a7 7 0 0 0-1.6-.9L15 3.8h-4l-.4 2.4a7 7 0 0 0-1.5.9l-2.3-.9-2 3.4 2 1.5a7 7 0 0 0 0 1.8l-2 1.5 2 3.4 2.3-.9c.5.4 1 .7 1.6.9l.3 2.4h4l.4-2.4c.6-.2 1.1-.5 1.5-.9l2.3.9 2-3.4zM13 15.5a3.5 3.5 0 1 1 0-7 3.5 3.5 0 0 1 0 7z"/></svg>',
  map: '<svg viewBox="0 0 24 24"><path d="m15 5.1-6-2.1-6 2.3v15.6l6-2.3 6 2.1 6-2.3V2.8zM15 18.8l-6-2.1V5.2l6 2.1z"/></svg>',
  stats: '<svg viewBox="0 0 24 24"><path d="M5 9.2h3V19H5zM10.6 5h2.8v14h-2.8zm5.6 8H19v6h-2.8z"/></svg>',
  share: '<svg viewBox="0 0 24 24"><path d="M18 16a3 3 0 0 0-2 .8l-7-4.1a3 3 0 0 0 0-1.4l7-4.1A3 3 0 1 0 15 5l-7 4.2a3 3 0 1 0 0 4.4l7 4.1a3 3 0 1 0 3-1.7z"/></svg>',
};

/* Home: app icons, this week, what's next, quick log. */
'use strict';

const APP_ICONS = {
  train: { label: 'Training', bg: '#d4ff3a', svg: '<svg viewBox="0 0 40 40"><circle cx="20" cy="7" r="3.8" fill="#111"/><path d="M7 13.2h26v3.6h-8.6V35h-3.6v-9h-1.6v9h-3.6V16.8H7z" fill="#111"/></svg>' },
  gym: { label: 'Gym', bg: '#2f6fe0', svg: '<svg viewBox="0 0 40 40"><path d="M10 11h4v18h-4zm16 0h4v18h-4zM5 15h4v10H5zm26 0h4v10h-4zM14 18.4h12v3.2H14z" fill="#fff"/></svg>' },
  evil: { label: 'Evil Russian', bg: '#d52b1e', svg: '<svg viewBox="0 0 40 40"><circle cx="11" cy="11" r="5" fill="#fff"/><circle cx="29" cy="11" r="5" fill="#fff"/><circle cx="20" cy="21" r="13" fill="#fff"/><ellipse cx="20" cy="26" rx="6" ry="4.6" fill="#d52b1e"/><circle cx="20" cy="24.2" r="2" fill="#fff"/><circle cx="15" cy="18" r="1.8" fill="#d52b1e"/><circle cx="25" cy="18" r="1.8" fill="#d52b1e"/></svg>' },
  log: { label: 'Log', bg: '#c9dbff', svg: '<svg viewBox="0 0 40 40"><rect x="7" y="9" width="26" height="24" rx="3" fill="#fff" stroke="#1d3c78" stroke-width="2.4"/><path d="M7 15h26" stroke="#1d3c78" stroke-width="2.4"/><path d="M13 6v6M27 6v6" stroke="#1d3c78" stroke-width="2.6" stroke-linecap="round"/><rect x="12" y="19" width="5" height="4" rx="1" fill="#1d3c78"/><rect x="21" y="19" width="5" height="4" rx="1" fill="#e5432d"/><rect x="12" y="25" width="5" height="4" rx="1" fill="#1d3c78"/></svg>' },
  progress: { label: 'Progress', bg: '#f1f1f1', svg: '<svg viewBox="0 0 40 40"><rect x="8" y="20" width="6" height="13" rx="1.5" fill="#111"/><rect x="17" y="12" width="6" height="21" rx="1.5" fill="#111"/><rect x="26" y="6" width="6" height="27" rx="1.5" fill="#d4ff3a" stroke="#111" stroke-width="1.6"/></svg>' },
};

App.register('home', {
  render(v) {
    const st = DB.get('settings'), today = D.today();
    const mon = D.monday(today);
    const weekEnts = Log.range(mon, D.add(mon, 6));
    const wkKm = sum(weekEnts.filter(e => ['run', 'walk', 'hike'].includes(e.type)), e => e.distM) / 1000;
    const wkMin = sum(weekEnts, e => e.durSec) / 60;
    const streak = Log.streak();
    const dayMin = D.DAYS.map((_, i) => { const d = D.add(mon, i); return { d, min: sum(Log.forDay(d), e => e.durSec) / 60, n: Log.forDay(d).filter(Log.isActive).length }; });
    const maxMin = Math.max(30, ...dayMin.map(x => x.min));

    v.innerHTML = `
      <div class="top">
        <div><div class="eyebrow">${esc(D.long(today))}</div>
          <h1 class="h1 mt4">${st.name ? 'Hi, ' + esc(st.name) : 'Home'}</h1></div>
        <button id="h-prof">${Profile.avatarHtml(44)}</button>
      </div>

      <div class="section" style="margin-top:18px"><div class="app-grid" id="h-apps">
        ${Object.entries(APP_ICONS).map(([k, a]) => `<button class="app" data-app="${k}"><span class="ic" style="background:${a.bg}">${a.svg}</span>${a.label}</button>`).join('')}
      </div></div>

      <div id="h-bg"></div>

      <div class="section stride-coach-card" role="button" tabindex="0" id="h-coach" aria-label="Open training">
        <div class="stride-coach-art"><img src="img/stride-coach.webp" alt="" loading="eager"></div>
        <div class="stride-coach-copy"><div class="eyebrow">Your STRIDE coach</div>
          <div class="display mt4" style="font-size:25px;line-height:1.05">Train with purpose.</div>
          <div class="small mt8" style="color:#c0cad7">Guided workouts · Strength · Mobility</div>
          <span class="btn sm volt mt12">Explore workouts →</span></div>
      </div>

      <div class="section">
        <div class="card white">
          <div class="between"><div><div class="eyebrow">This week</div>
            <div class="row mt4" style="align-items:baseline;gap:6px"><span class="big-num num" style="font-size:52px">${wkKm.toFixed(1)}</span><span class="muted small" style="font-weight:600">km</span></div></div>
            <div class="center"><div style="font-size:24px;line-height:1">🔥</div><div class="big-num" style="font-size:26px">${streak}</div><div class="tiny muted" style="font-weight:600">day streak</div></div></div>
          <div class="row small mt8" style="gap:16px"><span><b>${Math.round(wkMin)}</b> <span class="muted">active min</span></span><span><b>${weekEnts.filter(Log.isActive).length}</b> <span class="muted">session${weekEnts.filter(Log.isActive).length === 1 ? '' : 's'}</span></span></div>
          <div class="week-bars mt12" id="h-week">${dayMin.map((x, i) => `<button class="wb ${x.d === today ? 'today' : x.n ? 'on' : ''}" data-d="${x.d}">
            <em>${Log.emojis(x.d)[0] || ''}</em><i style="height:${Math.max(6, x.min / maxMin * 60)}px"></i><span>${D.DAYS[i][0]}</span></button>`).join('')}</div>
        </div>
      </div>

      <div class="section"><div class="section-head"><h2 class="h2">Up next</h2></div><div id="h-today"></div></div>

      <div class="section">
        <div class="section-head"><h2 class="h2">Quick log</h2><span class="muted small">tap to add today</span></div>
        <div class="chips" id="h-quick"></div>
      </div>

      <div class="section"><div class="section-head"><h2 class="h2">${D.monthName(D.month(today))} goals</h2><button class="link" id="h-goals">Edit</button></div><div class="card white" id="h-month"></div></div>

      <div class="section"><div class="section-head"><h2 class="h2">Recent activity</h2><button class="link" id="h-all">See all</button></div><div id="h-recent"></div></div>`;

    $('#h-prof', v).onclick = () => Profile.open();
    Profile.bgCard($('#h-bg', v));
    const coach = $('#h-coach', v);
    coach.onclick = () => App.go('train');
    coach.onkeydown = e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); App.go('train'); } };
    $('#h-goals', v).onclick = () => Profile.open('goals');
    $('#h-all', v).onclick = () => App.go('log');
    $$('#h-apps [data-app]', v).forEach(b => b.onclick = () => {
      const k = b.dataset.app;
      if (k === 'evil') return Train.openEvil();
      App.go(k);
    });
    $$('#h-week [data-d]', v).forEach(b => b.onclick = () => LogUI.openDay(b.dataset.d));

    // ---- up next
    const box = $('#h-today', v);
    const nx = Programs.next();
    if (nx) {
      const w = nx.workout, card = document.createElement('div');
      card.className = 'tile wide mt12'; card.style.cssText = 'width:100%;margin-top:10px';
      card.innerHTML = `<div class="tf">${Train.figThumb(Train.heroEx(w), true)}</div>
        <div class="tb"><div class="eyebrow" style="color:#a8a8a8">${nx.prog.e} ${esc(nx.prog.name)} · week ${nx.w + 1}</div>
        <div class="tt mt8">${esc(w.name)}</div><div class="small muted mt4">${Workouts.minutes(w)} min · workout ${nx.i + 1} of ${nx.prog.plan[nx.w].length}</div>
        <div class="mt12"><span class="btn volt sm">Start</span></div></div>`;
      card.onclick = () => Train.play(w, { progKey: nx.key });
      box.appendChild(card);
    }
    Ch.active().forEach(c => {
      const done = Ch.repsOn(c, today), target = Ch.target(c, today), i = Ch.dayIndex(c);
      const card = document.createElement('button');
      card.className = 'card white tap'; card.style.cssText = 'display:block;width:100%;text-align:left;margin-top:10px';
      let sub;
      if (c.kind === 'evil') {
        const d = Ch.evilDay(c, i);
        sub = !d ? 'Challenge over' : d.final ? 'Final test day: do your max!' : d.test && d.retestDue ? 'Re-test day: do your max, then sets' :
          d.test ? `Max test, then ${d.reps} every ${d.every} min` : `${d.reps} push-ups every ${d.every} min`;
      } else sub = `${Math.max(0, target - done)} ${EX[c.ex] ? EX[c.ex].n.toLowerCase() : 'reps'} to go`;
      card.innerHTML = `<div class="between"><div class="row grow"><div class="emoji-badge">${c.e || '💪'}</div>
        <div class="grow"><div class="eyebrow">Day ${i + 1} of ${c.days}</div><div class="h3 mt4">${esc(c.name)}</div><div class="muted small">${esc(sub)}</div></div></div>
        <div class="ring">${ringSvg(target ? done / target : 0, 56, 6)}<div class="ring-label num" style="font-weight:700;font-size:13px">${done}</div></div></div>`;
      card.onclick = () => Train.openChallenge(c.id);
      box.appendChild(card);
    });
    if (!box.children.length) {
      box.innerHTML = `<div class="hero"><div class="display" style="font-size:30px">What's the move today?</div>
        <div class="muted small mt8">Start a training program or a challenge and your next session shows up here.</div>
        <div class="row mt16 wrap"><button class="btn volt sm" data-t>Browse workouts</button><button class="btn sm outline" data-c>Challenges</button></div></div>`;
      $('[data-t]', box).onclick = () => { Train.seg = 'browse'; App.go('train'); };
      $('[data-c]', box).onclick = () => { Train.seg = 'challenges'; App.go('train'); };
    }

    // ---- quick log
    $('#h-quick', v).innerHTML = TYPES.map(t => `<button class="chip" data-t="${t.id}">${t.e} ${esc(t.name)}</button>`).join('');
    $$('#h-quick .chip', v).forEach(b => b.onclick = () => LogUI.addSheet(today, b.dataset.t));

    // ---- month goals
    const m = Club.month(D.month(today));
    const goal = (e, label, val, target, fmt) => `<div class="mt12"><div class="between small"><span>${e} ${label}</span><span class="num"><b>${fmt(val)}</b> <span class="muted">/ ${fmt(target)}</span></span></div><div class="bar volt mt4" style="box-shadow:inset 0 0 0 1px #e2e2e2"><i style="width:${clamp(val / target * 100, 0, 100)}%;box-shadow:inset 0 0 0 1.5px #111"></i></div></div>`;
    $('#h-month', v).innerHTML =
      goal('🏃', 'Run distance', m.km, st.monthlyKm, x => x.toFixed(x >= 100 ? 0 : 1) + ' km') +
      goal('🏋️', 'Workouts', m.workouts, st.monthlyWorkouts, x => x) +
      goal('💪', 'Push-ups', m.pushups, st.monthlyPushups, x => F.int(x));
    $('#h-month', v).firstElementChild.classList.remove('mt12');

    // ---- recent
    const recent = Log.all().slice().sort((a, b) => b.date.localeCompare(a.date) || (b.ts || 0) - (a.ts || 0)).slice(0, 5);
    $('#h-recent', v).innerHTML = recent.length ? `<div class="list">${recent.map(LogUI.itemHtml).join('')}</div>` :
      `<div class="card empty"><div class="e">📓</div>Nothing logged yet. Runs, workouts, gym sessions and notes show up here.</div>`;
    LogUI.bindItems($('#h-recent', v));

    if (!st.onboarded) setTimeout(() => Profile.onboard(), 300);
  },
});

App.on('native:resume', () => { if (!App.stack.length && App.tab === 'home') App.render(); });
App.on('native:permission', () => { if (!App.stack.length && App.tab === 'home') App.render(); });

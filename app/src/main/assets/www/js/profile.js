/* Profile & settings, backup, first-run welcome. */
'use strict';

const Profile = {
  avatarHtml(size = 44) {
    const st = DB.get('settings');
    const src = st.avatar || null;
    return src ? `<img class="avatar" src="${src}" style="width:${size}px;height:${size}px" alt="">`
      : `<span class="icon-btn" style="width:${size}px;height:${size}px">${ICON.user}</span>`;
  },

  // What stops reminders, runs and workouts in the background, with one-tap fixes.
  bgStatus() { try { return JSON.parse(N.bgStatus()); } catch (e) { return { notif: true, battery: true, exact: true }; } },
  bgCard(box, always) {
    if (!box) return;
    const s = Profile.bgStatus();
    const ok = s.notif && s.battery && s.exact;
    if (ok && !always) { box.innerHTML = ''; return; }
    const row = (good, title, sub, act) => `<div class="bg-row"><span class="st ${good ? 'ok' : 'no'}">${good ? '✓' : '!'}</span>
      <div class="grow"><div class="small" style="font-weight:700">${title}</div><div class="tiny muted">${sub}</div></div>${good ? '' : `<button class="btn sm" data-fix="${act}">Fix</button>`}</div>`;
    box.innerHTML = `<div class="${always ? '' : 'section'}"><div class="card white ${ok ? '' : 'bg-card'}">
      <div class="h3">${ok ? 'Background ready' : 'Keep STRIDE running in the background'}</div>
      <div class="tiny muted mt4">${ok ? 'Runs, workouts, rest timers and challenge alerts keep going with the screen off.' : 'Without these, notifications and timers stop when the screen turns off.'}</div>
      <div class="mt8">${row(s.notif, 'Notifications', s.notif ? 'Allowed' : 'Blocked: live run, workout and alarm notifications can\'t show', 'notif')}
      ${row(s.battery, 'Battery: unrestricted', s.battery ? 'Android won\'t pause the app' : 'Android may freeze timers and kill runs in the background', 'battery')}
      ${row(s.exact, 'Alarms & reminders', s.exact ? 'Allowed' : 'Needed so challenge alerts ring on time', 'exact')}</div>
      ${!ok && /xiaomi|redmi|poco|oppo|vivo|realme|oneplus|huawei|honor|samsung/i.test(s.maker || '') ? `<div class="tiny muted mt8">On ${esc(s.maker)} phones also open <b>App info → Battery</b> and choose <b>No restrictions</b>, and allow <b>Autostart</b> if you see it.</div>
        <button class="btn ghost sm mt8" data-fix="app">Open app info</button>` : ''}</div></div>`;
    $$('[data-fix]', box).forEach(b => b.onclick = () => {
      const k = b.dataset.fix;
      if (k === 'notif') N.openNotifSettings(); else if (k === 'battery') N.openBatterySettings(); else if (k === 'exact') N.openAlarmSettings(); else N.openAppSettings();
    });
  },

  open(focus) {
    App.push('Profile & settings', body => {
      const st = DB.get('settings'), cs = Club.stats();
      const sw = (key, label, sub) => `<div class="list-item"><div class="grow"><div style="font-weight:600">${label}</div>${sub ? `<div class="tiny muted">${sub}</div>` : ''}</div><button class="switch ${st[key] ? 'on' : ''}" data-sw="${key}"></button></div>`;
      const opt = (key, label, vals, fmt) => `<div class="list-item" style="flex-wrap:wrap"><div class="grow" style="font-weight:600">${label}</div>
        <div class="chips" style="margin:6px 0 0;padding:0;width:100%">${vals.map(x => `<button class="chip ${st[key] === x ? 'on' : ''}" data-opt="${key}" data-val="${x}">${fmt(x)}</button>`).join('')}</div></div>`;
      body.innerHTML = `<div class="page" style="padding-top:0">
        <div class="row"><div style="position:relative">${Profile.avatarHtml(72)}</div>
          <div><div class="display" style="font-size:28px">${esc(st.name || 'Athlete')}</div><div class="muted small">${cs.runs} runs · ${cs.totalKm.toFixed(0)} km · ${cs.workouts} workouts</div></div></div>

        <div class="row mt16" style="gap:8px">
          <label class="btn ghost sm" style="cursor:pointer">📷 Profile photo<input type="file" accept="image/*" data-photo style="display:none"></label>
          ${st.avatar ? '<button class="btn outline sm" data-photo-reset>Remove photo</button>' : ''}</div>

        <div class="h2 mt24">Background & notifications</div>
        <div class="mt8" data-bg></div>

        <div class="h2 mt24">You</div>
        <div class="row mt8"><div class="field grow" style="margin:0"><label>Name</label><input data-f="name" value="${esc(st.name)}"></div>
          <div class="field" style="margin:0;width:110px"><label>Weight kg</label><input data-f="weightKg" type="number" inputmode="decimal" value="${st.weightKg}"></div></div>

        <div class="h2 mt24" id="goals-sec">Monthly goals</div>
        <div class="row mt8">
          <div class="field grow" style="margin:0"><label>Run km</label><input data-f="monthlyKm" type="number" inputmode="numeric" value="${st.monthlyKm}"></div>
          <div class="field grow" style="margin:0"><label>Workouts</label><input data-f="monthlyWorkouts" type="number" inputmode="numeric" value="${st.monthlyWorkouts}"></div>
          <div class="field grow" style="margin:0"><label>Push-ups</label><input data-f="monthlyPushups" type="number" inputmode="numeric" value="${st.monthlyPushups}"></div></div>

        <div class="h2 mt24">Voice coach</div>
        <div class="list mt8">
          ${sw('voice', 'Voice feedback', 'Updates during runs and workouts. Your music dips while it talks.')}
          ${opt('announceM', 'Announce every', [0, 500, 1000, 2000], x => x ? (x / 1000) + ' km' : 'Off')}
          ${sw('sayTime', 'Include time')}
          ${sw('sayPace', 'Include average pace')}
          ${opt('countdown', 'Countdown before run', [0, 3, 5, 10], x => x ? x + 's' : 'None')}
        </div>

        <div class="h2 mt24">Data</div>
        <div class="list mt8">
          <button class="list-item" style="width:100%;text-align:left" data-export><div class="grow"><div style="font-weight:600">Back up</div><div class="tiny muted">Save everything to a file (Drive, Downloads…)</div></div>${ICON.right.replace('<svg', '<svg width="20" height="20" fill="#666"')}</button>
          <button class="list-item" style="width:100%;text-align:left" data-import><div class="grow"><div style="font-weight:600">Restore</div><div class="tiny muted">Load a STRIDE backup file. Replaces current data.</div></div>${ICON.right.replace('<svg', '<svg width="20" height="20" fill="#666"')}</button>
          <button class="list-item" style="width:100%;text-align:left" data-alerts><div class="grow"><div style="font-weight:600">Stop all challenge alerts</div></div></button>
        </div>

        <div class="h2 mt24">About</div>
        <div class="card mt8 small muted">STRIDE works fully offline. Everything stays on this phone unless you back it up.<br><br>
          Exercise photos from the free-exercise-db open dataset (public domain); the remaining moves use STRIDE's own 3D illustrations.<br><br>Evil Russian push-up formula from The Modern Rogue; original calculator by Logan Schmidt (MIT licence).
          Fonts: Oswald and Inter (SIL Open Font Licence).<br><br><span class="dim">Version ${esc(JSON.parse(N.info()).version)}</span></div>
      </div>`;

      Profile.bgCard($('[data-bg]', body), true);
      const rs = $('[data-photo-reset]', body); if (rs) rs.onclick = () => { st.avatar = null; DB.save('settings'); App.redrawTop(); };
      $('[data-photo]', body).onchange = e => {
        const f = e.target.files && e.target.files[0]; if (!f) return;
        const img = new Image();
        img.onload = () => {
          // square crop from the top-centre (faces are usually in the upper half), 256 px
          const sz = Math.min(img.width, img.height), sx = (img.width - sz) / 2, sy = Math.max(0, (img.height - sz) * 0.25);
          const c = document.createElement('canvas'); c.width = c.height = 256;
          c.getContext('2d').drawImage(img, sx, sy, sz, sz, 0, 0, 256, 256);
          st.avatar = c.toDataURL('image/jpeg', 0.85); DB.save('settings');
          App.toast('Photo updated'); App.redrawTop();
        };
        img.src = URL.createObjectURL(f);
      };
      $$('[data-f]', body).forEach(inp => inp.onchange = () => {
        const k = inp.dataset.f; st[k] = inp.type === 'number' ? Math.max(0, +inp.value || 0) : inp.value.trim();
        DB.save('settings'); App.emit('data');
      });
      $$('[data-sw]', body).forEach(b => b.onclick = () => {
        const k = b.dataset.sw; st[k] = !st[k]; DB.save('settings'); b.classList.toggle('on', st[k]);
        if (k === 'voice') { N.setVoice(st.voice); if (st.voice) N.speakNow('Voice coach on.'); }
      });
      $$('[data-opt]', body).forEach(b => b.onclick = () => { st[b.dataset.opt] = +b.dataset.val; DB.save('settings'); App.redrawTop(); });
      $('[data-export]', body).onclick = () => N.exportData(DB.exportAll(), `stride-backup-${D.today()}.json`);
      $('[data-import]', body).onclick = () => App.confirm('Restore backup?', 'This replaces everything currently in the app with the backup.', 'Choose file', () => N.importData(), true);
      $('[data-alerts]', body).onclick = () => { N.reminderClear(); Ch.all().forEach(c => { c.alerts = false; }); Ch.save(); App.toast('Alerts stopped'); };
      if (focus === 'goals') setTimeout(() => { const g = $('#goals-sec', body); if (g) g.scrollIntoView({ block: 'start' }); }, 60);
    });
  },

  onboard() {
    const st = DB.get('settings');
    // Never cover another sheet, such as the damaged-data warning; onboarding returns on the next start.
    if (st.onboarded || App.stack.length || $('#sheet-wrap').classList.contains('open')) return;
    App.sheet(s => {
      s.innerHTML = `<div class="display" style="font-size:40px;line-height:.95">Welcome to<br><span class="volt">STRIDE</span></div>
        <p class="muted">Runs with a voice coach, guided workouts, push-up challenges and your training diary. All offline.</p>
        <div class="field"><label>What should we call you?</label><input data-name placeholder="Your name"></div>
        <div class="field"><label>Weight (kg) <span class="dim" style="text-transform:none;letter-spacing:0">· for calorie estimates</span></label><input data-w type="number" inputmode="decimal" value="${st.weightKg}"></div>
        <button class="btn volt block mt16" data-go>Let's go</button>`;
      $('[data-go]', s).onclick = () => {
        st.name = $('[data-name]', s).value.trim(); st.weightKg = +$('[data-w]', s).value || 70; st.onboarded = true;
        DB.save('settings'); N.requestNotifications(); App.closeSheet(); App.render();
      };
    }, () => { if (!st.onboarded) { st.onboarded = true; DB.save('settings'); } });
  },
};

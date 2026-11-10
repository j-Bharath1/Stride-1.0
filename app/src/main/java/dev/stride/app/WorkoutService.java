package dev.stride.app;

import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.media.AudioManager;
import android.media.ToneGenerator;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;
import android.os.SystemClock;

import org.json.JSONArray;
import org.json.JSONObject;

/**
 * Runs a guided workout (or a gym rest timer) in the background: counts down each move,
 * beeps, speaks cues and keeps a live notification with Pause / Next / Stop.
 * The web UI only displays this state, so nothing stops when the screen goes off.
 */
public class WorkoutService extends Service {

    static final String A_START = "dev.stride.app.W_START";
    static final String A_CMD = "dev.stride.app.W_CMD";
    static final String CHANNEL = "workout_live";
    private static final int NOTIF_ID = 9;

    // ---- shared state (single process)
    private static final Object L = new Object();
    private static String title = "";
    private static JSONArray steps = new JSONArray();
    private static int restSec, readySec;
    private static boolean restMode, voice = true;
    private static String status = "idle";   // idle | running | paused | done
    private static String phase = "ready";   // ready | work | rest | done
    private static int idx = -1;
    private static long endAt;               // elapsedRealtime when the current timed phase ends (0 = waiting for "done")
    private static long pausedLeft;
    private static long bank, segStart;      // active time
    private static int lastBeep = -1;
    private static boolean halfSaid;

    private final Handler handler = new Handler(Looper.getMainLooper());
    private PowerManager.WakeLock wake;
    private ToneGenerator tone;

    static void start(Context c, String planJson) {
        Intent i = new Intent(c, WorkoutService.class).setAction(A_START).putExtra("plan", planJson);
        c.startForegroundService(i);
    }

    static void cmd(Context c, String cmd) {
        synchronized (L) { if ("idle".equals(status)) return; }
        c.startService(new Intent(c, WorkoutService.class).setAction(A_CMD).putExtra("cmd", cmd));
    }

    static String stateJson() {
        synchronized (L) {
            JSONObject o = new JSONObject();
            try {
                long now = SystemClock.elapsedRealtime();
                o.put("status", status);
                o.put("phase", phase);
                o.put("idx", idx);
                o.put("n", steps.length());
                o.put("title", title);
                long left = "paused".equals(status) ? pausedLeft : (endAt > 0 ? Math.max(0, endAt - now) : -1);
                o.put("leftMs", left);
                o.put("elapsedMs", bank + ("running".equals(status) ? now - segStart : 0));
            } catch (Exception ignored) { }
            return o.toString();
        }
    }

    static void reset() { synchronized (L) { status = "idle"; phase = "ready"; idx = -1; } }

    @Override public IBinder onBind(Intent intent) { return null; }

    @Override
    public void onCreate() {
        super.onCreate();
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm != null && nm.getNotificationChannel(CHANNEL) == null) {
            android.app.NotificationChannel ch = new android.app.NotificationChannel(CHANNEL, "Workout in progress", NotificationManager.IMPORTANCE_DEFAULT);
            ch.setDescription("Live countdown during workouts and rest timers");
            ch.setSound(null, null);
            ch.enableVibration(false);
            ch.setShowBadge(false);
            nm.createNotificationChannel(ch);
        }
        try { tone = new ToneGenerator(AudioManager.STREAM_MUSIC, 90); } catch (Exception ignored) { }
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String a = intent != null ? intent.getAction() : null;
        if (A_START.equals(a)) {
            try { goForeground(); } catch (Exception e) { stopSelf(); return START_NOT_STICKY; }
            begin(intent.getStringExtra("plan"));
            if (wake == null) wake = getSystemService(PowerManager.class).newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "stride:workout");
            if (!wake.isHeld()) wake.acquire(4 * 60 * 60 * 1000L);
            handler.removeCallbacks(tick);
            handler.post(tick);
        } else if (A_CMD.equals(a)) {
            handle(intent.getStringExtra("cmd"));
        } else {
            synchronized (L) { if ("idle".equals(status) || "done".equals(status)) stopSelf(); }
        }
        return START_NOT_STICKY;
    }

    private void goForeground() {
        Notification n = build();
        if (Build.VERSION.SDK_INT >= 29) startForeground(NOTIF_ID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
        else startForeground(NOTIF_ID, n);
    }

    // ---------------------------------------------------------------- engine

    private void begin(String json) {
        synchronized (L) {
            try {
                JSONObject p = new JSONObject(json);
                title = p.optString("title", "Workout");
                steps = p.optJSONArray("steps") != null ? p.optJSONArray("steps") : new JSONArray();
                restSec = p.optInt("rest", 0);
                readySec = p.optInt("ready", 5);
                restMode = p.optBoolean("restMode", false);
                voice = p.optBoolean("voice", true);
            } catch (Exception e) { steps = new JSONArray(); }
            long now = SystemClock.elapsedRealtime();
            status = "running"; bank = 0; segStart = now; lastBeep = -1; halfSaid = false;
            if (restMode) {
                idx = 0; phase = "rest";
                endAt = now + steps.optJSONObject(0).optInt("sec", 60) * 1000L;
            } else {
                idx = -1; phase = "ready";
                endAt = now + readySec * 1000L;
                say(title + ". Get ready. First up, " + name(0) + ".");
            }
        }
        update();
    }

    private void handle(String c) {
        if (c == null) return;
        synchronized (L) {
            long now = SystemClock.elapsedRealtime();
            switch (c) {
                case "pause":
                    if (!"running".equals(status)) break;
                    pausedLeft = endAt > 0 ? Math.max(0, endAt - now) : -1;
                    bank += now - segStart; status = "paused";
                    Speaker.get(this).stop();
                    break;
                case "resume":
                    if (!"paused".equals(status)) break;
                    if (pausedLeft >= 0) endAt = now + pausedLeft;
                    segStart = now; status = "running";
                    break;
                case "toggle":
                    handle("running".equals(status) ? "pause" : "resume");
                    return;
                case "next": advance(true); break;
                case "done": advance(false); break;
                case "prev":
                    if (idx > 0) { idx--; startWork(); }
                    break;
                case "add15": if (endAt > 0) endAt += 15000; break;
                case "sub15": if (endAt > 0) endAt = Math.max(now + 1000, endAt - 15000); break;
                case "stop":
                    status = "idle"; phase = "ready"; idx = -1;
                    finishService();
                    return;
            }
        }
        update();
    }

    private void advance(boolean skip) {
        synchronized (L) {
            long now = SystemClock.elapsedRealtime();
            if ("ready".equals(phase)) { idx = 0; startWork(); return; }
            if ("work".equals(phase)) {
                if (idx + 1 >= steps.length()) { complete(); return; }
                if (restSec > 0 && !skip) {
                    phase = "rest"; endAt = now + restSec * 1000L; lastBeep = -1;
                    say("Rest. Next up, " + name(idx + 1) + ".");
                    beep(ToneGenerator.TONE_PROP_ACK, 150);
                    return;
                }
                idx++; startWork(); return;
            }
            if ("rest".equals(phase)) {
                if (restMode) { complete(); return; }
                idx++; startWork();
            }
        }
    }

    private void startWork() {
        JSONObject s = steps.optJSONObject(idx);
        if (s == null) { complete(); return; }
        phase = "work"; lastBeep = -1; halfSaid = false;
        int sec = s.optInt("sec", 0), reps = s.optInt("reps", 0);
        endAt = sec > 0 ? SystemClock.elapsedRealtime() + sec * 1000L : 0;
        say(reps > 0 ? s.optString("name") + ". " + reps + " reps. Tap done when finished." : s.optString("name") + ". " + sec + " seconds. Go!");
        beep(ToneGenerator.TONE_PROP_BEEP2, 250);
    }

    private void complete() {
        long now = SystemClock.elapsedRealtime();
        if ("running".equals(status)) bank += now - segStart;
        status = "done"; phase = "done"; endAt = 0;
        if (restMode) { say("Rest over. Next set."); beep(ToneGenerator.TONE_CDMA_ALERT_CALL_GUARD, 600); vibrate(); }
        else { say("Workout complete! Great job."); beep(ToneGenerator.TONE_PROP_ACK, 400); }
        handler.postDelayed(this::finishService, 1500);
    }

    private final Runnable tick = new Runnable() {
        @Override public void run() {
            boolean changed = false, alive;
            synchronized (L) {
                alive = "running".equals(status) || "paused".equals(status);
                if ("running".equals(status) && endAt > 0) {
                    long left = endAt - SystemClock.elapsedRealtime();
                    int secLeft = (int) Math.ceil(left / 1000.0);
                    if (secLeft <= 3 && secLeft >= 1 && secLeft != lastBeep) { lastBeep = secLeft; beep(ToneGenerator.TONE_PROP_BEEP, 120); }
                    JSONObject s = steps.optJSONObject(Math.max(0, idx));
                    if ("work".equals(phase) && s != null && !halfSaid && s.optInt("sec") >= 20 && left <= s.optInt("sec") * 500L) { halfSaid = true; say("Halfway"); }
                    if (left <= 0) { advance(false); changed = true; }
                }
            }
            if (changed) update();
            if (alive) handler.postDelayed(this, 200);
        }
    };

    // ---------------------------------------------------------------- notification

    private void update() {
        synchronized (L) { if ("idle".equals(status)) return; }
        NotificationManager nm = getSystemService(NotificationManager.class);
        if (nm != null) nm.notify(NOTIF_ID, build());
    }

    private Notification build() {
        String t, text;
        long whenWall = 0;
        boolean paused, reps = false;
        synchronized (L) {
            paused = "paused".equals(status);
            JSONObject s = steps.optJSONObject(Math.max(0, idx));
            JSONObject nx = steps.optJSONObject(idx + 1);
            if (restMode) { t = "Rest"; text = "Next set when the timer ends"; }
            else if ("ready".equals(phase)) { t = "Get ready: " + name(0); text = title; }
            else if ("rest".equals(phase)) { t = "Rest"; text = "Next: " + name(idx + 1); }
            else if ("done".equals(phase)) { t = title + " complete"; text = "Nice work!"; }
            else {
                reps = s != null && s.optInt("reps") > 0;
                t = (s != null ? s.optString("name") : "") + (reps ? "  ×" + s.optInt("reps") : "");
                text = "Move " + (idx + 1) + " of " + steps.length() + (nx != null ? "  ·  next: " + nx.optString("name") : "");
            }
            if (endAt > 0 && !paused) whenWall = System.currentTimeMillis() + (endAt - SystemClock.elapsedRealtime());
        }
        PendingIntent open = PendingIntent.getActivity(this, 40,
                new Intent(this, MainActivity.class).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        Notification.Builder b = new Notification.Builder(this, CHANNEL)
                .setSmallIcon(R.drawable.ic_stat_run)
                .setContentTitle(paused ? "Paused · " + t : t)
                .setContentText(text)
                .setOngoing(true)
                .setOnlyAlertOnce(true)
                .setCategory(Notification.CATEGORY_WORKOUT)
                .setVisibility(Notification.VISIBILITY_PUBLIC)
                .setContentIntent(open)
                .addAction(new Notification.Action.Builder(null, paused ? "Resume" : "Pause", act(paused ? "resume" : "pause", 41)).build());
        if (restMode) b.addAction(new Notification.Action.Builder(null, "+15s", act("add15", 42)).build());
        else b.addAction(new Notification.Action.Builder(null, reps ? "Done" : "Next", act(reps ? "done" : "next", 42)).build());
        b.addAction(new Notification.Action.Builder(null, restMode ? "Skip" : "Stop", act(restMode ? "next" : "stop", 43)).build());
        if (whenWall > 0) {
            b.setWhen(whenWall).setShowWhen(true).setUsesChronometer(true);
            if (Build.VERSION.SDK_INT >= 24) b.setChronometerCountDown(true);
        }
        if (Build.VERSION.SDK_INT >= 31) b.setForegroundServiceBehavior(Notification.FOREGROUND_SERVICE_IMMEDIATE);
        return b.build();
    }

    private PendingIntent act(String cmd, int req) {
        return PendingIntent.getService(this, req,
                new Intent(this, WorkoutService.class).setAction(A_CMD).putExtra("cmd", cmd),
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    // ---------------------------------------------------------------- helpers

    private static String name(int i) {
        JSONObject s = steps.optJSONObject(i);
        return s != null ? s.optString("name", "") : "";
    }

    private void say(String s) { if (voice) Speaker.get(this).sayNow(s); }

    private void beep(int t, int ms) { try { if (tone != null) tone.startTone(t, ms); } catch (Exception ignored) { } }

    private void vibrate() {
        android.os.Vibrator v = getSystemService(android.os.Vibrator.class);
        if (v != null && v.hasVibrator()) v.vibrate(android.os.VibrationEffect.createOneShot(400, android.os.VibrationEffect.DEFAULT_AMPLITUDE));
    }

    private void finishService() {
        handler.removeCallbacks(tick);
        if (wake != null && wake.isHeld()) wake.release();
        stopForeground(STOP_FOREGROUND_REMOVE);
        stopSelf();
    }

    @Override
    public void onDestroy() {
        handler.removeCallbacks(tick);
        if (wake != null && wake.isHeld()) wake.release();
        if (tone != null) tone.release();
        super.onDestroy();
    }
}

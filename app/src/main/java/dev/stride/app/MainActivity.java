package dev.stride.app;

import android.Manifest;
import android.app.Activity;
import android.content.ActivityNotFoundException;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.graphics.Insets;
import android.hardware.Sensor;
import android.hardware.SensorEvent;
import android.hardware.SensorEventListener;
import android.hardware.SensorManager;
import android.media.AudioManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.SystemClock;
import android.os.VibrationEffect;
import android.os.Vibrator;
import android.provider.DocumentsContract;
import android.provider.Settings;
import android.view.KeyEvent;
import android.view.View;
import android.view.WindowInsets;
import android.view.WindowManager;
import android.webkit.JavascriptInterface;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Toast;

import org.json.JSONObject;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;

public class MainActivity extends Activity implements SensorEventListener {

    private static final int REQ_NOTIF = 2, REQ_EXPORT = 3, REQ_IMPORT = 4, REQ_FILE = 5;
    private static final String PAGE = "file:///android_asset/www/index.html";

    private WebView web;
    private boolean pageReady;
    private String pendingRoute;
    private String exportPayload;
    private ValueCallback<Uri[]> fileCallback;
    private SensorManager sensors;
    private Sensor proximity;
    private boolean proxOn, lastNear;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        Notify.channels(this);
        Speaker.get(this); // warm up the TTS engine

        getWindow().setStatusBarColor(Color.WHITE);
        getWindow().setNavigationBarColor(Color.WHITE);
        // dark status/nav bar icons on the white theme
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR | View.SYSTEM_UI_FLAG_LIGHT_NAVIGATION_BAR);

        web = new WebView(this);
        web.setBackgroundColor(Color.WHITE);
        setContentView(web);
        applyInsets(web);

        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setAllowFileAccess(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setTextZoom(100);
        web.setOverScrollMode(View.OVER_SCROLL_NEVER);
        web.addJavascriptInterface(new Bridge(), "Android");
        web.setWebViewClient(new WebViewClient() {
            @Override
            public boolean shouldOverrideUrlLoading(WebView v, WebResourceRequest r) {
                Uri u = r.getUrl();
                if ("file".equals(u.getScheme())) return false;
                try { startActivity(new Intent(Intent.ACTION_VIEW, u)); } catch (Exception ignored) { }
                return true;
            }

            @Override
            public void onPageFinished(WebView v, String url) {
                pageReady = true;
                if (pendingRoute != null) { emit("route", JSONObject.quote(pendingRoute)); pendingRoute = null; }
            }
        });
        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public boolean onShowFileChooser(WebView v, ValueCallback<Uri[]> cb, FileChooserParams params) {
                if (fileCallback != null) fileCallback.onReceiveValue(null);
                fileCallback = cb;
                try {
                    startActivityForResult(params.createIntent(), REQ_FILE);
                } catch (ActivityNotFoundException e) {
                    fileCallback = null;
                    return false;
                }
                return true;
            }
        });

        sensors = getSystemService(SensorManager.class);
        proximity = sensors != null ? sensors.getDefaultSensor(Sensor.TYPE_PROXIMITY) : null;

        if (Build.VERSION.SDK_INT >= 33) Back33.register(this, this::handleBack);

        handleIntent(getIntent());
        web.loadUrl(PAGE);
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        handleIntent(intent);
    }

    private void handleIntent(Intent i) {
        if (i == null) return;
        String route = i.getStringExtra("route");
        if (route == null) return;
        Reminders.dismiss(this);
        if (pageReady) emit("route", JSONObject.quote(route));
        else pendingRoute = route;
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (pageReady) emit("resume", "null");
        if (proxOn) registerProx();
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (proxOn && sensors != null) sensors.unregisterListener(this);
    }

    /**
     * Android 15 (targetSdk 35) turns on predictive back by default and stops calling
     * onBackPressed(), so the activity would just finish. Register the new callback on
     * API 33+ and keep onBackPressed for older devices; both run the same logic.
     */
    @Override
    public void onBackPressed() { handleBack(); }

    private void handleBack() {
        if (!pageReady || web == null) { moveTaskToBack(true); return; }
        web.evaluateJavascript("(function(){try{return !!(window.App && App.back && App.back());}catch(e){return true;}})()",
                // "false" means the page deliberately let Back through (second press on Home),
                // so leave. A null/garbled result during startup is ignored rather than exiting.
                v -> { if ("false".equals(v)) moveTaskToBack(true); });
    }

    /** Isolates the API 33+ back types so they are never loaded on older devices. */
    private static final class Back33 {
        static void register(Activity a, Runnable onBack) {
            a.getOnBackInvokedDispatcher().registerOnBackInvokedCallback(
                    android.window.OnBackInvokedDispatcher.PRIORITY_DEFAULT, onBack::run);
        }
    }

    // ------------------------------------------------------------------ JS <-> native

    void emit(String name, String jsonArg) {
        String js = "window.onNative && window.onNative(" + JSONObject.quote(name) + "," + jsonArg + ")";
        runOnUiThread(() -> web.evaluateJavascript(js, null));
    }

    private class Bridge {
        // An unreadable file is sent as text that is never valid JSON, because a null may not cross the bridge as null.
        @JavascriptInterface public String load(String key) { String v = Store.load(MainActivity.this, key); return v != null ? v : "\u0000unreadable"; }
        @JavascriptInterface public boolean save(String key, String json) { return Store.save(MainActivity.this, key, json); }
        @JavascriptInterface public boolean quarantine(String key) { return Store.quarantine(MainActivity.this, key); }

        @JavascriptInterface public void speak(String text) { Speaker.get(MainActivity.this).say(text); }
        @JavascriptInterface public void speakNow(String text) { Speaker.get(MainActivity.this).sayNow(text); }
        @JavascriptInterface public void stopSpeaking() { Speaker.get(MainActivity.this).stop(); }
        @JavascriptInterface public void setVoice(boolean on) { Speaker.get(MainActivity.this).setEnabled(on); }

        @JavascriptInterface public void vibrate(int ms) {
            Vibrator v = getSystemService(Vibrator.class);
            if (v != null && v.hasVibrator()) v.vibrate(VibrationEffect.createOneShot(Math.max(10, ms), VibrationEffect.DEFAULT_AMPLITUDE));
        }

        @JavascriptInterface public void keepAwake(boolean on) {
            runOnUiThread(() -> {
                if (on) getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
                else getWindow().clearFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);
            });
        }

        @JavascriptInterface public void toast(String text) {
            runOnUiThread(() -> Toast.makeText(MainActivity.this, text, Toast.LENGTH_SHORT).show());
        }

        @JavascriptInterface public void requestNotifications() {
            if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
                    != PackageManager.PERMISSION_GRANTED) {
                runOnUiThread(() -> requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQ_NOTIF));
            }
        }

        // ---- guided workouts & rest timers run in WorkoutService
        @JavascriptInterface public void workoutStart(String plan) { requestNotifications(); WorkoutService.start(MainActivity.this, plan); }
        @JavascriptInterface public void workoutCmd(String c) { WorkoutService.cmd(MainActivity.this, c); }
        @JavascriptInterface public String workoutState() { return WorkoutService.stateJson(); }
        @JavascriptInterface public void workoutReset() { WorkoutService.reset(); }

        // ---- background readiness: notifications, battery, exact alarms
        @JavascriptInterface public String bgStatus() {
            android.app.NotificationManager nm = getSystemService(android.app.NotificationManager.class);
            boolean notif = nm != null && nm.areNotificationsEnabled();
            android.os.PowerManager pm = getSystemService(android.os.PowerManager.class);
            boolean battery = pm != null && pm.isIgnoringBatteryOptimizations(getPackageName());
            android.app.AlarmManager am = getSystemService(android.app.AlarmManager.class);
            boolean exact = Build.VERSION.SDK_INT < 31 || (am != null && am.canScheduleExactAlarms());
            return "{\"notif\":" + notif + ",\"battery\":" + battery + ",\"exact\":" + exact + ",\"maker\":" + JSONObject.quote(Build.MANUFACTURER) + "}";
        }
        @JavascriptInterface public void openNotifSettings() {
            runOnUiThread(() -> {
                if (Build.VERSION.SDK_INT >= 33 && checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
                        && shouldShowRequestPermissionRationale(Manifest.permission.POST_NOTIFICATIONS)) {
                    requestPermissions(new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQ_NOTIF);
                    return;
                }
                startActivity(new Intent(Settings.ACTION_APP_NOTIFICATION_SETTINGS).putExtra(Settings.EXTRA_APP_PACKAGE, getPackageName()));
            });
        }
        @JavascriptInterface public void openBatterySettings() {
            runOnUiThread(() -> {
                try {
                    startActivity(new Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS, Uri.parse("package:" + getPackageName())));
                } catch (Exception e) {
                    startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getPackageName())));
                }
            });
        }
        @JavascriptInterface public void openAlarmSettings() {
            runOnUiThread(() -> {
                try {
                    if (Build.VERSION.SDK_INT >= 31) startActivity(new Intent(Settings.ACTION_REQUEST_SCHEDULE_EXACT_ALARM, Uri.parse("package:" + getPackageName())));
                } catch (Exception ignored) { }
            });
        }
        @JavascriptInterface public void openAppSettings() {
            runOnUiThread(() -> startActivity(new Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS, Uri.parse("package:" + getPackageName()))));
        }

        // ---- music (works with Spotify, YouTube Music, etc.)
        @JavascriptInterface public void media(String cmd) {
            int code;
            switch (cmd) {
                case "next": code = KeyEvent.KEYCODE_MEDIA_NEXT; break;
                case "prev": code = KeyEvent.KEYCODE_MEDIA_PREVIOUS; break;
                default: code = KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE;
            }
            AudioManager am = getSystemService(AudioManager.class);
            if (am == null) return;
            am.dispatchMediaKeyEvent(new KeyEvent(KeyEvent.ACTION_DOWN, code));
            am.dispatchMediaKeyEvent(new KeyEvent(KeyEvent.ACTION_UP, code));
        }
        @JavascriptInterface public boolean musicActive() {
            AudioManager am = getSystemService(AudioManager.class);
            return am != null && am.isMusicActive();
        }
        @JavascriptInterface public void openMusic() {
            runOnUiThread(() -> {
                try {
                    startActivity(Intent.makeMainSelectorActivity(Intent.ACTION_MAIN, Intent.CATEGORY_APP_MUSIC)
                            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK));
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this, "No music app found", Toast.LENGTH_SHORT).show();
                }
            });
        }

        // ---- challenge alerts
        @JavascriptInterface public void reminderSet(int intervalMin, int fromHour, int toHour, String title, String text) {
            requestNotifications();
            Reminders.set(MainActivity.this, intervalMin, fromHour, toHour, title, text);
        }
        @JavascriptInterface public void reminderClear() { Reminders.clear(MainActivity.this); }
        @JavascriptInterface public String reminderState() { return Reminders.stateJson(MainActivity.this); }

        // ---- rep counter: phone on the floor under your chest
        @JavascriptInterface public boolean hasProximity() { return proximity != null; }
        @JavascriptInterface public void proximity(boolean on) {
            runOnUiThread(() -> {
                proxOn = on;
                if (on) registerProx();
                else if (sensors != null) sensors.unregisterListener(MainActivity.this);
            });
        }

        // ---- backup
        @JavascriptInterface public void exportData(String json, String fileName) {
            exportPayload = json;
            // Also keep it on disk: Android may end the app while the file picker is open, losing the field.
            try { Files.write(pendingExport().toPath(), json.getBytes(StandardCharsets.UTF_8)); } catch (Exception ignored) { }
            runOnUiThread(() -> {
                Intent i = new Intent(Intent.ACTION_CREATE_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE)
                        .setType("application/json").putExtra(Intent.EXTRA_TITLE, fileName);
                try { startActivityForResult(i, REQ_EXPORT); } catch (Exception e) { toast("Can't open file picker"); }
            });
        }
        @JavascriptInterface public void importData() {
            runOnUiThread(() -> {
                Intent i = new Intent(Intent.ACTION_OPEN_DOCUMENT).addCategory(Intent.CATEGORY_OPENABLE)
                        .setType("*/*");
                try { startActivityForResult(i, REQ_IMPORT); } catch (Exception e) { toast("Can't open file picker"); }
            });
        }
        @JavascriptInterface public void share(String text) {
            runOnUiThread(() -> startActivity(Intent.createChooser(
                    new Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, text), "Share")));
        }

        @JavascriptInterface public String info() {
            String v = "1.0";
            try {
                PackageInfo pi = getPackageManager().getPackageInfo(getPackageName(), 0);
                v = pi.versionName;
            } catch (Exception ignored) { }
            return "{\"native\":true,\"version\":\"" + v + "\",\"sdk\":" + Build.VERSION.SDK_INT + "}";
        }
    }

    // ------------------------------------------------------------------ results

    private File pendingExport() { return new File(getCacheDir(), "pending-export.json"); }

    @Override
    public void onRequestPermissionsResult(int req, String[] perms, int[] res) {
        super.onRequestPermissionsResult(req, perms, res);
        boolean ok = res.length > 0 && res[0] == PackageManager.PERMISSION_GRANTED;
        if (req == REQ_NOTIF) emit("permission", "{\"name\":\"notifications\",\"granted\":" + ok + "}");
    }

    @Override
    protected void onActivityResult(int req, int result, Intent data) {
        super.onActivityResult(req, result, data);
        Uri uri = data != null ? data.getData() : null;
        if (req == REQ_FILE) {
            if (fileCallback != null) fileCallback.onReceiveValue(WebChromeClient.FileChooserParams.parseResult(result, data));
            fileCallback = null;
        } else if (req == REQ_EXPORT) {
            if (result == RESULT_OK && uri != null) {
                String payload = exportPayload;
                if (payload == null) {
                    try { payload = new String(Files.readAllBytes(pendingExport().toPath()), StandardCharsets.UTF_8); } catch (Exception ignored) { }
                }
                boolean saved = false;
                if (payload != null && !payload.isEmpty()) {
                    try {
                        try (OutputStream out = getContentResolver().openOutputStream(uri, "wt")) {
                            if (out == null) throw new IOException("No output stream");
                            out.write(payload.getBytes(StandardCharsets.UTF_8));
                        }
                        saved = true; // only once the stream has closed without error
                    } catch (Exception ignored) { }
                }
                if (saved) {
                    Toast.makeText(this, "Backup saved", Toast.LENGTH_SHORT).show();
                } else {
                    // The picker already created the file; remove it so an empty backup is never mistaken for a real one.
                    try { DocumentsContract.deleteDocument(getContentResolver(), uri); } catch (Exception ignored) { }
                    Toast.makeText(this, "Couldn't save backup. Please try again.", Toast.LENGTH_LONG).show();
                }
            }
            exportPayload = null;
            //noinspection ResultOfMethodCallIgnored
            pendingExport().delete();
        } else if (req == REQ_IMPORT && result == RESULT_OK && uri != null) {
            try (InputStream in = getContentResolver().openInputStream(uri)) {
                ByteArrayOutputStream buf = new ByteArrayOutputStream();
                byte[] b = new byte[8192];
                int n;
                while ((n = in.read(b)) > 0) buf.write(b, 0, n);
                emit("import", JSONObject.quote(buf.toString("UTF-8")));
            } catch (Exception e) {
                Toast.makeText(this, "Couldn't read that file", Toast.LENGTH_LONG).show();
            }
        }
    }

    // ------------------------------------------------------------------ proximity rep counter

    private void registerProx() {
        if (sensors != null && proximity != null) {
            sensors.registerListener(this, proximity, SensorManager.SENSOR_DELAY_GAME);
        }
    }

    @Override
    public void onSensorChanged(SensorEvent e) {
        if (e.sensor.getType() != Sensor.TYPE_PROXIMITY) return;
        boolean near = e.values[0] < Math.min(5f, e.sensor.getMaximumRange());
        if (near == lastNear) return;
        lastNear = near;
        emit("proximity", "{\"near\":" + near + "}");
    }

    @Override public void onAccuracyChanged(Sensor sensor, int accuracy) { }

    // ------------------------------------------------------------------ layout

    private void applyInsets(View v) {
        v.setOnApplyWindowInsetsListener((view, insets) -> {
            int l, t, r, b;
            if (Build.VERSION.SDK_INT >= 30) {
                Insets i = insets.getInsets(WindowInsets.Type.systemBars() | WindowInsets.Type.displayCutout());
                Insets ime = insets.getInsets(WindowInsets.Type.ime());
                l = i.left; t = i.top; r = i.right; b = Math.max(i.bottom, ime.bottom);
            } else {
                l = insets.getSystemWindowInsetLeft(); t = insets.getSystemWindowInsetTop();
                r = insets.getSystemWindowInsetRight(); b = insets.getSystemWindowInsetBottom();
            }
            view.setPadding(l, t, r, b);
            return insets;
        });
    }
}

package dev.stride.app;

import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.os.Build;
import android.text.format.DateFormat;

import java.util.Calendar;
import java.util.Date;

/**
 * Repeating "time for your next set" alarm for challenges. Rings every N minutes, only
 * between fromHour and toHour, until cleared. Survives reboots.
 */
final class Reminders {
    private static final String P = "reminders";
    static final int NOTIF_ID = 21;
    private Reminders() {}

    private static SharedPreferences p(Context c) { return c.getSharedPreferences(P, Context.MODE_PRIVATE); }

    static void set(Context c, int intervalMin, int fromHour, int toHour, String title, String text) {
        intervalMin = Math.max(1, intervalMin);
        long next = nextSlot(System.currentTimeMillis() + intervalMin * 60_000L, fromHour, toHour);
        p(c).edit().putBoolean("on", true).putInt("interval", intervalMin).putInt("from", fromHour)
                .putInt("to", toHour).putString("title", title).putString("text", text)
                .putLong("next", next).apply();
        schedule(c, next);
    }

    static void clear(Context c) {
        p(c).edit().putBoolean("on", false).putLong("next", 0).apply();
        AlarmManager am = c.getSystemService(AlarmManager.class);
        if (am != null) am.cancel(fireIntent(c));
        dismiss(c);
    }

    static void dismiss(Context c) {
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm != null) nm.cancel(NOTIF_ID);
    }

    static String stateJson(Context c) {
        SharedPreferences s = p(c);
        return "{\"on\":" + s.getBoolean("on", false) + ",\"interval\":" + s.getInt("interval", 0)
                + ",\"from\":" + s.getInt("from", 7) + ",\"to\":" + s.getInt("to", 22)
                + ",\"next\":" + s.getLong("next", 0) + "}";
    }

    static void restore(Context c) {
        SharedPreferences s = p(c);
        if (!s.getBoolean("on", false)) return;
        long next = s.getLong("next", 0);
        if (next <= System.currentTimeMillis()) {
            next = nextSlot(System.currentTimeMillis() + s.getInt("interval", 60) * 60_000L,
                    s.getInt("from", 7), s.getInt("to", 22));
            s.edit().putLong("next", next).apply();
        }
        schedule(c, next);
    }

    static void fired(Context c) {
        SharedPreferences s = p(c);
        if (!s.getBoolean("on", false)) return;
        int interval = s.getInt("interval", 60);
        long next = nextSlot(System.currentTimeMillis() + interval * 60_000L, s.getInt("from", 7), s.getInt("to", 22));
        s.edit().putLong("next", next).apply();
        schedule(c, next);

        Notify.channels(c);
        PendingIntent open = PendingIntent.getActivity(c, 30,
                new Intent(c, MainActivity.class).putExtra("route", "challenge")
                        .addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP),
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        PendingIntent done = PendingIntent.getBroadcast(c, 31,
                new Intent(c, Receiver.class).setAction(Receiver.DONE),
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        PendingIntent stop = PendingIntent.getBroadcast(c, 32,
                new Intent(c, Receiver.class).setAction(Receiver.STOP),
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
        Notification n = new Notification.Builder(c, Notify.REMIND)
                .setSmallIcon(R.drawable.ic_stat_run)
                .setContentTitle(s.getString("title", "Time for your next set"))
                .setContentText(s.getString("text", "") + "  ·  next at "
                        + DateFormat.getTimeFormat(c).format(new Date(next)))
                .setCategory(Notification.CATEGORY_ALARM)
                .setAutoCancel(true)
                .setContentIntent(open)
                .addAction(new Notification.Action.Builder(null, "Done", done).build())
                .addAction(new Notification.Action.Builder(null, "Stop alerts", stop).build())
                .build();
        n.flags |= Notification.FLAG_INSISTENT; // keeps ringing until you react
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm != null) nm.notify(NOTIF_ID, n);
    }

    /** Push a time forward into the allowed hours window. */
    static long nextSlot(long t, int fromHour, int toHour) {
        Calendar cal = Calendar.getInstance();
        cal.setTimeInMillis(t);
        int h = cal.get(Calendar.HOUR_OF_DAY);
        if (fromHour == toHour) return t;
        boolean inside = fromHour < toHour ? (h >= fromHour && h < toHour) : (h >= fromHour || h < toHour);
        if (inside) return t;
        Calendar start = (Calendar) cal.clone();
        start.set(Calendar.HOUR_OF_DAY, fromHour);
        start.set(Calendar.MINUTE, 0);
        start.set(Calendar.SECOND, 0);
        start.set(Calendar.MILLISECOND, 0);
        if (start.getTimeInMillis() <= t) start.add(Calendar.DAY_OF_MONTH, 1);
        return start.getTimeInMillis();
    }

    private static void schedule(Context c, long at) {
        AlarmManager am = c.getSystemService(AlarmManager.class);
        if (am == null) return;
        PendingIntent fire = fireIntent(c);
        boolean exact = Build.VERSION.SDK_INT < 31 || am.canScheduleExactAlarms();
        try {
            if (exact) {
                PendingIntent show = PendingIntent.getActivity(c, 33, new Intent(c, MainActivity.class),
                        PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
                am.setAlarmClock(new AlarmManager.AlarmClockInfo(at, show), fire);
                return;
            }
        } catch (SecurityException ignored) { }
        am.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, at, fire);
    }

    private static PendingIntent fireIntent(Context c) {
        return PendingIntent.getBroadcast(c, 34, new Intent(c, Receiver.class).setAction(Receiver.FIRE),
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT);
    }

    /** Alarm fire, notification buttons, and reboot/update restore. */
    public static class Receiver extends BroadcastReceiver {
        static final String FIRE = "dev.stride.app.REMIND_FIRE";
        static final String DONE = "dev.stride.app.REMIND_DONE";
        static final String STOP = "dev.stride.app.REMIND_STOP";

        @Override
        public void onReceive(Context c, Intent i) {
            String a = i.getAction();
            if (FIRE.equals(a)) fired(c);
            else if (DONE.equals(a)) dismiss(c);
            else if (STOP.equals(a)) clear(c);
            else restore(c); // boot completed / package replaced / exact-alarm permission granted
        }
    }
}

package dev.stride.app;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.media.AudioAttributes;
import android.media.RingtoneManager;
import android.net.Uri;

final class Notify {
    static final String RUN = "run_live2";
    static final String REMIND = "reminders";
    private Notify() {}

    static void channels(Context c) {
        NotificationManager nm = c.getSystemService(NotificationManager.class);
        if (nm == null) return;
        if (nm.getNotificationChannel("run_live") != null) nm.deleteNotificationChannel("run_live");
        if (nm.getNotificationChannel(RUN) == null) {
            NotificationChannel ch = new NotificationChannel(RUN, "Run in progress", NotificationManager.IMPORTANCE_DEFAULT);
            ch.setSound(null, null);
            ch.enableVibration(false);
            ch.setDescription("Live distance, time and pace while you run");
            ch.setShowBadge(false);
            nm.createNotificationChannel(ch);
        }
        if (nm.getNotificationChannel(REMIND) == null) {
            NotificationChannel ch = new NotificationChannel(REMIND, "Challenge alerts", NotificationManager.IMPORTANCE_HIGH);
            ch.setDescription("Rings when it's time for your next set");
            Uri sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_ALARM);
            if (sound == null) sound = RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION);
            ch.setSound(sound, new AudioAttributes.Builder().setUsage(AudioAttributes.USAGE_ALARM)
                    .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION).build());
            ch.enableVibration(true);
            ch.setVibrationPattern(new long[]{0, 600, 300, 600, 300, 600});
            nm.createNotificationChannel(ch);
        }
    }
}

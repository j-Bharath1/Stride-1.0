package dev.stride.app;

import android.content.Context;
import android.media.AudioAttributes;
import android.media.AudioFocusRequest;
import android.media.AudioManager;
import android.speech.tts.TextToSpeech;
import android.speech.tts.UtteranceProgressListener;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/** Voice coach. Ducks the user's music while speaking, then hands audio back. */
final class Speaker {
    private static Speaker inst;
    private final AudioManager am;
    private TextToSpeech tts;
    private boolean ready;
    private final List<String> pending = new ArrayList<>();
    private AudioFocusRequest focus;
    private int seq;
    private volatile boolean enabled = true;

    static synchronized Speaker get(Context c) {
        if (inst == null) inst = new Speaker(c.getApplicationContext());
        return inst;
    }

    private Speaker(Context c) {
        am = c.getSystemService(AudioManager.class);
        AudioAttributes attrs = new AudioAttributes.Builder()
                .setUsage(AudioAttributes.USAGE_ASSISTANCE_NAVIGATION_GUIDANCE)
                .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH).build();
        focus = new AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN_TRANSIENT_MAY_DUCK)
                .setAudioAttributes(attrs).build();
        tts = new TextToSpeech(c, status -> {
            synchronized (Speaker.this) {
                if (status != TextToSpeech.SUCCESS) return;
                int r = tts.setLanguage(Locale.getDefault());
                if (r == TextToSpeech.LANG_MISSING_DATA || r == TextToSpeech.LANG_NOT_SUPPORTED) tts.setLanguage(Locale.US);
                tts.setAudioAttributes(attrs);
                tts.setSpeechRate(1.05f);
                tts.setOnUtteranceProgressListener(new UtteranceProgressListener() {
                    @Override public void onStart(String id) { }
                    @Override public void onDone(String id) { maybeRelease(); }
                    @Override public void onError(String id) { maybeRelease(); }
                });
                ready = true;
                for (String s : pending) speakNow(s, TextToSpeech.QUEUE_ADD);
                pending.clear();
            }
        });
    }

    void setEnabled(boolean on) { enabled = on; if (!on) stop(); }

    synchronized void say(String text) {
        if (!enabled || text == null || text.isEmpty()) return;
        if (!ready) { pending.add(text); return; }
        speakNow(text, TextToSpeech.QUEUE_ADD);
    }

    synchronized void sayNow(String text) {
        if (!enabled || text == null || text.isEmpty()) return;
        if (!ready) { pending.clear(); pending.add(text); return; }
        speakNow(text, TextToSpeech.QUEUE_FLUSH);
    }

    synchronized void stop() {
        pending.clear();
        if (tts != null && ready) tts.stop();
        am.abandonAudioFocusRequest(focus);
    }

    private void speakNow(String text, int mode) {
        am.requestAudioFocus(focus);
        tts.speak(text, mode, null, "u" + (++seq));
    }

    private void maybeRelease() {
        if (tts != null && !tts.isSpeaking()) am.abandonAudioFocusRequest(focus);
    }
}

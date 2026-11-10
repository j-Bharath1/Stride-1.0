package dev.stride.app;

import android.content.Context;

import java.io.File;
import java.io.FileOutputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;

/** App data as small JSON files in private storage. Writes are atomic (temp file + rename). */
final class Store {
    private Store() {}

    private static File file(Context c, String key) {
        String safe = key.replaceAll("[^A-Za-z0-9_\\-]", "_");
        File dir = new File(c.getFilesDir(), "data");
        if (!dir.exists()) dir.mkdirs();
        return new File(dir, safe + ".json");
    }

    /** The saved text, "" if nothing was ever saved, or null if the file exists but cannot be read. */
    static synchronized String load(Context c, String key) {
        File f = file(c, key);
        if (!f.exists()) return "";
        try {
            return new String(Files.readAllBytes(f.toPath()), StandardCharsets.UTF_8);
        } catch (Exception e) {
            return null;
        }
    }

    /**
     * Moves a damaged file aside so the next save cannot overwrite it, keeping it for recovery.
     * Returns true when nothing is left at the original path.
     */
    static synchronized boolean quarantine(Context c, String key) {
        File f = file(c, key);
        if (!f.exists()) return true;
        File aside = new File(f.getParentFile(), f.getName().replace(".json", "") + ".damaged-" + System.currentTimeMillis() + ".json");
        return f.renameTo(aside);
    }

    static synchronized boolean save(Context c, String key, String value) {
        File f = file(c, key);
        File tmp = new File(f.getPath() + ".tmp");
        try (FileOutputStream out = new FileOutputStream(tmp)) {
            out.write(value.getBytes(StandardCharsets.UTF_8));
            out.getFD().sync();
        } catch (Exception e) {
            return false;
        }
        return tmp.renameTo(f);
    }
}

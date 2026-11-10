package dev.stride.app;
import android.content.Context;
import java.io.File;
import java.nio.file.Files;
public class StoreTest {
    static void check(boolean ok, String what) { if (!ok) throw new AssertionError(what); System.out.println("pass  " + what); }
    public static void main(String[] a) throws Exception {
        File root = Files.createTempDirectory("store").toFile();
        Context c = new Context(root);
        check("".equals(Store.load(c, "entries")), "missing file loads as empty string");
        check(Store.save(c, "entries", "[1]"), "save succeeds");
        check("[1]".equals(Store.load(c, "entries")), "saved text loads back");
        File f = new File(root, "data/entries.json");
        f.delete(); f.mkdir(); // a directory where the file should be: exists but cannot be read
        check(Store.load(c, "entries") == null, "unreadable file loads as null, not empty");
        f.delete();
        Store.save(c, "entries", "broken{");
        check(Store.quarantine(c, "entries"), "quarantine succeeds");
        check(!f.exists(), "damaged file no longer at its path");
        File[] aside = new File(root, "data").listFiles((d, n) -> n.startsWith("entries.damaged-") && n.endsWith(".json"));
        check(aside.length == 1 && "broken{".equals(new String(Files.readAllBytes(aside[0].toPath()))), "damaged contents kept aside");
        check("".equals(Store.load(c, "entries")), "after quarantine the key loads as never saved");
        check(Store.quarantine(c, "goals"), "quarantine of a missing file is a no-op success");
        System.out.println("all Store checks passed");
    }
}

package android.content;
public class Context {
    private final java.io.File dir;
    public Context(java.io.File dir) { this.dir = dir; }
    public java.io.File getFilesDir() { return dir; }
}

package com.yasser.musicplayer;

import android.Manifest;
import android.content.Intent;
import android.database.Cursor;
import android.os.Build;
import android.provider.MediaStore;

import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.getcapacitor.PluginMethod;

@CapacitorPlugin(
    name = "MusicScanner",
    permissions = {
        @Permission(alias = "media", strings = { Manifest.permission.READ_MEDIA_AUDIO }),
        @Permission(alias = "storage", strings = { Manifest.permission.READ_EXTERNAL_STORAGE }),
        @Permission(alias = "notif", strings = { Manifest.permission.POST_NOTIFICATIONS })
    }
)
public class MusicScannerPlugin extends Plugin {

    static MusicScannerPlugin inst;

    @Override
    public void load() {
        inst = this;
    }

    static void sendAction(String a) {
        if (inst != null) {
            JSObject o = new JSObject();
            o.put("action", a);
            inst.notifyListeners("mediaAction", o);
        }
    }

    @PluginMethod
    public void showNotification(PluginCall call) {
        Intent i = new Intent(getContext(), MusicService.class).setAction("UPDATE")
                .putExtra("title", call.getString("title", ""))
                .putExtra("artist", call.getString("artist", ""))
                .putExtra("playing", call.getBoolean("playing", false));
        try {
            if (MusicService.running || Build.VERSION.SDK_INT < 26) {
                getContext().startService(i);
            } else {
                getContext().startForegroundService(i);
            }
            call.resolve();
        } catch (Exception e) {
            call.reject("notif failed: " + e.getMessage());
        }
    }

    @PluginMethod
    public void hideNotification(PluginCall call) {
        try {
            getContext().startService(new Intent(getContext(), MusicService.class).setAction("HIDE"));
        } catch (Exception e) { }
        call.resolve();
    }

    @PluginMethod
    public void askNotif(PluginCall call) {
        if (Build.VERSION.SDK_INT < 33 || getPermissionState("notif") == PermissionState.GRANTED) {
            call.resolve();
            return;
        }
        requestPermissionForAlias("notif", call, "notifCb");
    }

    @PermissionCallback
    private void notifCb(PluginCall call) {
        call.resolve();
    }

    private String permAlias() {
        return Build.VERSION.SDK_INT >= 33 ? "media" : "storage";
    }

    @PluginMethod
    public void scan(PluginCall call) {
        if (getPermissionState(permAlias()) != PermissionState.GRANTED) {
            requestPermissionForAlias(permAlias(), call, "permCallback");
            return;
        }
        doScan(call);
    }

    @PermissionCallback
    private void permCallback(PluginCall call) {
        if (getPermissionState(permAlias()) == PermissionState.GRANTED) {
            doScan(call);
        } else {
            call.reject("denied");
        }
    }

    private void doScan(PluginCall call) {
        JSArray songs = new JSArray();
        String[] cols = {
            MediaStore.Audio.Media.TITLE,
            MediaStore.Audio.Media.ARTIST,
            MediaStore.Audio.Media.DATA
        };
        try (Cursor c = getContext().getContentResolver().query(
                MediaStore.Audio.Media.EXTERNAL_CONTENT_URI, cols,
                MediaStore.Audio.Media.IS_MUSIC + " != 0", null, null)) {
            if (c != null) {
                while (c.moveToNext()) {
                    JSObject s = new JSObject();
                    s.put("title", c.getString(0));
                    s.put("artist", c.getString(1));
                    s.put("path", c.getString(2));
                    songs.put(s);
                }
            }
        } catch (Exception e) {
            call.reject("scan failed: " + e.getMessage());
            return;
        }
        JSObject ret = new JSObject();
        ret.put("songs", songs);
        call.resolve(ret);
    }
}

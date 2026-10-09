package com.yasser.musicplayer;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.pm.ServiceInfo;
import android.media.AudioManager;
import android.media.MediaMetadata;
import android.media.session.MediaSession;
import android.media.session.PlaybackState;
import android.os.Build;
import android.os.Handler;
import android.os.IBinder;
import android.os.Looper;
import android.os.PowerManager;

public class MusicService extends Service {
    static final String CH = "music_playback";
    static final int NID = 7;
    static boolean running = false;

    private MediaSession session;
    private PowerManager.WakeLock wl;
    private BroadcastReceiver noisy;
    private final Handler h = new Handler(Looper.getMainLooper());
    private String title = "", artist = "";
    private boolean playing = false, pausedByCall = false;

    private final Runnable callCheck = new Runnable() {
        @Override
        public void run() {
            try {
                AudioManager am = (AudioManager) getSystemService(Context.AUDIO_SERVICE);
                int m = am.getMode();
                boolean busy = m == AudioManager.MODE_RINGTONE
                        || m == AudioManager.MODE_IN_CALL
                        || m == AudioManager.MODE_IN_COMMUNICATION;
                if (busy && playing && !pausedByCall) {
                    pausedByCall = true;
                    act("pause");
                } else if (!busy && pausedByCall) {
                    pausedByCall = false;
                    act("play");
                }
            } catch (Exception e) { }
            h.postDelayed(this, 1500);
        }
    };

    @Override
    public void onCreate() {
        super.onCreate();
        running = true;
        if (Build.VERSION.SDK_INT >= 26) {
            NotificationChannel c = new NotificationChannel(CH, "تشغيل الموسيقى", NotificationManager.IMPORTANCE_LOW);
            ((NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE)).createNotificationChannel(c);
        }
        session = new MediaSession(this, "yasser-music");
        session.setCallback(new MediaSession.Callback() {
            @Override public void onPlay() { act("play"); }
            @Override public void onPause() { act("pause"); }
            @Override public void onSkipToNext() { act("next"); }
            @Override public void onSkipToPrevious() { act("prev"); }
        });
        session.setActive(true);
        try {
            PowerManager pm = (PowerManager) getSystemService(Context.POWER_SERVICE);
            wl = pm.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "yasser:music");
            wl.setReferenceCounted(false);
            wl.acquire(6 * 60 * 60 * 1000L);
        } catch (Exception e) { }
        h.postDelayed(callCheck, 1500);
        try {
            noisy = new BroadcastReceiver() {
                @Override
                public void onReceive(Context c, Intent i) {
                    if (playing) act("pause");
                }
            };
            IntentFilter f = new IntentFilter(AudioManager.ACTION_AUDIO_BECOMING_NOISY);
            if (Build.VERSION.SDK_INT >= 33) {
                registerReceiver(noisy, f, Context.RECEIVER_NOT_EXPORTED);
            } else {
                registerReceiver(noisy, f);
            }
        } catch (Exception e) { }
    }

    private void act(String a) {
        if (a.equals("play")) playing = true;
        if (a.equals("pause")) playing = false;
        show();
        MusicScannerPlugin.sendAction(a);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        String a = intent == null ? null : intent.getAction();
        if ("UPDATE".equals(a)) {
            title = intent.getStringExtra("title");
            artist = intent.getStringExtra("artist");
            playing = intent.getBooleanExtra("playing", false);
            show();
        } else if ("HIDE".equals(a)) {
            stopForeground(true);
            stopSelf();
        } else if ("PLAY".equals(a)) {
            act("play");
        } else if ("PAUSE".equals(a)) {
            act("pause");
        } else if ("NEXT".equals(a)) {
            act("next");
        } else if ("PREV".equals(a)) {
            act("prev");
        }
        return START_NOT_STICKY;
    }

    private PendingIntent pi(String a) {
        Intent i = new Intent(this, MusicService.class).setAction(a);
        return PendingIntent.getService(this, a.hashCode(), i,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE);
    }

    private void show() {
        try {
            session.setPlaybackState(new PlaybackState.Builder()
                    .setActions(PlaybackState.ACTION_PLAY | PlaybackState.ACTION_PAUSE
                            | PlaybackState.ACTION_PLAY_PAUSE | PlaybackState.ACTION_SKIP_TO_NEXT
                            | PlaybackState.ACTION_SKIP_TO_PREVIOUS)
                    .setState(playing ? PlaybackState.STATE_PLAYING : PlaybackState.STATE_PAUSED,
                            PlaybackState.PLAYBACK_POSITION_UNKNOWN, 1f)
                    .build());
            session.setMetadata(new MediaMetadata.Builder()
                    .putString(MediaMetadata.METADATA_KEY_TITLE, title)
                    .putString(MediaMetadata.METADATA_KEY_ARTIST, artist)
                    .build());

            Notification.Builder b = Build.VERSION.SDK_INT >= 26
                    ? new Notification.Builder(this, CH) : new Notification.Builder(this);
            Intent open = getPackageManager().getLaunchIntentForPackage(getPackageName());
            b.setSmallIcon(android.R.drawable.ic_media_play)
                    .setContentTitle(title)
                    .setContentText(artist)
                    .setOnlyAlertOnce(true)
                    .setVisibility(Notification.VISIBILITY_PUBLIC)
                    .addAction(new Notification.Action.Builder(android.R.drawable.ic_media_previous, "السابق", pi("PREV")).build())
                    .addAction(playing
                            ? new Notification.Action.Builder(android.R.drawable.ic_media_pause, "إيقاف", pi("PAUSE")).build()
                            : new Notification.Action.Builder(android.R.drawable.ic_media_play, "تشغيل", pi("PLAY")).build())
                    .addAction(new Notification.Action.Builder(android.R.drawable.ic_media_next, "التالي", pi("NEXT")).build())
                    .setStyle(new Notification.MediaStyle()
                            .setMediaSession(session.getSessionToken())
                            .setShowActionsInCompactView(0, 1, 2));
            if (open != null) {
                b.setContentIntent(PendingIntent.getActivity(this, 0, open,
                        PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE));
            }
            Notification n = b.build();
            if (Build.VERSION.SDK_INT >= 29) {
                startForeground(NID, n, ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK);
            } else {
                startForeground(NID, n);
            }
            if (!playing) {
                stopForeground(false);
            }
        } catch (Exception e) { }
    }

    @Override
    public void onDestroy() {
        running = false;
        h.removeCallbacks(callCheck);
        try { if (noisy != null) unregisterReceiver(noisy); } catch (Exception e) { }
        try { session.release(); } catch (Exception e) { }
        try { if (wl != null && wl.isHeld()) wl.release(); } catch (Exception e) { }
        super.onDestroy();
    }

    @Override
    public IBinder onBind(Intent intent) { return null; }
}

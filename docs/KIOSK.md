# Tazama on Android TV boxes (X96 Mini — kiosk mode)

This guide sets up an X96 Mini (Android 9, Chrome 119) as an always-on Tazama
music screen for a restaurant / hotel / club.

The box is a **thin client**: it runs a fullscreen browser pointed at the
remotely-hosted app. Nothing is installed except the browser.

---

## 1. The kiosk URL — `/player/<slug>`

Point the box at the lightweight player route, **not** the marketing landing or
the dashboard:

```
https://<your-host>/player/<slug>
```

`<slug>` picks one of two modes:

| Slug | Mode | Plays |
| --- | --- | --- |
| a **public room** slug (e.g. `monday-funday`) | **Synced video** | mirrors that room's host in real time and shows the music **video** full-screen — perfect for a venue running its own room/DJ |
| `afrobeats`, `amapiano`, `jazz`, `mix`, … | **Jukebox** | a standalone audio mix for that genre (or `mix` for everything); see `lib/genres.ts` |
| anything else | Jukebox | falls back to the broad mix — it never dead-ends |

**Synced video mode** (room slug): the screen joins the room as a silent,
presence-less follower over Supabase Realtime. Whatever the host plays, seeks,
pauses or skips, this screen follows within ~1–2s (latency-compensated, hard-
seeking only past 1.5s of drift). The TV shows only the music video. The local
**pause / mute / volume** controls affect *this screen only* — never the host or
other screens. Pausing stops following; pressing play re-syncs to the host's
current position. Private rooms are **not** exposed here (they fall back to the
mix), so only intentionally-public rooms appear on screens.

Why this route and not `/`:

- **No dashboard chrome, no framer-motion** — only a tiny client island, so it
  loads fast on a weak CPU.
- **No login** — it's public; `proxy.ts` skips Supabase entirely for `/player/*`.
- Reads no cookies and is briefly cached, so reboots are near-instant; the live
  sync runs client-side over Realtime.

## 2. How playback works (and why it's reliable)

Chrome blocks **unmuted** autoplay without a user gesture, and a freshly-booted
box has a Media Engagement Index of 0 (no autoplay grace). So the player:

1. Builds the YouTube player and gets it **ready while muted** on load — in
   synced-video mode the video is already playing (muted, in step with the host)
   behind the overlay; in jukebox mode it's cued.
2. Shows a fullscreen overlay — **"Tap for sound"** (synced video) or **"Tap to
   start the music"** (jukebox). The button waits until the player is ready, so
   the tap always lands on a ready player.
3. On the tap — or the remote's **OK** button (Enter) — it unmutes/plays
   **synchronously inside that gesture**, which the browser always permits.
4. After that it keeps going hands-free: jukebox auto-advances the shuffled
   queue; synced video follows the host's every move.

Remote keys: **OK** = play/pause (jukebox: also start), **▶▶ / →** = next,
**◀◀ / ←** = previous (jukebox), **↑ / ↓** = volume, **M** = mute (synced video).

**Resume after reboot:**
- *Synced video:* the box reloads the URL and re-joins the room — it requests a
  fresh sync and snaps back to whatever the host is playing. One OK-press for sound.
- *Jukebox:* the current track id is saved in `localStorage`; one OK-press resumes it.

For **zero-touch** sound on boot (no tap at all), use the autoplay launch flag in §3b.

## 3. Choose a kiosk launcher

### 3a. Fully Kiosk Browser (easiest, recommended)

Install **Fully Kiosk Browser** from the Play Store, then in its settings:

- **Start URL**: `https://<your-host>/player/<slug>`
- **Web Content Settings → Enable Autoplay**: `ON`
- **Web Content Settings → Enable Web Audio / Media Playback**: `ON`
- **Web Zoom / Desktop Mode**: leave default (the page is responsive)
- **Device Management → Keep Screen On**: `ON`
- **Device Management → Launch on Boot**: `ON`
- **Device Management → Restart on Crash / Reload on idle**: `ON` (optional)
- **Advanced Web → Autoplay Audio/Video without user gesture**: `ON` if present

With autoplay enabled, Fully often satisfies the gesture itself, so playback can
start with no tap. If it doesn't on a given firmware, the on-screen overlay is
the fallback — one OK-press starts it.

### 3b. Plain Chrome / a WebView wrapper (zero-touch)

If you launch Chrome yourself (e.g. via a launcher app or `am start`), pass:

```
--kiosk
--autoplay-policy=no-user-gesture-required
--disable-pinch
--start-fullscreen
```

`--autoplay-policy=no-user-gesture-required` makes Tazama start unmuted on load
with **no tap at all**. Example intent:

```sh
am start -n com.android.chrome/com.google.android.apps.chrome.Main \
  -a android.intent.action.VIEW \
  -d "https://<your-host>/player/afrobeats"
# (with the flags applied via a chrome-command-line file on rooted boxes)
```

### 3c. Auto-start on boot (Android)

- **Fully Kiosk**: just toggle *Launch on Boot* (§3a).
- **Custom app/launcher**: register a `BOOT_COMPLETED` receiver that starts your
  kiosk activity with the URL above. Keep the box's "Autostart"/"Startup app"
  setting pointed at it.

## 4. Box settings that matter

- **Set the clock / enable network time (NTP).** TV boxes often boot with a
  wrong date. Tazama itself is fine (no login on `/player`), but a wildly wrong
  clock breaks **HTTPS** (certificate "not yet valid") — then nothing loads.
  Enable *Settings → Date & time → Automatic*.
- **Disable screensaver / sleep / Daydream** (or rely on the launcher's
  keep-awake). The player also requests a screen **Wake Lock** while playing.
- **Disable system update popups** and other overlays that can steal focus.
- Prefer **Ethernet** over Wi-Fi for a stable stream.

## 5. Quick test checklist

1. Open `https://<your-host>/player/mix` on the box's browser.
2. Confirm the page loads fast and shows album art + "Tap to start".
3. Press the remote **OK** → music plays with sound.
4. Reboot the box → it returns to the screen; one OK-press resumes.
5. Leave it for 30+ min → it keeps advancing tracks without intervention.

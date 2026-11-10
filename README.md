# STRIDE — personal running, training & diary app (Android, offline)

## Install
Copy `STRIDE.apk` to your phone and open it (allow "Install unknown apps").
First launch: allow notifications; allow location the first time you start a run.
On Xiaomi / Vivo / Oppo / Samsung set battery usage to **Unrestricted** so runs and alerts aren't killed.

## New in 6.0
- The Run module is gone: GPS tracking, maps, run plans, guided runs and the live run screen.
  RunService, RunTracker, run.js, maps.js and the Leaflet library are deleted, and the app no
  longer asks for location or internet permission at all.
- You can still log a run by hand in the diary (type, distance, time), and distance still counts
  towards Progress, monthly goals and badges.
- All animation removed: the exercise demo is a single still picture, and page, sheet, toast,
  progress-bar, ring and switch transitions are gone. No CSS animations remain.
- Personal records now come from the diary (longest distance, longest session, most push-ups in
  a day, biggest week, best streak) instead of GPS splits.

## New in 5.4
- The exercise demo cross-fades between that move's own pictures, so it reads as motion again
  while still being plain bundled images (no 3D, no video).
- Back on Home warns once ("Press back again to exit") and leaves on a second press, so an
  accidental tap can't close the app but Back still behaves the way Android expects.

## New in 5.3
- Real exercise photos. 67 of the 97 moves now show photographs of a person performing the
  exercise, from the free-exercise-db open dataset (public domain / Unlicense).
- The remaining 30 moves (jumping jacks, burpees, yoga poses, clamshells, bird dog, hollow
  hold and similar) have no honest match in the dataset, so they keep STRIDE's own
  illustrations rather than showing a photo of the wrong exercise.
- Every mapping was reviewed by eye; skaters, calf raises and step-ups were reverted to
  illustrations because the dataset photos showed the wrong movement or were too dark.
- Player layout fits the photo's aspect, with the controls pinned to the bottom.

## New in 5.2
- Exercise demos are now still pictures instead of live 3D. Every move ships a pre-rendered
  picture per key position (173 images, 1.3 MB total) showing the pose with its worked muscles
  in red on a clean white card.
- The three.js runtime (608 KB) and the live renderer are gone, so the app is smaller, starts
  faster and uses no GPU during workouts.
- Pictures are generated from the same 3D model by tools/render (see v5.1 source for the
  renderer); re-run it to regenerate after changing a pose.

## New in 5.1
- Home gets a coach card that opens Training (image compressed 1.9 MB PNG -> 26 KB WebP).
- Fixed: in anatomy mode the left shin, shorts and shoe still used the old clothed-figure
  materials, so one leg rendered tan while the rest of the body was pale.

## New in 5.0
- Exercise demos redrawn in an anatomy style: white card, pale 3D body, and the muscles each
  move works highlighted in red (chest, delts, biceps, triceps, lats, abs, obliques, glutes,
  quads, hamstrings, calves, hip flexors). The camera swings behind the model when the worked
  muscles are on the back. All shapes are original — nothing is copied from another app.
- Fixed: the back button closed the app instead of going back. Targeting SDK 35 means Android 15
  enables predictive back by default and stops calling onBackPressed(), so the system was just
  finishing the activity. The app now registers an OnBackInvokedCallback on API 33+ and keeps
  onBackPressed for older devices.

## New in 4.1
- Map tiles fall back from CARTO to OpenStreetMap if the primary tile host fails, so the map
  still draws on restricted networks (attribution switches to OSM-only when it does).
- Backup restore validates the whole file and every data shape before touching stored records,
  so a malformed or partial file can never half-restore your diary. Older backups that predate
  newer keys (gym, program, routines) still restore, and settings merge with current defaults.
- 3D renderer: warmer fill light, stronger rim light, softer materials, and a lighter GPU load
  (pixel ratio capped at 1.6, 768px shadow map) for mid-range Android phones.
- Fixed: the shared 3D canvas could be sized past its container and swallow taps meant for the
  player's Next / Pause controls. The canvas is now CSS-sized and ignores pointer events.

## New in 2.0
- White theme; Home with app icons: Run Club, Training, Gym, Evil Russian, Log, Progress
- Animated how-to demo + step-by-step instructions for all 88 moves
- 33 workouts with filters, 5 multi-week programs, moves library, custom workouts
- Gym: 8 routines (Push/Pull/Legs, Upper/Lower, 5×5, Full body), set/kg/reps logger,
  rest timer, previous-session values, PRs and strength progress charts
- Street maps (OpenStreetMap via CARTO) on the Run tab, live run map view, and
  pace-coloured routes in summaries. Maps need internet; GPS tracking itself doesn't.

## What's inside
- **Run** — GPS distance, pace, splits and route (works offline, screen off). Voice coach every km
  (or 0.5/2 km), goal runs (distance/time), guided runs (intervals, fartlek, hills, tempo, run/walk),
  music controls for whatever app is playing (music dips while the coach talks), hold-to-finish,
  summary with splits, effort and notes.
- **Plans** — Get Started (4 wk), 5K (8), 10K (8), Half (12), Marathon (18). Start this week, next
  Monday, or count back from a race date. Each day's session is voice-coached step by step.
- **Train** — 11 guided workouts with timer, beeps and voice cues, plus your own custom workouts.
  Challenges: Evil Russian (with interval alarms), 100 push-ups/day, 50 squats/day, 1,000-push-up
  week, custom. Count reps by tapping, or with the phone's proximity sensor under your chest.
- **Log (diary)** — modelled on your Market_2025 diary: monthly Goals ↔ Results, Monday-first
  calendar with emojis + a short note in each box (weekends in red), a full-screen writer for
  detailed notes (long-press a day or tap "Write in detail"), Week, Day and Journal views.
  Runs, workouts and challenge sets log themselves.
- **Progress** — distance / time / push-ups / sessions over 30 days, 12 weeks or 12 months, pace
  trend, activity mix, personal records (fastest 1K/5K/10K/half, longest run…), club badges.
- **Backup** — Profile → Back up / Restore (JSON file you can keep on Drive).

## Build from source
Android Studio (Ladybug+) → open this folder → Run. Or push to GitHub: the included
workflow builds `Stride-apk` under Actions. App code: `app/src/main/java` (native: GPS service,
voice, alarms, sensors, storage) and `app/src/main/assets/www` (screens).

Credits: Evil Russian formula from The Modern Rogue; original calculator by Logan Schmidt (MIT).
Fonts Oswald and Inter (SIL OFL, licences in assets/fonts).

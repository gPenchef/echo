# ECHO — Temporal Chambers

A playable browser puzzle game about cooperating with your past selves. Record a route, reset the chamber, and coordinate with the Echo that repeats it. Seventeen chambers progress from your first pressure plate to large, multi-sector facilities with cargo transfers, scheduled gate openings, and a return-home finale.

![ECHO gameplay: cooperating with two Echoes in Interference](docs/gameplay.png)

## Run

Requires Node.js 20.13+ and npm.

```sh
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://127.0.0.1:5173`). Desktop keyboard and mouse are the primary controls. The game has no external asset or service dependencies.

Gameplay fits the browser viewport without page scrolling. The chamber keeps its aspect ratio, controls compact on smaller windows, and the timeline moves beside the chamber in short landscape windows. All twelve Echo tracks remain visible. Long menus can scroll inside their paused dialog.

```sh
npm test             # simulation regressions and all seventeen campaign solutions
npm run typecheck
npm run lint
npm run build        # production files in dist/
npm run preview      # serve the production build locally
npm run test:e2e     # isolated headless Google Chrome playtests
npm run test:production # build and smoke-test dist in isolated Chrome
```

The browser suite uses an installed Google Chrome via Playwright; it does not attach to your normal browser profile. Screenshots go to `.playtest/`, and failure traces to `test-results/`. To use Playwright's bundled Chromium instead, remove `channel: 'chrome'` from `playwright.config.ts` and run `npx playwright install chromium`.

## Controls

| Key                | Action                                                            |
| ------------------ | ----------------------------------------------------------------- |
| WASD / arrows      | Move; diagonal speed is normalized                                |
| Mouse / left click | Aim / fire                                                        |
| E                  | Activate a switch, pick up, or drop an object                     |
| Space              | Commit this attempt as an Echo and reset                          |
| R                  | Discard the current attempt and retry; preserve Echoes            |
| Shift + R          | Restart level (confirmation clears all Echoes and level counters) |
| F2                 | Open the cheat-code/testing panel                                 |
| Q                  | Remove the latest Echo and reset                                  |
| Tab                | Pause and inspect the full map, historical paths, and circuits    |
| Escape             | Pause menu, settings, controls, restart chamber, level selection  |

An early commit means **repeat the recorded route, then hold the final position**. The Echo remains physical and vulnerable while holding. Letting the timer expire also commits the attempt. A player death freezes the failed attempt with its cause visible; press R to retry without recording the death. Optional chamber hints are available in the sidebar and pause menu.

## What's playable

- Seventeen progressive chambers, including timed switches, remote shooting targets, cargo, lasers, shielded sentries, synchronization plates, and larger facilities. Interference teaches how moving a crate can change an Echo's fate.
- Variable world sizes, a clamped following camera, a live minimap showing Echoes/cargo/gates, and a paused full-facility overview. Original chambers retain their original scale and coordinates.
- Up to twelve Echoes, undo, full restart, planning paths, event markers, stable/desynced/conflicted/lost status, and contextual interaction prompts.
- Local progression and best scores, master volume, ambient sound, reduced motion, Echo trails, and higher contrast.
- Procedural visuals and Web Audio effects. Sound is optional; mechanics also communicate through shapes, labels, and state changes.

## Beyond the original chambers

Three larger facilities unlock after Cascade; existing saved progress is preserved:

- **The Concourse (1600 × 960):** split your history between distant north and south relays, open the archive, and carry its core around the eastern partition.
- **Dead Letter (1200 × 1600):** a tall dispatch facility split by sealed bulkheads. Record a courier that transports cargo through paired transfer pads, drops its delivery, and then powers the rooftop gate.
- **Switchyard (1920 × 960):** one Echo operates two distant 2.5-second gates at different times. Record a dispatch schedule, then deliver freight through both appointments.

In large chambers, the camera follows you without zooming out during movement. Click the minimap or press Tab to inspect the entire facility with time paused. Gold is you/cargo, cyan is Echoes and relays, white marks extraction; the outlined rectangle is the current camera view. Transfer links are shown on both maps.

The campaign continues with **Ballast (1440 × 960)**, where one courier Echo delivers two crates before holding a third relay; **Crossfire (1600 × 960)**, a two-Echo laser crossing and shielded-sentry encounter; and **Homecoming (1920 × 1280)**, a remote core retrieval that finishes by reuniting with an Echo at the origin.

## Restart and cheat codes

The **Restart level** button is always available in the gameplay toolbar. It pauses for confirmation, then clears all Echoes, world changes, and current-level counters. Cancelling preserves the exact paused/planning state. Saved progress is never erased by a level restart. R still retries only the current loop.

Press **F2**, or choose **Cheat codes** from a menu. Type a code and press Enter, or click its button. Codes work in normal production builds and are case-insensitive; no developer URL is needed.

| Code      | Effect                                                                           |
| --------- | -------------------------------------------------------------------------------- |
| `UNLOCK`  | Unlock all chambers for this browser visit without awarding completions.         |
| `WARP 17` | Jump to a numbered chamber (1–17).                                               |
| `NEXT`    | Skip to the next chamber without completing the current one.                     |
| `GOD`     | Toggle invulnerability for the player and all Echoes.                            |
| `NOCLIP`  | Toggle passage through walls, doors, and crates; world edges still apply.        |
| `POWER`   | Toggle all circuits on and all lasers off.                                       |
| `SLOW`    | Toggle half-speed simulation for movement, replay, timers, and hazards together. |
| `NORMAL`  | Disable gameplay cheats and restart the current level with clean history.        |

Gameplay cheats mark a run **TEST RUN · NOT SAVED**, even if toggled off later. Such runs cannot award completions or overwrite best scores. Cheats survive loop retry/commit and level restart, but are not persisted across page reloads. NORMAL restores score-eligible play; the separate visit-only chamber unlock remains available. Unlocking or jumping alone does not invalidate a genuinely solved, unassisted run.

## How timelines work

`src/core/world.ts` is a renderer-independent, fixed 60 Hz simulation. Each recording stores movement/aim intent per simulation tick, discrete actions with stable target IDs, positional checkpoints at 10 Hz, duration, loop number, and end status. Echoes consume actions once in recorded order and move through current collision geometry. They never teleport to correct replay drift.

World changes have consequences: a closed door can block an Echo; a stolen object makes its pickup fail; a dead Echo cancels its remaining actions and releases its cargo. Desync compares the actual route with historical checkpoints using a tolerance and hysteresis. Crates can hold plates, block projectiles when placed, and shield actors downstream of a laser.

Every reset constructs a fresh `World` from the level definition. Only committed runs survive. Projectiles, health, signals, object ownership, cooldowns, hazard phase, action cursors, and elapsed ticks are reconstructed together. Closing doors wait for their footprint to clear. Actors overlap one another to avoid accidental body-blocking of recordings.

`FixedClock` converts render time into simulation ticks. Pausing clears fractional accumulated time. A long frame advances at most six ticks, slowing wall-clock progress rather than skipping gameplay events. Tests compare recordings across 30/60/144 Hz rendering.

## Structure and level authoring

- `src/core/`: typed simulation, collision geometry, session/reset lifecycle, fixed clock.
- `src/levels/campaign.ts`: level definitions and validation.
- `src/render.ts`: Phaser procedural rendering and bounded effects.
- `src/main.ts`: input, scene update, menus, HUD, and progression.
- `src/view.ts`: presentation-only camera bounds, overview fit, and pointer-to-world conversion.
- `src/audio.ts`, `src/persistence.ts`: local audio and validated saves.
- `tests/`: replay, reset, hazard, timing, persistence, and real-input campaign solution tests.
- `e2e/`: actual browser controls, menus, rendering, and campaign integration.

To add a chamber, use `Level` in `src/core/types.ts` and the `point`/`wall` helpers. Each level declares `width` and `height` in logical pixels on a 40-pixel grid; the level factory defaults to 960 × 560. Dimensions must be tile-aligned and between 320 and 3840 per axis. `perimeter(columns, rows)` constructs a correctly sized border. Optional `regions` add named floor sectors. Collision, validation, drawing, minimap, and camera bounds all use the level dimensions. The canvas remains a 960 × 560 logical viewing window, so larger worlds do not enlarge the page or shrink movement to unreadable dots.

Plates and switches publish named signals; doors, lasers, shields, and extraction reference those IDs. Door signal arrays use AND logic. Timed switches retrigger their timer; switches without a duration latch on until reset. Lasers emit downward or rightward and can optionally pulse. Paired teleporters transfer both actors and held cargo, and replay remains in world coordinates independently of the camera.

Add a real-input solution to `tests/campaign.test.ts` and run it before considering a level ready. Those solutions use movement and actions, never teleport actors or force a door open. Check the room in the browser as well: `?debug` unlocks chamber selection and exposes development instrumentation. Instrumentation is omitted from production builds.

Progress uses `echo-save-v1` in local storage. Corrupted or unavailable storage falls back safely. Active mid-chamber timelines are intentionally not saved across reloads. Resetting saved progress requires confirmation in Settings.

The original design brief remains in [ECHO_SPEC.md](ECHO_SPEC.md). See [DEVELOPMENT.md](DEVELOPMENT.md) for current scope and next improvements.

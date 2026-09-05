# ECHO: Build a Complete Time-Loop Action Puzzle Game

You are acting as the lead game designer, gameplay programmer, systems programmer, UI/UX designer, technical artist, level designer, QA engineer, and project owner for a new game called **ECHO**.

You have broad autonomy over this repository.

Your job is to build as much of a polished, genuinely fun, playable game as possible during the full available working session.

Do not treat this as a small prototype task.

Do not stop when the core mechanic technically works.

Continue working through gameplay, levels, polish, audiovisual feedback, architecture, testing, balancing, performance, bugs, menus, accessibility, quality-of-life features, and additional mechanics for as long as productive work remains.

Do not repeatedly ask me for approval.

When a design detail is unspecified, make a sensible decision yourself, implement it, evaluate it, and improve it if necessary.

The goal is that when I return to the repository, I can run the game immediately and think:

> "This is an actual game."

---

# 1. GAME CONCEPT

The game is called:

# ECHO

ECHO is a top-down 2D action-puzzle game built around repeating time loops.

The player enters a level.

A countdown begins.

The player has a limited amount of time to perform actions.

When the timer reaches zero, the world rewinds to its initial state and the player returns to the starting position.

However, the actions performed during the previous timeline are preserved.

During the next timeline, an **Echo** appears.

The Echo reproduces the player's previous run as precisely as possible.

If the player:

- walked somewhere,
- stopped,
- turned,
- fired a weapon,
- pressed a button,
- picked up an object,
- dropped an object,
- interacted with something,
- activated a switch,
- entered a trigger,
- died,
- or performed another relevant gameplay action,

the Echo should repeat those events at the same relative moments in the next loop.

After another reset, there are now two Echoes.

After another reset, there are three.

Eventually the player solves complicated situations by coordinating with several previous versions of themselves.

The player is therefore effectively programming a solution using their own previous actions.

---

# 2. THE CENTRAL DESIGN PRINCIPLE

Every major design decision should reinforce this idea:

## "Cooperate with your past selves."

The game should create situations where something impossible for one person becomes possible by coordinating across multiple timelines.

Example:

Loop 1:

The player holds Button A.

Loop 2:

Echo 1 holds Button A.

The current player passes through Door A and holds Button B.

Loop 3:

Echo 1 holds Button A.

Echo 2 passes Door A and holds Button B.

The current player reaches a previously inaccessible area.

Later levels should make these chains significantly more complicated.

The player should gradually begin thinking about the timeline like a programmer.

They should mentally reason:

- Echo 1 will arrive here at second 8.
- Echo 2 will shoot this enemy at second 12.
- I therefore have four seconds to cross this hallway.
- Echo 3 must survive long enough to activate this switch.
- I need to delay my current run by two seconds so the timing lines up.
- I accidentally caused Echo 2 to die, which breaks everything downstream.
- I need to rewrite one timeline without rebuilding the entire solution.

That mental experience is the heart of ECHO.

---

# 3. TECHNOLOGY

Unless there is a compelling repository-specific reason to choose otherwise, build this as a browser game using:

- TypeScript
- Vite
- Phaser 3

Use a clean project structure.

Prefer deterministic, understandable gameplay systems.

Avoid unnecessary frameworks.

Use npm for dependency management.

The game should run with something equivalent to:

```bash
npm install
npm run dev
```

Also provide:

```bash
npm run build
```

and appropriate testing/linting commands.

The production build should succeed before you consider the project healthy.

If the existing repository already establishes a reasonable technology stack, inspect it first and adapt rather than blindly replacing working infrastructure.

---

# 4. BEFORE IMPLEMENTING

First inspect the repository completely enough to understand:

- existing files,
- package manager,
- code structure,
- existing dependencies,
- project conventions,
- existing game code if any,
- build configuration,
- assets,
- README,
- tests,
- lint configuration.

Then form an internal implementation plan.

Do not spend the session writing planning documents instead of building.

Begin implementation promptly.

Keep a lightweight TODO/backlog in the repository if useful.

Continuously update it as work progresses.

---

# 5. CORE PLAYER CONTROLS

The default controls should feel immediate and responsive.

Suggested controls:

## Movement

WASD

and optionally arrow keys.

Movement should normalize diagonals so diagonal movement is not faster.

Movement needs:

- acceleration or sufficiently smooth immediate movement,
- collision,
- sensible speed,
- responsive stopping,
- consistent behavior between frame rates.

## Aim

Mouse position.

The player should visually face or indicate aim direction.

## Shoot

Left mouse button.

## Interact

E.

## Pick up/drop object

E or context-sensitive interaction.

## Restart current loop early

R.

## Pause

Escape.

Make controls discoverable in-game.

Do not require the player to read the README to understand basic controls.

---

# 6. TIME LOOP SYSTEM

This is the most important technical system.

Implement it robustly.

A level has a configurable loop duration.

Examples:

- tutorial: 20 seconds
- simple levels: 25-30 seconds
- larger levels: 30-45 seconds

The HUD must clearly show remaining time.

When the timer reaches zero:

1. freeze or transition briefly,
2. communicate that the loop has ended,
3. restore the level to its initial state,
4. respawn the current player,
5. spawn/recreate all valid previous Echoes,
6. begin the next loop.

The transition should feel intentional rather than like a page refresh.

Consider effects such as:

- slight screen flash,
- desaturation,
- rewind lines,
- particles,
- short time distortion,
- sound cue,
- brief countdown.

Do not make the transition so long that repeated loops become annoying.

---

# 7. RECORDING PLAYER ACTIONS

Build a generalized timeline recording system.

Do not simply record raw position every frame if a cleaner architecture is possible.

The system should be accurate enough that Echoes consistently reproduce a previous run.

Possible recorded information includes:

- timestamps,
- positions,
- velocity,
- facing direction,
- movement input,
- shots,
- interactions,
- pickup events,
- drop events,
- button states,
- object manipulations,
- deaths,
- special actions.

Use whichever mixture of sampled state and discrete events produces reliable playback.

Think carefully about synchronization.

The system should behave consistently across varying frame rates.

Every recorded run should have:

- loop number,
- duration,
- movement timeline,
- event timeline,
- end status,
- metadata useful for debugging.

Design this so additional mechanics can later add recorded events without rewriting the entire replay system.

---

# 8. ECHO PLAYBACK

Echoes represent previous timelines.

They should:

- replay movement,
- replay aiming,
- replay shooting,
- replay interactions,
- carry objects when appropriate,
- trigger pressure plates,
- activate interactables,
- receive damage if the design calls for it,
- die when circumstances cause them to die,
- visually distinguish themselves from the current player.

Echoes must be visibly identifiable by timeline.

Potential visual style:

- semi-transparent cyan/white silhouette,
- slight temporal trail,
- subtle scan-line effect,
- timeline number above or near them when useful.

Avoid visual clutter when many Echoes exist.

Echoes should feel like temporal copies rather than ordinary NPCs.

---

# 9. CAUSALITY

This system is crucial.

The current world can differ from the historical world because previous Echoes interact with each other and with the player's new behavior.

Example:

During Loop 2, the player runs across a room safely.

During Loop 3, something causes Echo 2 to be shot before it reaches that room.

Echo 2 should die and therefore fail to perform later actions.

Do not simply make Echoes invulnerable recordings floating through reality.

Their physical state should matter.

This creates causal dependency between loops.

A previous timeline may become invalid because the conditions under which it originally occurred have changed.

That should be an intentional gameplay feature.

However, distinguish between:

### Recorded intent

What an Echo tries to do.

and

### Resulting state

What actually happens in the current simulation.

An Echo may attempt to walk through a doorway that is currently closed and therefore fail to reach its historical position.

Think carefully about how to prevent playback desynchronization from looking like a broken game.

Possible techniques:

- replay inputs rather than teleport positions,
- small correction forces when deviation is minor,
- avoid aggressive snapping,
- visualize major divergence,
- mark an Echo as "desynced" when appropriate.

Experiment and use the approach that produces the best gameplay.

---

# 10. TIMELINE DESYNC

Implement a concept of timeline divergence.

If an Echo differs substantially from its historical trajectory because the world changed, optionally communicate this.

Possible indicators:

- Echo flickers,
- outline changes,
- subtle glitch,
- timeline HUD warning,
- small "DESYNC" status.

Do not make minor collision differences constantly trigger warnings.

Use sensible tolerances.

A desynchronized Echo should continue attempting its recorded actions whenever possible.

---

# 11. LOOP MANAGEMENT

Players will eventually make mistakes.

Avoid forcing them to replay ten perfect loops because one early timeline was bad.

Create a thoughtful timeline-management system.

At minimum support:

- restarting the current loop,
- restarting the entire level.

Explore supporting:

- deleting the most recent Echo,
- rewinding to a previous timeline,
- retrying a particular loop,
- viewing timelines,
- locking successful timelines.

Be careful because editing history can create confusing causal states.

Choose mechanics that keep the game understandable.

A useful initial implementation could be:

## R

restart current attempt without committing it.

## Q or UI action

undo the last committed Echo.

## Full Reset

remove all Echoes and restart puzzle.

Clearly communicate these controls.

---

# 12. TIMELINE VISUALIZATION

Build a timeline UI.

It should show:

- current loop,
- previous Echoes,
- loop duration,
- current time,
- potentially major events.

Example:

```text
0s        10s        20s        30s
|----------|----------|----------|

E1   ─────●───────────────X
E2   ─────────●────●────────────
E3   ──●────────────────────────
YOU             ▲
```

Where markers could represent:

- interaction,
- shot,
- death,
- pickup,
- objective action.

Do not let this consume excessive screen space during gameplay.

A compact version can be always visible.

A more detailed version can appear when paused.

Timeline visualization could become one of ECHO's signature UI elements.

---

# 13. PRESSURE PLATES

Implement pressure plates.

They activate while:

- player,
- Echo,
- movable object,

is standing on them.

Pressure plates can control:

- doors,
- barriers,
- lasers,
- platforms,
- other mechanisms.

They should have clear:

- inactive visual state,
- active visual state,
- transition feedback.

Connections between plates and their targets should be understandable.

Potentially use environmental lines or matching symbols/colors.

Do not rely solely on color for accessibility.

---

# 14. SWITCHES

Implement interactive switches.

Switches may be:

- toggle switches,
- timed switches,
- one-way switches.

Use them carefully.

Their state should reset with the timeline unless explicitly designed otherwise.

Echoes should replay interactions with switches.

---

# 15. DOORS

Implement doors.

Doors can be:

- permanently open while signal active,
- toggle-based,
- timed,
- key-based,
- sequential.

Door animation should make state changes obvious.

Avoid collisions that trap the player unfairly inside a closing door.

---

# 16. LASERS

Implement laser hazards.

Lasers can:

- kill or damage the player,
- kill Echoes,
- be disabled by switches,
- pulse periodically,
- move in later levels.

Laser timing should be highly readable.

Provide visual anticipation when lasers cycle.

---

# 17. TURRETS

Implement enemy turrets.

Turrets should have:

- detection range,
- line-of-sight,
- aiming,
- readable wind-up,
- projectile or hitscan attack,
- cooldown,
- clear state transitions.

Prefer projectiles initially because they provide readable gameplay.

Turrets may target:

- current player,
- Echoes,
- nearest valid target.

Design levels where an Echo intentionally distracts a turret while the current player crosses.

That would strongly demonstrate the central mechanic.

---

# 18. SIMPLE ENEMIES

If time permits after core systems are reliable, implement at least one mobile enemy type.

Examples:

## Guard

- patrols,
- spots player/Echo,
- pursues,
- attacks.

## Drone

- flies/ignores certain obstacles,
- follows a predictable pattern.

Enemy behavior should be deterministic enough for time-loop planning.

Randomness must not destroy puzzle reproducibility.

If randomness is used, seed it deterministically per level/loop.

---

# 19. SHOOTING

Implement simple shooting.

Player and Echoes should be able to fire.

Use:

- mouse aim,
- clear projectile visuals,
- impact feedback,
- cooldown,
- optional limited ammunition depending on level design.

Shots must be recorded and replayed by Echoes.

Shooting should serve puzzles as well as combat.

Examples:

- shoot a target while another Echo opens a line of sight,
- destroy a temporary obstruction,
- kill an enemy before another Echo reaches it,
- trigger distant mechanisms.

Avoid turning the game into a generic shooter.

Time coordination remains the focus.

---

# 20. DEATH

The player can die.

When the current player dies:

choose a good design.

Possibilities:

- immediately restart current loop without saving it,
- allow player to watch remaining Echo timeline,
- give a short retry prompt.

Default recommendation:

If the current player dies, briefly communicate death and restart the current loop without committing the failed attempt unless committing deaths is explicitly relevant to a puzzle mechanic.

Echoes, however, may die during playback.

An Echo dying should prevent its later actions from happening.

This can intentionally break the temporal plan.

---

# 21. MOVABLE OBJECTS

Implement crates or equivalent physics-light movable objects.

Prefer deterministic movement over chaotic physics.

The player should be able to:

- pick up,
- carry,
- drop,

or push them.

Echo interactions with objects must work sensibly.

Objects can:

- hold pressure plates,
- block lasers,
- block projectiles,
- create cover,
- alter paths.

World objects reset when the timeline resets.

---

# 22. KEYS / ENERGY CORES

Add a carryable objective object.

For example an "Energy Core."

A player or Echo can carry it.

The object can be needed to:

- power a socket,
- unlock a door,
- finish a level,
- activate machinery.

This creates useful temporal puzzles where:

- Echo 1 retrieves the core,
- Echo 2 opens a path,
- current player receives or uses it.

If direct handoff between timelines is mechanically confusing, design levels where the object is placed somewhere for another timeline participant to use within the same simultaneous loop.

---

# 23. TELEPORTERS

Once the replay system is stable, add paired teleporters.

They should preserve:

- actor state,
- direction where sensible,
- carried object.

Echoes must replay through them reliably.

Use clear entrance/exit pairing.

---

# 24. MOVING PLATFORMS

Optional later mechanic.

Implement deterministic moving platforms.

Use predictable timing.

They can be:

- automatically cycling,
- switch-controlled.

Actors should ride them reliably without jitter.

Do not prioritize this over stable core gameplay.

---

# 25. CONVEYORS

Optional mechanic.

Conveyors move:

- player,
- Echoes,
- objects.

They should create interesting timing challenges without being frustrating.

---

# 26. TEMPORAL GATES

Introduce an ECHO-specific mechanic.

A Temporal Gate may permit:

- current player only,
- Echoes only,
- specific Echo index,
- actors from a certain timeline range.

Represent the rule clearly.

Example:

A cyan gate allows Echoes through but blocks the current self.

This enables unusual puzzle structures.

---

# 27. ECHO-SPECIFIC PRESSURE SYSTEM

Consider switches requiring a particular number of simultaneous bodies.

Examples:

- 2-person plate,
- 3-person synchronization chamber.

Display the number clearly.

This directly encourages multi-loop planning.

---

# 28. SYNCHRONIZED ACTIONS

Create mechanics requiring actions within a short timing window.

Example:

Two switches must be activated within one second of each other.

This makes timing important rather than merely accumulating Echoes.

Use visual feedback to communicate synchronization progress.

---

# 29. OBJECTIVE SYSTEM

Each level should have a clear objective.

The simplest objective:

Reach the exit.

Later objectives may involve:

- carrying an Energy Core to the exit,
- destroying a target,
- activating several nodes,
- rescuing something,
- synchronizing switches.

The player should always be able to understand what constitutes success.

---

# 30. LEVEL COMPLETION

When the objective is satisfied:

- freeze dangerous gameplay,
- provide satisfying feedback,
- show completion screen,
- show loops used,
- show optional performance metrics,
- allow next level,
- allow replay.

Potential metrics:

- loops used,
- deaths,
- time of final solution,
- number of Echoes surviving,
- optional "par" loop count.

Do not make scoring mandatory for enjoying the game.

---

# 31. LEVEL SELECT

Create a level selection screen.

Show:

- level number,
- level name,
- completion state,
- best loop count,
- par if implemented.

Lock later levels initially if progression works properly, or keep all levels available during development through a debug option.

Persist progression locally.

---

# 32. MAIN MENU

Create a polished but simple main menu.

At minimum:

- Play
- Level Select
- How to Play
- Settings
- Credits/about if useful

The menu should visually establish the time-loop aesthetic.

---

# 33. PAUSE MENU

Escape opens pause.

Include:

- Resume
- Restart Loop
- Restart Level
- Controls
- Settings
- Exit to Level Select/Menu

Gameplay time must actually pause.

---

# 34. SETTINGS

Implement useful settings rather than fake toggles.

Candidates:

- master volume,
- music volume,
- SFX volume,
- screen shake,
- reduced motion,
- Echo trails,
- high contrast,
- show detailed timeline,
- aim sensitivity if relevant.

Persist settings.

---

# 35. ACCESSIBILITY

Make reasonable accessibility improvements.

Support:

- keyboard controls,
- readable fonts,
- strong contrast,
- non-color-only state indicators,
- reduced motion option,
- screen shake toggle,
- sufficient UI scaling,
- clear visual hazard telegraphing.

Do not let accessibility work destroy development momentum, but avoid obvious bad practices.

---

# 36. ART DIRECTION

Do not block progress waiting for external art.

Use a clean procedural/vector style.

Suggested visual direction:

## Environment

Dark technological facility.

Colors should be restrained.

Think:

- charcoal backgrounds,
- dark gray floors,
- luminous machinery,
- thin geometric outlines.

## Current player

Warm/bright distinct color.

## Echoes

Cool temporal color.

## Hazards

Clear warning colors.

## Interactive machinery

Strong readable symbols.

Use shapes, gradients, particles, lines, and simple generated textures.

The game should look cohesive even without bespoke art assets.

Avoid programmer-art chaos where every object uses arbitrary colors.

Create a small visual language and use it consistently.

---

# 37. PARTICLES

Use particles sparingly for feedback.

Possible effects:

- firing,
- projectile impact,
- player death,
- Echo spawn,
- loop reset,
- switch activation,
- level completion,
- teleportation.

Keep performance reasonable.

---

# 38. SCREEN EFFECTS

Possible effects:

- subtle camera shake,
- chromatic/time distortion around resets,
- hit flash,
- vignette,
- temporal trail.

Make screen shake optional.

Do not overdo effects.

Gameplay readability comes first.

---

# 39. AUDIO

If external audio assets are unavailable, generate basic audio through Web Audio or use safe locally generated/simple assets.

At minimum provide sound feedback for:

- shooting,
- impacts,
- switch activation,
- door opening,
- timer warning,
- reset,
- Echo spawn,
- death,
- level completion.

Different events should be distinguishable.

If practical, create a subtle ambient soundtrack or procedural ambience.

Volume controls must work.

The game must remain playable with sound disabled.

---

# 40. MUSIC DESIGN

Optional if productive.

Music could become more layered as Echo count increases.

Example:

Loop 1:
minimal pulse.

Loop 2:
additional rhythm.

Loop 3:
additional harmony.

Loop 4+:
increasing musical complexity.

This would make accumulated timelines audible.

Do this only after the game itself is stable.

---

# 41. CAMERA

Use a camera system appropriate to each level.

Potentially:

- fixed view for small puzzle rooms,
- smooth following camera for larger levels.

Avoid excessive camera movement.

The player needs situational awareness.

If the level fits comfortably on one screen, consider displaying the entire level.

Puzzle comprehension is more important than cinematic camera work.

---

# 42. HUD

HUD should clearly communicate:

- remaining loop time,
- loop number,
- number of Echoes,
- objective,
- current important interaction prompt.

Potentially:

```text
LOOP 04
00:17.3

ECHOES: 3

OBJECTIVE
Reach the temporal exit
```

Keep it stylish and compact.

---

# 43. TIMER FEEDBACK

The timer should increasingly communicate urgency.

For example:

Last 5 seconds:

- stronger sound,
- visual pulse,
- more visible countdown.

Do not make this obnoxious after repeated attempts.

---

# 44. INTERACTION PROMPTS

When near something interactable, display a compact contextual prompt.

Example:

```text
[E] ACTIVATE
```

or

```text
[E] PICK UP CORE
```

Do not cover the center of the screen unnecessarily.

---

# 45. TUTORIAL DESIGN

Do not dump a wall of text on the player.

Teach through playable situations.

Create a tutorial sequence.

## Tutorial 1: Movement

Teach movement and exit.

No Echo required.

## Tutorial 2: The First Echo

Place a pressure plate controlling a door.

Player discovers they cannot simultaneously stand on plate and reach exit.

After reset, previous self holds plate.

Current self walks through.

This should create the "aha" moment.

## Tutorial 3: Timing

The first Echo activates a switch later in its route.

Player must coordinate timing.

## Tutorial 4: Interaction

Teach switches.

## Tutorial 5: Danger

Introduce laser/turret.

Teach that Echoes can be killed.

Keep instructions minimal and contextual.

---

# 46. LEVEL CAMPAIGN

Create a meaningful collection of playable levels.

Aim for at least roughly 8-12 levels if the systems and session permit it.

Quality matters more than reaching an arbitrary number.

Each level should introduce or combine concepts.

Possible campaign:

## Level 0: Wake

Movement and exit.

## Level 1: Again

First pressure plate.

Requires one Echo.

## Level 2: Hold

Two pressure plates.

Requires multiple bodies.

## Level 3: Timing

Timed doors.

## Level 4: Line of Fire

Introduce turret.

One Echo distracts it.

## Level 5: Crossfire

Multiple turret sight lines.

Echo actions influence survivability.

## Level 6: Cargo

Introduce movable Energy Core.

## Level 7: Desync

A puzzle deliberately demonstrates how changing the world can kill or derail an Echo.

## Level 8: Relay

Multiple Echoes perform a sequence.

## Level 9: Synchronize

Two or more simultaneous switch activations.

## Level 10: Cascade

Several previous timelines depend on each other.

## Level 11: ECHO

A final multi-stage puzzle requiring mastery of most systems.

If 12 levels cannot be made well, create fewer stronger levels.

---

# 47. LEVEL DESIGN RULES

Every puzzle should have a comprehensible causal structure.

Avoid solutions requiring:

- pixel-perfect positioning,
- frame-perfect timing,
- invisible knowledge,
- random luck.

Timing challenges should have reasonable tolerance.

Use spatial composition to help players understand:

- what controls what,
- where they need to go,
- what is dangerous,
- what their Echo will do.

Whenever possible, create moments where the player can visually watch their plan unfold.

That payoff is important.

---

# 48. PAR SOLUTIONS

For each level, determine a reasonable expected number of loops.

Example:

```text
Par: 3 Echoes
```

Do not necessarily show this during the first playthrough.

Show it after completion or in level select.

Verify that each level can actually be completed.

---

# 49. DEBUG SYSTEMS

Create developer tools that make level design and debugging efficient.

Possible debug features:

- toggle collision visualization,
- show actor coordinates,
- show Echo target trajectory,
- show recorded events,
- pause timeline,
- slow motion,
- fast-forward,
- spawn/reset Echo,
- skip level,
- unlock all levels.

Keep debugging controls out of normal gameplay.

A query parameter or development mode can enable them.

---

# 50. REPLAY DEBUGGING

The replay system is likely the hardest engineering problem.

Build tools specifically for it.

Useful visualization:

- historical path line,
- current Echo position,
- expected recorded position,
- error distance,
- event timestamps,
- desync counter.

Use these tools to find and fix drift.

---

# 51. DETERMINISM

Aim for deterministic behavior.

Avoid depending on variable frame count.

Use delta time correctly.

For systems whose exact timing matters, consider fixed-step simulation or sufficiently stable timestamp-based logic.

Seed random behavior.

Echo playback must remain reliable after:

- browser slowdowns,
- different display refresh rates,
- pausing,
- resizing,
- restarting.

Test these scenarios.

---

# 52. GAME STATE ARCHITECTURE

Separate concerns.

Suggested conceptual modules:

```text
game/
  core/
  scenes/
  actors/
  timeline/
  recording/
  playback/
  interactions/
  hazards/
  levels/
  ui/
  audio/
  effects/
  persistence/
  debug/
```

Do not force this exact structure if a better one emerges.

Important systems should not become one giant scene file.

---

# 53. ACTOR MODEL

Create reusable actor concepts.

Possible hierarchy/components:

- Player
- Echo
- DamageableActor
- Projectile
- Interactable
- Trigger
- PressurePlate
- Door
- Turret
- Laser
- Carryable

Prefer composition where practical.

Keep responsibilities clear.

---

# 54. LEVEL FORMAT

Do not hard-code every level directly inside giant scene logic.

Create a reusable level-definition format.

A level should be able to define things like:

- bounds,
- player spawn,
- loop duration,
- walls,
- doors,
- plates,
- switches,
- enemies,
- lasers,
- objects,
- exit,
- objective,
- tutorial messages.

JSON, TypeScript configuration, or another clean structured system is acceptable.

The format should make adding levels fast.

---

# 55. LEVEL VALIDATION

Build basic validation for level definitions.

Detect obvious issues such as:

- duplicate IDs,
- missing referenced target,
- door controlled by nonexistent switch,
- spawn outside bounds,
- exit missing,
- invalid duration.

Fail loudly in development.

---

# 56. COLLISION SYSTEM

Collision needs to be stable.

Actors should:

- not tunnel through walls at normal speeds,
- not get trapped constantly,
- interact consistently with doors.

Projectiles need predictable collision.

Movable objects should not explode into unstable physics behavior.

Prefer simple robust collision over advanced realism.

---

# 57. PATH / MOVEMENT PLAYBACK

Experiment with Echo playback.

Potential approach:

Record movement input continuously at a reasonable sample rate and replay input.

Also store periodic positional checkpoints.

During playback:

- primarily replay movement,
- compare to checkpoint,
- apply tiny correction if error is small,
- declare desync if divergence is large.

Do not teleport visibly every few frames.

The objective is believable reenactment with practical robustness.

---

# 58. EVENT PLAYBACK

Record discrete events with timestamps.

Examples:

```ts
type TimelineEvent =
  | Move...
  | Shoot...
  | Interact...
  | PickUp...
  | Drop...
  | Death...
```

Use a clean extensible event model.

When playback time crosses an event timestamp, dispatch it to the Echo.

Ensure events happen once.

Handle restart/reset correctly.

---

# 59. RECORDING MEMORY

Do not create unbounded memory usage.

Loop recordings are short.

Use a sensible sample interval.

Avoid storing huge frame-by-frame object snapshots if unnecessary.

---

# 60. WORLD RESET

World reset must reliably restore:

- player position,
- enemy health,
- enemy position,
- doors,
- switches,
- pressure plates,
- carryables,
- projectiles,
- timers,
- lasers,
- objective state.

Previous Echo recordings persist.

Temporary world entities should not leak between loops.

Create a proper reset lifecycle rather than manually patching objects one by one forever.

---

# 61. GAME SAVE

Persist:

- completed levels,
- best score/loop count,
- settings.

Do not need to save an active mid-level timeline unless easy and reliable.

Handle corrupted/missing save data gracefully.

Provide a reset-progress option with confirmation.

---

# 62. POLISH THE PLAYER FEEL

Spend time tuning:

- movement speed,
- projectile speed,
- firing cadence,
- interaction distance,
- hit feedback,
- collision response,
- camera smoothing,
- animation timing,
- reset transition.

A technically complete game with poor feel is unfinished.

---

# 63. VISUAL DIFFERENTIATION OF ECHOES

As Echo count increases, the player must understand them.

Consider:

- subtle brightness differences,
- labels E1, E2, E3,
- trailing lines,
- timeline-specific symbols.

Do not assign random rainbow colors.

Keep the temporal visual identity consistent.

---

# 64. ECHO TRAILS

Render a fading trail behind Echoes.

Use it to communicate movement history.

Keep it subtle enough that 6 Echoes do not obscure the level.

Add a settings toggle if needed.

---

# 65. FUTURE PATH PREVIEW

Experiment with showing a short projection of an Echo's upcoming path.

This could be useful when planning.

Possible implementation:

- only while holding a planning key,
- only while paused,
- translucent path for next 3 seconds.

Do not make the base game visually noisy.

Evaluate whether this improves gameplay before keeping it.

---

# 66. PLANNING MODE

If productive, add a planning overlay activated by Tab.

It could:

- pause gameplay,
- show Echo trajectories,
- show timeline events,
- show mechanism connections.

This may become a powerful feature for later puzzles.

Do not build an enormous editor before core gameplay works.

---

# 67. LOOP COUNT LIMITS

Some levels may have a maximum supported Echo count for performance/readability.

Do not arbitrarily fail the player for using extra loops unless it is part of a challenge mode.

Potentially support 10+ Echoes robustly.

Stress-test this.

---

# 68. PERFORMANCE

Test:

- many Echoes,
- many projectiles,
- particles,
- multiple turrets.

Avoid obvious memory leaks.

Destroy scene objects and event listeners properly.

Avoid accumulating timers after restart.

Use browser profiling if useful.

---

# 69. RESPONSIVENESS

The game should work at common desktop resolutions.

Primary target is desktop keyboard/mouse.

Handle resize correctly.

Avoid UI overlapping gameplay.

Do not spend major time on mobile touch controls unless the desktop version is already highly polished.

---

# 70. GAME FEEL DETAILS

Add small details that make the world feel responsive.

Examples:

- doors emit particles when unlocked,
- pressure plates physically depress,
- turrets rotate toward targets,
- bullets leave trails,
- Echoes distort when spawning,
- timer pulses near reset,
- exit reacts when player approaches,
- UI animates subtly after loop increment.

These details matter.

---

# 71. TITLE SCREEN PRESENTATION

Make the title "ECHO" visually memorable.

A possible treatment:

```text
E C H O
E C H O
 E C H O
  E C H O
```

or temporal offset/glitch effects.

Keep it elegant rather than cheesy.

---

# 72. NARRATIVE

Narrative is optional and should remain minimal.

Possible setup:

The player wakes inside an experimental temporal facility.

A system repeatedly resets the chamber.

Short environmental text gradually reveals that the Echo technology is malfunctioning.

Avoid lengthy dialogue.

Gameplay remains central.

Potential level intro snippets:

- "Again."
- "The chamber remembers."
- "You are not alone."
- "Causality unstable."
- "One timeline is insufficient."

Use this sparingly.

---

# 73. FINAL LEVEL

If enough campaign content exists, make the final level memorable.

It should require several Echoes and combine:

- synchronized plates,
- turret distraction,
- Energy Core movement,
- doors,
- temporal timing.

The player should eventually watch a miniature choreography of many versions of themselves simultaneously executing the solution.

That spectacle should be the payoff of the game.

---

# 74. OPTIONAL CHALLENGE MODE

If the main campaign becomes polished, add optional challenges.

Examples:

- minimum Echoes,
- no deaths,
- speed solution,
- no shooting,
- all Echoes survive.

Do not prioritize this before the campaign.

---

# 75. SANDBOX LEVEL

Create a developer/sandbox level containing most mechanics.

This helps test interactions quickly.

It can include:

- plate,
- switch,
- door,
- turret,
- laser,
- crate,
- core,
- teleporters.

Keep it accessible through development tools or a hidden menu.

---

# 76. LEVEL EDITOR

Only after the core game is polished, consider a simple internal level editor.

This is lower priority.

A useful editor could:

- place walls,
- place mechanisms,
- assign IDs,
- connect triggers,
- position spawn/exit,
- export level config.

Do not spend half the session building an editor while the game lacks levels.

A code/config-driven level format is sufficient initially.

---

# 77. TESTING

Add automated tests where they provide value.

Especially test pure logic around:

- timeline recording,
- event ordering,
- loop reset,
- level validation,
- save parsing,
- timing calculations.

Use unit tests for deterministic systems.

Gameplay rendering does not need exhaustive automated testing.

Also manually run and inspect the actual game.

---

# 78. MANUAL PLAYTESTING

Repeatedly play the game yourself through the available browser/dev environment when possible.

Do not assume that compiling means it works.

Verify:

- controls,
- collisions,
- reset,
- Echo playback,
- interactions,
- level completion,
- death,
- menu navigation,
- settings,
- progression.

When something feels awkward, fix it.

---

# 79. BUG HUNTING

Explicitly look for:

- duplicated Echoes,
- stale timers,
- events firing twice,
- projectiles surviving reset,
- switches keeping wrong state,
- player spawning inside objects,
- Echoes teleporting,
- pause advancing timeline,
- restart accidentally committing timeline,
- loop timer drifting,
- menus stacking scenes,
- sound repeating infinitely,
- local save crashes,
- level progression bugs.

Fix issues instead of merely documenting them.

---

# 80. EDGE CASES

Test:

- player dies at exact reset moment,
- player fires at exact reset moment,
- player holds interaction during reset,
- Echo dies while carrying object,
- object is destroyed/moved before Echo reaches it,
- Echo tries to interact with already-active switch,
- door closes on actor,
- multiple actors enter plate simultaneously,
- paused during last fraction of second,
- restarting several times rapidly,
- undoing after several Echoes,
- completing objective exactly at reset.

Choose consistent behavior.

---

# 81. CODE QUALITY

Keep TypeScript types useful.

Avoid excessive `any`.

Avoid massive classes when systems can be separated.

Name things clearly.

Comment non-obvious temporal/replay logic.

Do not litter code with explanatory comments for trivial statements.

Refactor when architecture starts becoming painful.

---

# 82. ERROR HANDLING

Development errors should be visible.

Do not silently ignore invalid level references or impossible states.

Production gameplay should fail gracefully where practical.

---

# 83. README

Create a useful README.

Include:

- game overview,
- screenshot section placeholder if needed,
- how to run,
- controls,
- architecture overview,
- how timelines work,
- how to add a level,
- build/test commands.

Keep it useful rather than enormous.

---

# 84. CHANGELOG / DEVELOPMENT NOTES

Maintain a concise development log if helpful.

Include major systems implemented and known limitations.

Do not waste excessive session time documenting every tiny change.

---

# 85. QUALITY BAR

A system is not finished merely because it exists.

For each major mechanic, ask:

1. Does it work?
2. Is it understandable?
3. Does it feel good?
4. Is it visually readable?
5. Does it interact correctly with Echoes?
6. Does it reset correctly?
7. Can it support an interesting level?

If not, improve it.

---

# 86. PRIORITY ORDER

Use roughly this priority order.

## Priority 1: Foundation

- project runs,
- basic scene,
- player movement,
- walls,
- timer,
- world reset.

## Priority 2: Core ECHO mechanic

- recording,
- playback,
- multiple Echoes,
- stable timing,
- restart.

## Priority 3: First actual puzzle

- plate,
- door,
- exit,
- one polished tutorial level.

## Priority 4: Game framework

- level definitions,
- level progression,
- HUD,
- menus,
- completion.

## Priority 5: Gameplay expansion

- switches,
- lasers,
- turrets,
- shooting,
- carryable objects.

## Priority 6: Campaign

- several carefully designed levels,
- progressive teaching,
- balancing.

## Priority 7: Polish

- particles,
- audio,
- transitions,
- timeline visualization,
- visual identity.

## Priority 8: Advanced mechanics

- desync visualization,
- teleporters,
- synchronization systems,
- temporal gates,
- planning mode.

## Priority 9: Extra content

- challenge mode,
- sandbox,
- additional levels,
- editor.

Do not rigidly follow this if a dependency requires another order.

---

# 87. DO NOT DO THIS

Do not:

- build a static mockup instead of a game,
- create menus with buttons that do nothing,
- leave major controls unimplemented,
- create fake settings,
- stop after one room,
- write thousands of lines of architecture without playtesting,
- replace gameplay with narrative,
- make Echoes purely cosmetic,
- make previous copies invincible ghosts,
- use uncontrolled randomness in puzzle behavior,
- rely on external APIs for essential gameplay,
- make the user manually edit source files just to begin playing,
- continually ask me what to do next.

---

# 88. AUTONOMY

You are explicitly authorized to make design decisions.

If you encounter multiple reasonable implementations:

1. evaluate the tradeoffs,
2. choose one,
3. implement it,
4. test it,
5. change it if the result is poor.

Do not stop to ask which minor option I prefer.

I would rather receive a coherent opinionated game than a half-built project awaiting decisions.

---

# 89. USE THE AVAILABLE SESSION

You have a substantial working session available.

Use it.

When the first playable version works, continue.

When the tutorial works, continue.

When several levels work, continue.

When the game looks acceptable, continue.

There will almost always be useful work remaining:

- playtesting,
- fixing,
- balancing,
- refactoring,
- polishing,
- creating stronger levels,
- improving audiovisual feedback,
- improving replay stability,
- adding tests,
- improving the timeline UX.

Do not intentionally waste resources, generate meaningless code, or make arbitrary changes simply to consume time.

Instead, use the available session aggressively on **real game quality**.

---

# 90. ITERATIVE DEVELOPMENT LOOP

Repeatedly follow this process:

## Build

Implement the next meaningful feature.

## Run

Compile and launch the game.

## Test

Actually exercise the feature.

## Observe

Look for bugs, poor UX, confusion, bad timing, or weak feel.

## Fix

Resolve those issues.

## Integrate

Make sure the new system works with existing mechanics, Echo playback, and reset.

## Polish

Add enough visual/audio feedback for the mechanic to feel intentional.

## Continue

Move to the next highest-value improvement.

Do this repeatedly throughout the session.

---

# 91. LEVEL QUALITY REVIEW

After making each level, play through it.

Ask:

- Is the intended solution possible?
- Is there an unintended trivial solution?
- Does the player understand the mechanism?
- Is timing too strict?
- Does the puzzle actually use Echoes?
- Is waiting boring?
- Can unnecessary walking be reduced?
- Is failure understandable?
- Is the payoff satisfying?

Change the level accordingly.

---

# 92. REDUCE BORING WAITING

Time-loop games can easily make players stand around waiting for an old Echo to reach something.

Avoid excessive waiting.

Possible solutions:

- shorter loops,
- compact levels,
- fast reset transitions,
- carefully timed layouts,
- optional fast-forward after the current player reaches a safe state,
- planning tools.

Do not introduce fast-forward unless playback remains deterministic.

---

# 93. ECHO CHOREOGRAPHY

One important emotional goal:

Later levels should allow the player to stand somewhere and watch several copies execute an intricate plan.

Example:

At second 3:
Echo 1 activates a plate.

At second 6:
Echo 2 crosses Door A.

At second 8:
Echo 3 shoots a turret.

At second 11:
Echo 4 carries the core through the hallway.

At second 15:
Echo 2 activates Door B.

At second 17:
the current player receives access to the final room.

Build toward moments like this.

---

# 94. MAKE FAILURE INTERESTING

When a plan breaks, help the player understand why.

Example:

Echo 3 dies.

Then show briefly:

```text
TIMELINE 3 LOST
DEPENDENT ACTION AT 14.2s WILL NOT OCCUR
```

Do not overexplain every failure.

But temporal causality should feel comprehensible rather than buggy.

---

# 95. TEMPORAL LANGUAGE

Develop consistent terminology.

Use:

- Loop
- Echo
- Timeline
- Desync
- Reset
- Temporal Gate

Avoid switching randomly between clone, ghost, recording, copy, duplicate unless appropriate.

---

# 96. POSSIBLE UI STYLE

Use compact monospace or technical typography for temporal systems.

Example:

```text
LOOP 05
T-14.82

TIMELINES
01  STABLE
02  STABLE
03  DESYNC
04  LOST
05  CURRENT
```

Keep gameplay UI readable and restrained.

---

# 97. ATMOSPHERE

Aim for:

- sterile,
- mysterious,
- precise,
- slightly unsettling,
- technological.

The player repeatedly encountering copies of themselves should feel strange.

Avoid horror unless naturally emerging.

---

# 98. INTRO SEQUENCE

A very short intro is enough.

Possible:

Black screen.

Text:

```text
TEMPORAL RECONSTRUCTION CHAMBER
TEST 001
```

Player wakes.

Door ahead.

Timer starts.

No exposition.

Let mechanics explain the premise.

---

# 99. LOOP RESET EFFECT

Make reset one of the signature moments.

Potential sequence lasting roughly 0.3-0.7 seconds:

1. timer hits zero,
2. screen briefly freezes,
3. temporal distortion sweeps across screen,
4. actors leave streaks backward,
5. world instantly reconstructs,
6. new Echo flickers into existence,
7. timer restarts.

Keep it fast.

Repeated loops should still feel satisfying.

---

# 100. PLAYER VS ECHO VISUALS

The current player should always be immediately distinguishable.

For example:

Current player:
solid bright body.

Echo:
transparent outlined version with internal scan effect.

Dead/lost Echo:
brief fragmentation.

Desynced Echo:
subtle instability.

---

# 101. GAMEPLAY METRICS

During development, track useful values:

- number of loops,
- deaths,
- resets,
- level completion time,
- Echo desync frequency.

This can help balance levels.

Do not add invasive analytics or remote tracking.

Local development data only.

---

# 102. FINAL DEVELOPMENT PHASE

Before stopping work, do a final quality pass.

Run:

- type checking,
- tests,
- lint if configured,
- production build.

Then launch/play the game again.

Play from the beginning through as much of the campaign as possible.

Fix serious issues found.

Check:

- no obvious console errors,
- no broken buttons,
- no inaccessible levels,
- no unwinnable tutorial,
- no missing UI text,
- no impossible controls,
- no major visual overlap,
- no broken restart,
- no progression failure.

---

# 103. FINAL REPOSITORY STATE

Leave the repository in a clean usable state.

Remove:

- abandoned duplicate systems,
- dead experiments,
- unnecessary temporary files,
- debugging spam,
- obvious TODOs for already solved issues.

Keep useful development/debug tooling.

---

# 104. IF YOU RUN OUT OF FEATURE IDEAS

Do not stop.

Use this improvement queue.

In roughly this order:

1. replay accuracy
2. controls
3. first tutorial experience
4. level clarity
5. better puzzles
6. Echo readability
7. reset polish
8. sound effects
9. timeline visualization
10. death feedback
11. turret behavior
12. level balancing
13. additional campaign level
14. accessibility
15. UI responsiveness
16. performance
17. automated tests
18. debug tools
19. advanced temporal mechanic
20. final level
21. challenge scoring
22. sandbox mode
23. level editor
24. procedural ambient soundtrack
25. extra polish

Always choose the highest-value remaining work.

---

# 105. SUCCESS CRITERIA

The project is successful when someone unfamiliar with the code can:

1. install dependencies,
2. launch the game,
3. understand how to move,
4. experience the first reset,
5. see their previous self replay the run,
6. understand that they can cooperate with that Echo,
7. solve a puzzle using it,
8. progress through multiple increasingly complex puzzles,
9. encounter meaningful consequences when an Echo's history changes,
10. enjoy the presentation enough that ECHO feels like a deliberate game rather than an engineering demonstration.

---

# 106. STRETCH GOAL: TIMELINE EDITOR

If practically everything above is working well, investigate an advanced mechanic where the player can inspect committed timelines.

Do NOT allow arbitrary editing initially.

Potential UI:

```text
TIMELINE 01
00:00 ───────────────────── 00:30
       MOVE
             SWITCH A
                    SHOOT
                           PLATE B
```

Players might eventually replay or delete a selected timeline.

This could become part of advanced puzzle solving.

Only implement if understandable.

---

# 107. STRETCH GOAL: PARADOX MECHANIC

Explore a mechanic where a timeline becomes impossible due to changed causality.

Example:

Echo 1 historically picked up a core.

The current world causes someone else to pick it up first.

Echo 1 reaches for an absent object.

Mark that event as a temporal conflict.

Potential response:

- Echo continues without the object,
- temporal instability increases,
- player sees conflict feedback.

Do NOT enforce simplistic sci-fi paradox rules that make gameplay annoying.

Use paradoxes as readable systemic consequences.

---

# 108. STRETCH GOAL: ECHO INTERACTION

Potential later mechanic:

The current player can physically collide with or interact with Echoes.

Possible uses:

- body-block projectiles,
- boost another actor,
- exchange an object,
- trigger cooperative machinery.

Use carefully because physical interaction can create replay instability.

---

# 109. STRETCH GOAL: BOSSLIKE PUZZLE

Rather than a traditional boss, create a machine/enemy that requires multi-loop choreography.

Example phases:

Loop 1:
expose shield generator.

Loop 2:
Echo 1 exposes generator while player destroys node A.

Loop 3:
Echoes expose and destroy previous nodes while current player reaches node B.

Eventually many Echoes execute earlier phases simultaneously.

This would make an excellent ending.

---

# 110. STRETCH GOAL: SPEED CONTROL

Investigate a controlled fast-forward function.

Only allow it when:

- current player is dead,
- player is standing in a designated safe planning mode,
- or deterministic replay can tolerate it.

Never allow speed controls to break synchronization.

---

# 111. STRETCH GOAL: GHOST PATH RENDERING

When paused, draw past/future path traces.

Differentiate:

- historical path,
- successfully executed path,
- divergence.

This could turn complex levels into something visually similar to debugging concurrent software, which fits the theme perfectly.

---

# 112. STRETCH GOAL: LEVEL SOLUTION REPLAY

After completing a level, optionally replay the final successful loop from an overview camera.

Show all Echoes executing the plan.

This would be extremely satisfying.

Potentially allow:

```text
WATCH SOLUTION
```

after completion.

Do this only if recording architecture makes it practical.

---

# 113. STRETCH GOAL: FINAL SOLUTION TIMELINE

On completion, show a summary:

```text
LEVEL COMPLETE

4 LOOPS

E1  ████████████████████████
E2  ███████████X
E3  ████████████████████████
YOU ███████████████★
```

This reinforces the unique identity of the game.

---

# 114. IMPORTANT PRODUCT PHILOSOPHY

Whenever choosing between:

A complicated feature that exists mostly because it sounds impressive,

and

a smaller feature that makes the time-loop mechanic clearer and more fun,

choose the second.

ECHO succeeds based on the elegance of its temporal puzzles.

Protect that.

---

# 115. START NOW

Inspect the repository.

Set up or repair the project as necessary.

Build the smallest playable ECHO loop.

Then immediately iterate toward the complete vision above.

Do not return after merely describing what you intend to do.

Implement.

Run.

Test.

Fix.

Play.

Improve.

Continue through the highest-value remaining work for the entire available session.

The finished result should be a polished playable **ECHO** game where coordinating with previous versions of yourself feels clever, readable, and satisfying.
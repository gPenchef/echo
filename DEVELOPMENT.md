# Development notes

## Implemented

The initial empty repository now contains the TypeScript/Vite/Phaser game, fourteen authored chambers, deterministic input replay, targeted actions, repeatable resets, physical Echo causality, carryable crates/cores, plates, timed and latched switches, doors, lasers, shooting targets, shielded turrets, campaign teleporters, menus, persistence, audio, and planning/timeline UX. The three larger facilities have independent dimensions, named sectors, a following camera, live minimap, and full-map planning.

The campaign has executable solutions at its displayed par Echo counts. Browser tests exercise real keyboard movement, the first Echo puzzle, final choreography, progression, settings, pause, planning, and automatic timeout. Unit regressions cover repeated reconstruction, event ordering, checkpoint accuracy, multiple frame rates, object conflicts, dead Echoes dropping cargo, closing doors, teleportation, laser cover, last-tick actions, and twelve armed Echoes.

## Deliberate rules

- Early commits hold their endpoint. They do not freeze hazards or protect an Echo.
- R discards; Space commits; Q removes the newest committed run. There is no silent replacement when the twelve-Echo capacity is reached.
- Actors overlap each other, but collide with walls and closed doors. A newly dropped crate permits an overlapping actor to step out, then blocks reentry.
- Actions target their recorded object/switch ID. An Echo does not silently substitute a different nearby object.
- Death takes priority over extraction; live extraction takes priority over timeout on the same tick.
- Sentries choose the nearest visible living actor with stable tie-breaking. A changed target changes their wind-up.
- No remote analytics, asset requests, accounts, or cloud saves.
- Camera coordinates are presentation-only. Replay and collision always use world coordinates. Pointer input is converted through the last rendered camera view, including after resize and teleportation.
- Original chamber IDs and saved scores are unchanged. The larger facilities unlock after Cascade.

## Remaining design opportunities

These are opportunities for another iteration, not required setup work:

- Further puzzles that build on Interference's crate/laser causality and Echo protection.
- Selected-history rewriting and a successful-solution viewer.
- More varied environments and a deeper final machine puzzle.
- Mobile enemies, moving platforms, conveyors, challenge modes, and an editor remain unimplemented optional features from the broad spec.
- Touch/gamepad controls and saving an active chamber are outside the current desktop scope.

The desktop computer-use tool could not verify the open browser URL in this environment. Visual QA instead used isolated headless Chrome screenshots of the local game, alongside actual browser input tests; it did not use the user's browser profile.

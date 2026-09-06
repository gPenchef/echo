export const cheatCodes = [
  ['UNLOCK', 'Unlock all chambers for this visit; does not award completions.'],
  ['GOD', 'Toggle invulnerability for you and every Echo.'],
  ['NOCLIP', 'Toggle walking through walls, closed doors, and crates. World edges remain solid.'],
  ['POWER', 'Toggle all circuits on and all lasers off.'],
  ['SLOW', 'Toggle half-speed simulation, including Echoes and hazards.'],
  ['NEXT', 'Skip to the next chamber without awarding a completion.'],
  ['NORMAL', 'Disable gameplay cheats and restart this chamber with clean history.'],
] as const;
export type CheatCommand =
  | { kind: (typeof cheatCodes)[number][0] }
  | { kind: 'WARP'; index: number };
export function parseCheat(text: string, count: number): CheatCommand | undefined {
  const code = text.trim().toUpperCase().replace(/\s+/g, ' ');
  if (cheatCodes.some(([name]) => name === code))
    return { kind: code as (typeof cheatCodes)[number][0] };
  const match = /^WARP (\d+)$/.exec(code);
  if (match) {
    const index = Number(match[1]) - 1;
    if (Number.isInteger(index) && index >= 0 && index < count) return { kind: 'WARP', index };
  }
}

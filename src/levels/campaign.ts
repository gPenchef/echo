import { type Level, type Rect, type Vec } from '../core/types';
export const point = (x: number, y: number): Vec => ({ x: x * 40 + 20, y: y * 40 + 20 });
export const wall = (x: number, y: number, w: number, h: number): Rect => ({ x: x * 40, y: y * 40, w: w * 40, h: h * 40 });
const border = [wall(0, 0, 24, 1), wall(0, 13, 24, 1), wall(0, 1, 1, 12), wall(23, 1, 1, 12)];
const split = (x: number, gap = 7) => [wall(x, 1, 1, gap - 1), wall(x, gap + 2, 1, 13 - gap - 2)];
const door = (id: string, x: number, signals: string[], gap = 7) => ({ id, ...wall(x, gap, 1, 2), signals });
function level(id: string, name: string, data: Partial<Level>): Level {
  return { id, name, subtitle: '', objective: 'Reach the extraction pad.', hint: '', seconds: 25, par: 0, spawn: point(3, 7), exit: point(21, 7), walls: [...border], plates: [], doors: [], switches: [], lasers: [], objects: [], turrets: [], portals: [], ...data };
}
export const campaign: Level[] = [
  level('wake', 'Wake', {
    subtitle: 'TEMPORAL RECONSTRUCTION / SUBJECT 01', seconds: 20,
    objective: 'Move with WASD or arrow keys. Reach the white extraction pad.',
    hint: 'Go around the ends of the central wall. The entire chamber resets when time runs out.',
    walls: [...border, wall(10, 4, 1, 6)],
  }),
  level('again', 'Again', {
    subtitle: 'THE CHAMBER REMEMBERS', par: 1,
    objective: 'Stand on A. Press Space to create an Echo. Let it open your way.',
    hint: 'Walk to A and press Space. In the new loop, your Echo repeats the walk and stays on A. You can now cross the door.',
    walls: [...border, ...split(12)], plates: [{ id: 'A', ...point(6, 4) }], doors: [door('A', 12, ['A'])],
  }),
  level('hold', 'Hold', {
    subtitle: 'ONE TIMELINE IS INSUFFICIENT', par: 2,
    objective: 'Two plates. Two doors. Build a chain of past selves.',
    hint: 'Record A first. Follow its Echo through the first door, then record yourself on B. On the third loop, head for the exit.',
    walls: [...border, ...split(9), ...split(17)], plates: [{ id: 'A', ...point(5, 4) }, { id: 'B', ...point(13, 10) }], doors: [door('A', 9, ['A']), door('B', 17, ['B'])],
  }),
  level('interval', 'Interval', {
    subtitle: 'BE IN TWO PLACES AT THE SAME TIME', par: 1,
    objective: 'E activates switch A for 2 seconds. Arrange a timed opening.',
    hint: 'Wait 5 seconds near A, press E, then Space. In the next loop, reach the door before your Echo activates A at the same recorded moment.',
    walls: [...border, ...split(16)], switches: [{ id: 'A', ...point(5, 4), seconds: 2 }], doors: [door('A', 16, ['A'])],
  }),
  level('redline', 'Redline', {
    subtitle: 'YOUR PAST IS NOT INVULNERABLE', par: 1,
    objective: 'A disables the red barrier. Record a safe path for your Echo.',
    hint: 'Reach A in the upper left and commit. Wait for the Echo to disable the laser before crossing. Red is live; the dotted line is safe.',
    plates: [{ id: 'A', ...point(6, 3) }], lasers: [{ id: 'L', ...wall(12, 1, 0.15, 12), signals: ['A'] }],
    walls: [...border, wall(8, 5, 2, 4)],
  }),
  level('cargo', 'Cargo', {
    subtitle: 'SOME MEMORIES HAVE WEIGHT', par: 1, core: true,
    objective: 'Use the crate on A. Record B. Carry the energy core to extraction.',
    hint: 'E picks up or drops the nearest object. Drop the square crate on A, then stand on B and commit. Your Echo repeats the delivery. Retrieve the diamond core yourself.',
    walls: [...border, ...split(15)], plates: [{ id: 'A', ...point(6, 4) }, { id: 'B', ...point(10, 10) }], doors: [door('AB', 15, ['A', 'B'])],
    objects: [{ id: 'crate', ...point(4, 9), kind: 'crate' }, { id: 'core', ...point(11, 3), kind: 'core' }],
  }),
  level('cover', 'Line of Fire', {
    subtitle: 'PROTECT THE PLAN', par: 1,
    objective: 'Hold A, expose the sentry, and clear a route. Aim and click to shoot.',
    hint: 'A opens the partition and removes the sentry shield. Record A. In the next loop, follow the open corridor and shoot the sentry before crossing its sight line.',
    walls: [...border, ...split(11)], plates: [{ id: 'A', ...point(6, 4) }], doors: [door('A', 11, ['A'])],
    turrets: [{ id: 'T', ...point(19, 7), range: 280, shield: 'A' }],
  }),
  level('resonance', 'Resonance', {
    subtitle: 'A SIGNAL ACROSS TIME', par: 1,
    objective: 'Shoot target A to open the far door for 2 seconds.',
    hint: 'Record a shot at the circular target after waiting 5 seconds. Commit, then run to the door. Your Echo repeats the shot and opens the timed passage.',
    walls: [...border, ...split(17)], switches: [{ id: 'A', ...point(5, 3), target: true, seconds: 2 }], doors: [door('A', 17, ['A'])],
  }),
  level('synchronize', 'Synchronize', {
    subtitle: 'THREE BODIES. ONE MOMENT.', par: 2,
    objective: 'Extraction requires 3 bodies on the large synchronization pad.',
    hint: 'The large pad overlaps extraction. Stand on it and commit twice. Follow both Echoes onto the pad to satisfy 3 / 3.',
    exit: point(19, 7), plates: [{ id: 'SYNC', ...point(19, 7), need: 3 }], exitSignals: ['SYNC'],
    walls: [...border, wall(9, 1, 1, 8), wall(14, 6, 1, 7)],
  }),
  level('cascade', 'Cascade', {
    subtitle: 'EVERY ACTION HAS A FUTURE', seconds: 35, par: 3, core: true,
    objective: 'A opens the route. B suppresses the laser. C powers extraction. Bring the core.',
    hint: 'Record A. Next, cross A and record B. Next, pass the disabled laser and record C. Finally retrieve the core and follow your three Echoes to extraction.',
    walls: [...border, ...split(8), ...split(18)],
    plates: [{ id: 'A', ...point(5, 3) }, { id: 'B', ...point(11, 10) }, { id: 'C', ...point(16, 3) }],
    doors: [door('A', 8, ['A']), door('C', 18, ['C'])],
    lasers: [{ id: 'B', ...wall(14, 1, 0.15, 12), signals: ['B'] }],
    objects: [{ id: 'core', ...point(3, 10), kind: 'core' }],
    turrets: [{ id: 'T', ...point(21, 3), range: 180, shield: 'C' }],
  }),
];

export function validateLevel(l: Level) {
  const ids = [...l.plates, ...l.switches].map(x => x.id);
  if (new Set(ids).size !== ids.length) throw new Error(`${l.id}: duplicate signal ID`);
  const entities = [...l.objects, ...l.turrets, ...l.portals];
  if (new Set(entities.map(e => e.id)).size !== entities.length) throw new Error(`${l.id}: duplicate entity ID`);
  for (const d of [...l.doors, ...l.lasers, { id: 'exit', signals: l.exitSignals ?? [] }]) for (const s of d.signals) if (!ids.includes(s)) throw new Error(`${l.id}/${d.id}: unknown signal ${s}`);
  for (const t of l.turrets) if (t.shield && !ids.includes(t.shield)) throw new Error(`${l.id}: unknown shield ${t.shield}`);
  for (const p of [l.spawn, l.exit, ...l.plates, ...l.switches, ...l.objects, ...l.turrets, ...l.portals, ...l.portals.map(p => p.to)]) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || p.x < 40 || p.x > 920 || p.y < 40 || p.y > 520 || l.walls.some(w => p.x > w.x && p.x < w.x + w.w && p.y > w.y && p.y < w.y + w.h)) throw new Error(`${l.id}: entity inside wall or outside playable bounds`);
  }
  if (!Number.isFinite(l.seconds) || l.seconds < 5 || l.seconds > 120) throw new Error(`${l.id}: invalid duration`);
}
campaign.forEach(validateLevel);

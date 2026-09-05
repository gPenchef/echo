import { type Level, type Rect, type Vec } from '../core/types';
import { touches } from '../core/geometry';
export const point = (x: number, y: number): Vec => ({ x: x * 40 + 20, y: y * 40 + 20 });
export const wall = (x: number, y: number, w: number, h: number): Rect => ({
  x: x * 40,
  y: y * 40,
  w: w * 40,
  h: h * 40,
});
export const perimeter = (columns: number, rows: number) => [
  wall(0, 0, columns, 1),
  wall(0, rows - 1, columns, 1),
  wall(0, 1, 1, rows - 2),
  wall(columns - 1, 1, 1, rows - 2),
];
const border = perimeter(24, 14);
const split = (x: number, gap = 7) => [wall(x, 1, 1, gap - 1), wall(x, gap + 2, 1, 13 - gap - 2)];
const door = (id: string, x: number, signals: string[], gap = 7) => ({
  id,
  ...wall(x, gap, 1, 2),
  signals,
});
function level(id: string, name: string, data: Partial<Level>): Level {
  return {
    id,
    name,
    width: 960,
    height: 560,
    subtitle: '',
    objective: 'Reach the extraction pad.',
    hint: '',
    seconds: 25,
    par: 0,
    spawn: point(3, 7),
    exit: point(21, 7),
    walls: perimeter((data.width ?? 960) / 40, (data.height ?? 560) / 40),
    plates: [],
    doors: [],
    switches: [],
    lasers: [],
    objects: [],
    turrets: [],
    portals: [],
    ...data,
  };
}
export const campaign: Level[] = [
  level('wake', 'Wake', {
    subtitle: 'TEMPORAL RECONSTRUCTION / SUBJECT 01',
    seconds: 20,
    objective: 'Move with WASD or arrow keys. Reach the white extraction pad.',
    hint: 'Go around the ends of the central wall. The entire chamber resets when time runs out.',
    walls: [...border, wall(10, 4, 1, 6)],
  }),
  level('again', 'Again', {
    subtitle: 'THE CHAMBER REMEMBERS',
    par: 1,
    objective: 'Stand on A. Press Space to create an Echo. Let it open your way.',
    hint: 'Walk to A and press Space. In the new loop, your Echo repeats the walk and stays on A. You can now cross the door.',
    walls: [...border, ...split(12)],
    plates: [{ id: 'A', ...point(6, 4) }],
    doors: [door('A', 12, ['A'])],
  }),
  level('hold', 'Hold', {
    subtitle: 'ONE TIMELINE IS INSUFFICIENT',
    par: 2,
    objective: 'Two plates. Two doors. Build a chain of past selves.',
    hint: 'Record A first. Follow its Echo through the first door, then record yourself on B. On the third loop, head for the exit.',
    walls: [...border, ...split(9), ...split(17)],
    plates: [
      { id: 'A', ...point(5, 4) },
      { id: 'B', ...point(13, 10) },
    ],
    doors: [door('A', 9, ['A']), door('B', 17, ['B'])],
  }),
  level('interval', 'Interval', {
    subtitle: 'BE IN TWO PLACES AT THE SAME TIME',
    par: 1,
    objective: 'E activates switch A for 2 seconds. Arrange a timed opening.',
    hint: 'Wait 5 seconds near A, press E, then Space. In the next loop, reach the door before your Echo activates A at the same recorded moment.',
    walls: [...border, ...split(16)],
    switches: [{ id: 'A', ...point(5, 4), seconds: 2 }],
    doors: [door('A', 16, ['A'])],
  }),
  level('redline', 'Redline', {
    subtitle: 'YOUR PAST IS NOT INVULNERABLE',
    par: 1,
    objective: 'A disables the red barrier. Record a safe path for your Echo.',
    hint: 'Reach A in the upper left and commit. Wait for the Echo to disable the laser before crossing. Red is live; the dotted line is safe.',
    plates: [{ id: 'A', ...point(6, 3) }],
    lasers: [{ id: 'L', ...wall(12, 1, 0.15, 12), signals: ['A'] }],
    walls: [...border, wall(8, 5, 2, 4)],
  }),
  level('cargo', 'Cargo', {
    subtitle: 'SOME MEMORIES HAVE WEIGHT',
    par: 1,
    core: true,
    objective: 'Use the crate on A. Record B. Carry the energy core to extraction.',
    hint: 'E picks up or drops the nearest object. Drop the square crate on A, then stand on B and commit. Your Echo repeats the delivery. Retrieve the diamond core yourself.',
    walls: [...border, ...split(15)],
    plates: [
      { id: 'A', ...point(6, 4) },
      { id: 'B', ...point(10, 10) },
    ],
    doors: [door('AB', 15, ['A', 'B'])],
    objects: [
      { id: 'crate', ...point(4, 9), kind: 'crate' },
      { id: 'core', ...point(11, 3), kind: 'core' },
    ],
  }),
  level('cover', 'Line of Fire', {
    subtitle: 'PROTECT THE PLAN',
    par: 1,
    objective: 'Hold A, expose the sentry, and clear a route. Aim and click to shoot.',
    hint: 'A opens the partition and removes the sentry shield. Record A. In the next loop, follow the open corridor and shoot the sentry before crossing its sight line.',
    walls: [...border, ...split(11)],
    plates: [{ id: 'A', ...point(6, 4) }],
    doors: [door('A', 11, ['A'])],
    turrets: [{ id: 'T', ...point(19, 7), range: 280, shield: 'A' }],
  }),
  level('resonance', 'Resonance', {
    subtitle: 'A SIGNAL ACROSS TIME',
    par: 1,
    objective: 'Shoot target A to open the far door for 1.25 seconds. Coordinate the shot.',
    hint: 'Wait 5 seconds at the origin, shoot the circular target, then commit. In the next loop, take the lower path around the long wall and reach the door as your Echo fires.',
    walls: [...border, wall(8, 1, 1, 10), ...split(17)],
    switches: [{ id: 'A', ...point(5, 3), target: true, seconds: 1.25 }],
    doors: [door('A', 17, ['A'])],
  }),
  level('interference', 'Interference', {
    subtitle: 'CHANGE THE WORLD. CHANGE THE MEMORY.',
    seconds: 30,
    par: 2,
    objective: 'A opens extraction. B protects A. Move the crate without losing its Echo.',
    hint: 'First carry the crate onto the left laser, drop it above A, and record yourself holding A below its shadow. Record B in a second loop to disable that laser. Now retrieve the crate and carry it through the right laser. Taking its cover too soon can kill the Echo on A.',
    walls: [...border, ...split(18)],
    plates: [
      { id: 'A', x: 323, y: 380 },
      { id: 'B', ...point(5, 3) },
    ],
    doors: [door('A', 18, ['A'])],
    lasers: [
      { id: 'LEFT', ...wall(8, 1, 0.15, 12), signals: ['B'] },
      { id: 'RIGHT', ...wall(16, 1, 0.15, 12), signals: [] },
    ],
    objects: [{ id: 'crate', ...point(4, 9), kind: 'crate' }],
  }),
  level('synchronize', 'Synchronize', {
    subtitle: 'THREE BODIES. ONE MOMENT.',
    par: 2,
    objective: 'Extraction requires 3 bodies on the large synchronization pad.',
    hint: 'The large pad overlaps extraction. Stand on it and commit twice. Follow both Echoes onto the pad to satisfy 3 / 3.',
    exit: point(19, 7),
    plates: [{ id: 'SYNC', ...point(19, 7), need: 3 }],
    exitSignals: ['SYNC'],
    walls: [...border, wall(9, 1, 1, 8), wall(14, 6, 1, 7)],
  }),
  level('cascade', 'Cascade', {
    subtitle: 'EVERY ACTION HAS A FUTURE',
    seconds: 35,
    par: 3,
    core: true,
    objective: 'A opens the route. B suppresses the laser. C powers extraction. Bring the core.',
    hint: 'Record A. Next, cross A and record B. Next, pass the disabled laser and record C. Finally retrieve the core and follow your three Echoes to extraction.',
    walls: [...border, ...split(8), ...split(18)],
    plates: [
      { id: 'A', ...point(5, 3) },
      { id: 'B', ...point(11, 10) },
      { id: 'C', ...point(16, 3) },
    ],
    doors: [door('A', 8, ['A']), door('C', 18, ['C'])],
    lasers: [{ id: 'B', ...wall(14, 1, 0.15, 12), signals: ['B'] }],
    objects: [{ id: 'core', ...point(3, 10), kind: 'core' }],
    turrets: [{ id: 'T', ...point(21, 3), range: 180, shield: 'C' }],
  }),
  level('concourse', 'The Concourse', {
    width: 1600,
    height: 960,
    seconds: 45,
    par: 2,
    core: true,
    subtitle: 'DISTANCE IS ANOTHER KIND OF LOCK',
    objective: 'Hold NORTH and SOUTH together. Retrieve the archive core beyond the east gate.',
    hint: 'Tab reveals the full facility. From the central concourse, take the north branch and record NORTH. Record SOUTH in a separate loop. Both relays open the east archive. Collect its core, then take the eastern aisle around the lower partition to extraction.',
    spawn: point(19, 11),
    exit: point(36, 20),
    regions: [
      { ...wall(1, 1, 17, 8), name: 'NORTH RELAY' },
      { ...wall(1, 15, 17, 8), name: 'SOUTH RELAY' },
      { ...wall(18, 1, 7, 22), name: 'CONCOURSE' },
      { ...wall(26, 1, 13, 12), name: 'ARCHIVE' },
    ],
    walls: [
      ...perimeter(40, 24),
      wall(1, 9, 16, 1),
      wall(1, 14, 16, 1),
      wall(25, 1, 1, 10),
      wall(25, 13, 1, 10),
      wall(26, 14, 9, 1),
      wall(9, 3, 1, 4),
      wall(9, 17, 1, 4),
    ],
    plates: [
      { id: 'NORTH', ...point(3, 3) },
      { id: 'SOUTH', ...point(3, 20) },
    ],
    doors: [{ id: 'N+S', ...wall(25, 11, 1, 2), signals: ['NORTH', 'SOUTH'] }],
    objects: [{ id: 'archive', ...point(34, 4), kind: 'core' }],
  }),
  level('dead-letter', 'Dead Letter', {
    width: 1200,
    height: 1600,
    seconds: 55,
    par: 2,
    core: true,
    subtitle: 'YOUR PAST WILL DELIVER IT',
    objective:
      'Open DISPATCH. Send a cargo Echo through the transfer. Take its delivery to the roof.',
    hint: 'Record DISPATCH in the basement. In loop two, cross its gate at the left, collect the core in the loading bay, and step onto transfer 1. At the destination, step north off transfer 2, drop the core, then record yourself on ROOF. On loop three, follow the same transfer after the courier has left, collect its delivery and cross the ROOF gate. Transfer pads carry objects and Echoes.',
    spawn: point(4, 35),
    exit: point(25, 3),
    regions: [
      { ...wall(1, 29, 28, 10), name: 'BASEMENT / DISPATCH' },
      { ...wall(1, 21, 13, 7), name: 'LOADING BAY' },
      { ...wall(17, 15, 12, 9), name: 'RECEIVING / TRANSFER 2' },
      { ...wall(1, 1, 28, 13), name: 'ROOFTOP ARCHIVE' },
    ],
    walls: [
      ...perimeter(30, 40),
      wall(1, 28, 4, 1),
      wall(8, 28, 21, 1),
      wall(1, 14, 21, 1),
      wall(25, 14, 4, 1),
      // The transfer crosses a sealed bulkhead; it is not a cosmetic shortcut.
      wall(14, 15, 1, 13),
      wall(1, 7, 21, 1),
    ],
    plates: [
      { id: 'DISPATCH', ...point(3, 34) },
      { id: 'ROOF', ...point(25, 19) },
    ],
    doors: [
      { id: 'DISPATCH', ...wall(5, 28, 3, 1), signals: ['DISPATCH'] },
      { id: 'ROOF', ...wall(22, 14, 3, 1), signals: ['ROOF'] },
    ],
    portals: [
      { id: '1', ...point(7, 25), to: point(23, 17) },
      { id: '2', ...point(23, 17), to: point(7, 25) },
    ],
    objects: [{ id: 'letter', ...point(10, 25), kind: 'core' }],
  }),
  level('switchyard', 'Switchyard', {
    width: 1920,
    height: 960,
    seconds: 45,
    par: 1,
    core: true,
    subtitle: 'ONE ECHO. TWO APPOINTMENTS.',
    objective: 'Schedule two 2.5-second gates with one Echo. Drive the core through both on time.',
    hint: 'The dispatcher must move, not just hold a plate. Reach signal A, wait until 8 seconds have elapsed (37 remain), activate it, then move to B. Activate B at 16 seconds elapsed (29 remain) and commit. In the delivery loop, collect the core, wait at A’s gate, then follow the upper lane east and turn south at its far end to reach B’s gate. Your Echo opens both on schedule.',
    spawn: point(3, 10),
    exit: point(44, 19),
    regions: [
      { ...wall(1, 1, 18, 8), name: 'DISPATCH A / 08s' },
      { ...wall(1, 15, 18, 8), name: 'DISPATCH B / 16s' },
      { ...wall(21, 1, 15, 13), name: 'UPPER FREIGHT LANE' },
      { ...wall(37, 1, 10, 22), name: 'LAST DEPARTURE' },
    ],
    walls: [
      ...perimeter(48, 24),
      wall(20, 1, 1, 9),
      wall(20, 12, 1, 11),
      wall(36, 1, 1, 17),
      wall(36, 20, 1, 3),
      wall(21, 14, 12, 1),
      wall(10, 3, 1, 5),
      wall(10, 15, 1, 5),
    ],
    switches: [
      { id: 'A', ...point(5, 4), seconds: 2.5 },
      { id: 'B', ...point(5, 18), seconds: 2.5 },
    ],
    doors: [
      { id: 'A', ...wall(20, 10, 1, 2), signals: ['A'] },
      { id: 'B', ...wall(36, 18, 1, 2), signals: ['B'] },
    ],
    objects: [{ id: 'freight', ...point(4, 10), kind: 'core' }],
  }),
];

export function validateLevel(l: Level) {
  if (
    ![l.width, l.height].every(
      (size) => Number.isInteger(size) && size >= 320 && size <= 3840 && size % 40 === 0,
    )
  )
    throw new Error(`${l.id}: dimensions must be tile-aligned, between 320 and 3840`);
  for (const [kind, list] of Object.entries({
    doors: l.doors,
    lasers: l.lasers,
    objects: l.objects,
    turrets: l.turrets,
    portals: l.portals,
  })) {
    if (new Set(list.map((e) => e.id)).size !== list.length)
      throw new Error(`${l.id}: duplicate ${kind} ID`);
  }
  const ids = [...l.plates, ...l.switches].map((x) => x.id);
  if (new Set(ids).size !== ids.length) throw new Error(`${l.id}: duplicate signal ID`);
  const entities = [...l.objects, ...l.turrets, ...l.portals];
  if (new Set(entities.map((e) => e.id)).size !== entities.length)
    throw new Error(`${l.id}: duplicate entity ID`);
  for (const d of [...l.doors, ...l.lasers, { id: 'exit', signals: l.exitSignals ?? [] }])
    for (const s of d.signals)
      if (!ids.includes(s)) throw new Error(`${l.id}/${d.id}: unknown signal ${s}`);
  for (const t of l.turrets)
    if (t.shield && !ids.includes(t.shield)) throw new Error(`${l.id}: unknown shield ${t.shield}`);
  for (const p of [
    l.spawn,
    l.exit,
    ...l.plates,
    ...l.switches,
    ...l.objects,
    ...l.turrets,
    ...l.portals,
    ...l.portals.map((p) => p.to),
  ]) {
    if (
      !Number.isFinite(p.x) ||
      !Number.isFinite(p.y) ||
      p.x < 40 ||
      p.x > l.width - 40 ||
      p.y < 40 ||
      p.y > l.height - 40 ||
      l.walls.some((w) => p.x > w.x && p.x < w.x + w.w && p.y > w.y && p.y < w.y + w.h)
    )
      throw new Error(`${l.id}: entity inside wall or outside playable bounds`);
  }
  if (!Number.isFinite(l.seconds) || l.seconds < 5 || l.seconds > 120)
    throw new Error(`${l.id}: invalid duration`);
  if (l.walls.concat(l.doors).some((r) => touches(l.spawn, r)))
    throw new Error(`${l.id}: spawn overlaps collision geometry`);
  for (const r of [...l.walls, ...l.doors, ...l.lasers, ...(l.regions ?? [])])
    if (
      ![r.x, r.y, r.w, r.h].every(Number.isFinite) ||
      r.w <= 0 ||
      r.h <= 0 ||
      r.x < 0 ||
      r.y < 0 ||
      r.x + r.w > l.width ||
      r.y + r.h > l.height
    )
      throw new Error(`${l.id}: invalid rectangle`);
  for (const p of l.plates)
    if (p.need !== undefined && (!Number.isInteger(p.need) || p.need < 1 || p.need > 13))
      throw new Error(`${l.id}: invalid plate count`);
  for (const s of l.switches)
    if (s.seconds !== undefined && (!Number.isFinite(s.seconds) || s.seconds <= 0))
      throw new Error(`${l.id}: invalid switch timer`);
  for (const laser of l.lasers)
    if (
      laser.period !== undefined &&
      (!Number.isFinite(laser.period) ||
        laser.period <= 0 ||
        (laser.on !== undefined && (laser.on <= 0 || laser.on > laser.period)))
    )
      throw new Error(`${l.id}: invalid laser period`);
}
campaign.forEach(validateLevel);

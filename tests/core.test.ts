import { describe, expect, it } from 'vitest';
import { World } from '../src/core/world';
import { Session } from '../src/core/session';
import { HZ, idle, type Level } from '../src/core/types';
import { campaign, validateLevel, point, wall } from '../src/levels/campaign';
import { parseSave } from '../src/persistence';
import { ticks, go, commit } from './helpers';
const blank = (overrides: Partial<Level> = {}): Level => ({ ...campaign[0], walls: [wall(0, 0, 24, 1), wall(0, 13, 24, 1), wall(0, 0, 1, 14), wall(23, 0, 1, 14)], ...overrides });

describe('deterministic simulation', () => {
  it('normalizes diagonal movement and stops immediately', () => {
    const a = new World(blank()), b = new World(blank());
    for (let i = 0; i < 30; i++) { a.step({ ...idle(), x: 1 }); b.step({ ...idle(), x: 1, y: 1 }); }
    expect(Math.hypot(b.player.x - 140, b.player.y - 300)).toBeCloseTo(a.player.x - 140, 8);
    const x = a.player.x; a.step(); expect(a.player.x).toBe(x);
  });
  it('does not tunnel through walls or boundaries', () => {
    const s = new Session(blank({ walls: [...blank().walls, wall(6, 1, .1, 12)] }));
    ticks(s, 200, { x: 1 }); expect(s.world.player.x).toBeLessThanOrEqual(228);
    ticks(s, 300, { x: -1, y: -1 }); expect(s.world.player.x).toBeGreaterThanOrEqual(52); expect(s.world.player.y).toBeGreaterThanOrEqual(52);
  });
  it('reproduces every checkpoint without drift and holds after early commit', () => {
    const s = new Session(blank());
    ticks(s, 50, { x: 1 }); ticks(s, 28, { y: -1 }); ticks(s, 10); ticks(s, 31, { x: -1, y: 1 });
    const end = { x: s.world.player.x, y: s.world.player.y }; commit(s);
    for (let i = 0; i < 200; i++) { ticks(s, 1); const p = s.runs[0].checkpoints.find(p => p.tick === i); if (p) { expect(s.world.actors[0].x).toBeCloseTo(p.x, 9); expect(s.world.actors[0].y).toBeCloseTo(p.y, 9); } }
    expect(s.world.actors[0].x).toBe(end.x); expect(s.world.actors[0].y).toBe(end.y); expect(s.world.actors[0].desync).toBe(false);
  });
  it('replays discrete interactions once and resets absolute switch timers', () => {
    const s = new Session(blank({ switches: [{ id: 'S', ...point(3, 7), seconds: 2 }] }));
    ticks(s, 15); ticks(s, 1, { interact: true }); ticks(s, 20); commit(s); ticks(s, 40);
    expect(s.world.switchUntil.get('S')).toBe(135);
    expect(s.world.signals.get('S')).toBe(true);
    s.retry(); expect(s.world.switchUntil.size).toBe(0); ticks(s, 136); expect(s.world.signals.get('S')).toBe(false);
  });
  it('rejects object conflicts by stable ID rather than taking a different nearby object', () => {
    const s = new Session(blank({ objects: [{ id: 'core', ...point(3, 7), kind: 'core' }] }));
    ticks(s, 20); ticks(s, 1, { interact: true }); ticks(s, 8); commit(s);
    ticks(s, 1, { interact: true }); ticks(s, 30);
    expect(s.world.objects[0].holder).toBe(0); expect(s.world.actors[0].conflict).toContain('unavailable');
  });
  it('permits walking off a dropped crate without letting actors walk through it later', () => {
    const s = new Session(blank({ objects: [{ id: 'box', ...point(3, 7), kind: 'crate' }] }));
    ticks(s, 1, { interact: true }); ticks(s, 1, { interact: true }); ticks(s, 30, { x: 1 });
    expect(s.world.player.x).toBeGreaterThan(200); ticks(s, 60, { x: -1 }); expect(s.world.player.x).toBeGreaterThan(164);
  });
  it('marks blocked Echo intent as desync without snapping through changed doors', () => {
    const l = blank({ doors: [{ id: 'D', ...wall(7, 1, 1, 12), signals: ['A'] }], switches: [{ id: 'A', ...point(3, 7) }] });
    const s = new Session(l); ticks(s, 1, { interact: true }); ticks(s, 90, { x: 1 }); commit(s);
    // Simulate a changed historical dependency: this run no longer activates A.
    s.runs[0].events = []; s.reset(); ticks(s, 100);
    expect(s.world.actors[0].x).toBeLessThan(280); expect(s.world.actors[0].desync).toBe(true);
  });
  it('death drops carried objects and cancels later actions', () => {
    const s = new Session(blank({ objects: [{ id: 'core', ...point(3, 7), kind: 'core' }] }));
    ticks(s, 1, { interact: true }); ticks(s, 50); ticks(s, 1, { shoot: true }); commit(s); ticks(s, 2);
    s.world.kill(s.world.actors[0], 'test hazard'); ticks(s, 65);
    expect(s.world.objects[0].holder).toBeUndefined(); expect(s.world.bullets).toHaveLength(0);
  });
  it('retry, undo and full reset reconstruct all transient world state', () => {
    const s = new Session(blank({ turrets: [{ id: 'T', ...point(20, 3), range: 10 }], switches: [{ id: 'S', ...point(3, 7) }] }));
    ticks(s, 20, { x: 1, shoot: true }); commit(s); ticks(s, 20); commit(s);
    for (let i = 0; i < 100; i++) { ticks(s, 10, { shoot: true }); s.retry(); expect(s.world.tick).toBe(0); expect(s.world.bullets).toHaveLength(0); expect(s.world.actors).toHaveLength(3); expect(s.world.switchUntil.size).toBe(0); }
    s.undo(); expect(s.runs).toHaveLength(1); expect(s.world.actors).toHaveLength(2); s.clear(); expect(s.world.actors).toHaveLength(1);
  });
  it('survives 12 simultaneous armed Echoes with bounded entities', () => {
    const s = new Session(blank());
    for (let i = 0; i < 12; i++) { ticks(s, 120, { shoot: true }); commit(s); }
    expect(s.world.actors).toHaveLength(13); ticks(s, 130, { shoot: true }); expect(s.world.bullets.length).toBeLessThan(100); expect(s.commit()).toBe(false);
    expect(s.world.actors.every(a => !a.desync)).toBe(true);
  });
  it('completion beats timeout; death beats completion; terminal states stop ticking', () => {
    const w = new World(blank({ seconds: 1 / HZ, exit: point(3, 7) })); w.step(); expect(w.status).toBe('complete'); w.step(); expect(w.tick).toBe(1);
    const dead = new World(blank({ seconds: 1 / HZ, exit: point(3, 7), lasers: [{ id: 'L', ...wall(3, 7, 1, 1), signals: [] }] })); dead.step(); expect(dead.status).toBe('dead');
  });
  it('a closing door waits for its actor to clear the footprint', () => {
    const s = new Session(blank({ switches: [{ id: 'S', ...point(3, 7), seconds: .75 }], doors: [{ id: 'D', ...wall(5, 7, 1, 2), signals: ['S'] }] }));
    ticks(s, 1, { interact: true }); go(s, 220, 300); ticks(s, 50); expect(s.world.doorOpen.get('D')).toBe(true); go(s, 300, 300); ticks(s, 1); expect(s.world.doorOpen.get('D')).toBe(false);
  });
});
describe('data integrity', () => {
  it('validates every campaign level and rejects missing signals and duplicate IDs', () => {
    campaign.forEach(l => expect(() => validateLevel(l)).not.toThrow());
    expect(() => validateLevel(blank({ doors: [{ id: 'D', ...wall(7, 7, 1, 1), signals: ['missing'] }] }))).toThrow('unknown signal');
    expect(() => validateLevel(blank({ plates: [{ id: 'A', ...point(5, 5) }, { id: 'A', ...point(6, 5) }] }))).toThrow('duplicate');
  });
  it('loads safe defaults for corrupt, missing and incompatible saves', () => {
    for (const raw of [null, '{broken', 'null', '[]', '{"version":2}', '{"version":1,"settings":null,"completed":{"x":null}}']) expect(parseSave(raw).settings.volume).toBe(.35);
    const s = parseSave('{"version":1,"completed":{"x":{"echoes":1,"ticks":42},"bad":{"echoes":-1,"ticks":1}},"settings":{"volume":7,"trails":false,"contrast":"yes"}}');
    expect(s.completed.x.echoes).toBe(1); expect(s.completed.bad).toBeUndefined(); expect(s.settings.volume).toBe(1); expect(s.settings.trails).toBe(false); expect(s.settings.contrast).toBe(false);
  });
});

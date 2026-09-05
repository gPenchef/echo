import { describe, expect, it } from 'vitest';
import { Session } from '../src/core/session';
import { campaign } from '../src/levels/campaign';
import { ticks, go, commit, at } from './helpers';

// Real movement, actions and recorded timelines: no teleporting, opening doors,
// disabling hazards or editing actor state. These are reproducible campaign solutions.
export const solutions: ((s: Session) => void)[] = [
  s => { go(s, 140, 460); go(s, 860, 460); go(s, 860, 300); },
  s => { go(s, 260, 180); commit(s); at(s, 120); go(s, 860, 300); },
  s => { go(s, 220, 180); commit(s); at(s, 100); go(s, 540, 300); go(s, 540, 420); commit(s); at(s, 310); go(s, 860, 300); },
  s => { go(s, 220, 180); at(s, 300); ticks(s, 1, { interact: true }); commit(s); go(s, 600, 300); at(s, 300); go(s, 860, 300); },
  s => { go(s, 140, 140); go(s, 260, 140); commit(s); go(s, 140, 140); at(s, 130); go(s, 860, 140); go(s, 860, 300); },
  s => { go(s, 180, 350); ticks(s, 1, { interact: true }); go(s, 260, 180); ticks(s, 1, { interact: true }); go(s, 420, 420); commit(s); at(s, 350); go(s, 460, 140); ticks(s, 1, { interact: true }); go(s, 460, 300); go(s, 860, 300); },
  s => { go(s, 260, 180); commit(s); at(s, 120); go(s, 540, 300); ticks(s, 65, { shoot: true, aim: 0 }); go(s, 860, 300); },
  s => { at(s, 300); ticks(s, 1, { shoot: true, aim: Math.atan2(-160, 80) }); commit(s); go(s, 640, 300); at(s, 325); go(s, 860, 300); },
  s => { const route = () => { go(s, 300, 380); go(s, 460, 380); go(s, 460, 180); go(s, 660, 180); go(s, 780, 300); }; route(); commit(s); route(); commit(s); route(); },
  s => {
    go(s, 220, 140); commit(s);
    at(s, 120); go(s, 460, 300); go(s, 460, 420); commit(s);
    at(s, 300); go(s, 660, 300); go(s, 660, 140); commit(s);
    go(s, 140, 420); ticks(s, 1, { interact: true }); go(s, 140, 300); at(s, 460); go(s, 860, 300);
  },
];
describe('campaign solvability', () => {
  campaign.forEach((level, i) => it(`${i + 1}. ${level.name} is solvable at par with real inputs`, () => {
    const s = new Session(level); solutions[i](s); expect(s.world.status).toBe('complete'); expect(s.runs.length).toBe(level.par); expect(s.world.player.alive).toBe(true);
    expect(s.world.actors.filter(a => a.id).every(a => !a.desync && !a.conflict)).toBe(true);
  }));
});

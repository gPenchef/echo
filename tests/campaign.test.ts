import { describe, expect, it } from 'vitest';
import { Session } from '../src/core/session';
import { campaign } from '../src/levels/campaign';
import { ticks, go, commit, at } from './helpers';

// Real movement, actions and recorded timelines: no teleporting, opening doors,
// disabling hazards or editing actor state. These are reproducible campaign solutions.
export const solutions: ((s: Session) => void)[] = [
  (s) => {
    go(s, 140, 460);
    go(s, 860, 460);
    go(s, 860, 300);
  },
  (s) => {
    go(s, 260, 180);
    commit(s);
    at(s, 120);
    go(s, 860, 300);
  },
  (s) => {
    go(s, 220, 180);
    commit(s);
    at(s, 100);
    go(s, 540, 300);
    go(s, 540, 420);
    commit(s);
    at(s, 310);
    go(s, 860, 300);
  },
  (s) => {
    go(s, 220, 180);
    at(s, 300);
    ticks(s, 1, { interact: true });
    commit(s);
    go(s, 600, 300);
    at(s, 300);
    go(s, 860, 300);
  },
  (s) => {
    go(s, 140, 140);
    go(s, 260, 140);
    commit(s);
    go(s, 140, 140);
    at(s, 130);
    go(s, 860, 140);
    go(s, 860, 300);
  },
  (s) => {
    go(s, 180, 350);
    ticks(s, 1, { interact: true });
    go(s, 260, 180);
    ticks(s, 1, { interact: true });
    go(s, 420, 420);
    commit(s);
    at(s, 350);
    go(s, 460, 140);
    ticks(s, 1, { interact: true });
    go(s, 460, 300);
    go(s, 860, 300);
  },
  (s) => {
    go(s, 260, 180);
    commit(s);
    at(s, 120);
    go(s, 540, 300);
    ticks(s, 65, { shoot: true, aim: 0 });
    go(s, 860, 300);
  },
  (s) => {
    at(s, 300);
    ticks(s, 1, { shoot: true, aim: Math.atan2(-160, 80) });
    commit(s);
    go(s, 140, 480);
    go(s, 640, 480);
    go(s, 640, 300);
    at(s, 325);
    go(s, 860, 300);
  },
  (s) => {
    go(s, 180, 350);
    ticks(s, 1, { interact: true });
    go(s, 323, 220);
    ticks(s, 1, { interact: true });
    go(s, 323, 380);
    commit(s);
    go(s, 220, 140);
    commit(s);
    at(s, 210);
    go(s, 283, 220);
    ticks(s, 1, { interact: true });
    go(s, 580, 220);
    go(s, 580, 300);
    go(s, 860, 300);
  },
  (s) => {
    const route = () => {
      go(s, 300, 380);
      go(s, 460, 380);
      go(s, 460, 180);
      go(s, 660, 180);
      go(s, 780, 300);
    };
    route();
    commit(s);
    route();
    commit(s);
    route();
  },
  (s) => {
    go(s, 220, 140);
    commit(s);
    at(s, 120);
    go(s, 460, 300);
    go(s, 460, 420);
    commit(s);
    at(s, 300);
    go(s, 660, 300);
    go(s, 660, 140);
    commit(s);
    go(s, 140, 420);
    ticks(s, 1, { interact: true });
    go(s, 140, 300);
    at(s, 460);
    go(s, 860, 300);
  },
  (s) => {
    go(s, 780, 100);
    go(s, 140, 100);
    go(s, 140, 140);
    commit(s);
    go(s, 780, 860);
    go(s, 140, 860);
    go(s, 140, 820);
    commit(s);
    at(s, 430);
    go(s, 1380, 460);
    go(s, 1380, 180);
    ticks(s, 1, { interact: true });
    go(s, 1460, 180);
    go(s, 1460, 820);
  },
  (s) => {
    go(s, 140, 1380);
    commit(s);
    at(s, 60);
    go(s, 260, 1420);
    go(s, 260, 1100);
    go(s, 420, 1100);
    go(s, 420, 1020);
    ticks(s, 1, { interact: true });
    go(s, 350, 1020);
    for (let i = 0; i < 30 && s.world.player.x < 800; i++) ticks(s, 1, { x: -1 });
    expect(s.world.player.x).toBe(940);
    go(s, 940, 660);
    ticks(s, 1, { interact: true });
    go(s, 1020, 780);
    commit(s);
    at(s, 450);
    go(s, 260, 1420);
    go(s, 260, 1020);
    for (let i = 0; i < 30 && s.world.player.x < 800; i++) ticks(s, 1, { x: 1 });
    expect(s.world.player.x).toBe(940);
    ticks(s, 1, { interact: true });
    expect(s.world.objects[0].holder).toBe(0);
    go(s, 940, 140);
    go(s, 1020, 140);
  },
  (s) => {
    go(s, 220, 180);
    at(s, 480);
    ticks(s, 1, { interact: true });
    go(s, 220, 740);
    at(s, 960);
    ticks(s, 1, { interact: true });
    commit(s);
    ticks(s, 1, { interact: true });
    go(s, 740, 420);
    at(s, 480);
    go(s, 1380, 420);
    go(s, 1380, 760);
    at(s, 960);
    go(s, 1780, 780);
  },
  (s) => {
    ticks(s, 1, { interact: true });
    go(s, 260, 180);
    ticks(s, 1, { interact: true });
    go(s, 260, 460);
    go(s, 660, 460);
    go(s, 660, 620);
    ticks(s, 1, { interact: true });
    go(s, 820, 780);
    ticks(s, 1, { interact: true });
    go(s, 980, 780);
    go(s, 980, 180);
    commit(s);
    at(s, 950);
    go(s, 860, 460);
    go(s, 860, 820);
    go(s, 1060, 820);
    ticks(s, 1, { interact: true });
    go(s, 1060, 460);
    go(s, 1340, 460);
  },
  (s) => {
    go(s, 220, 180);
    commit(s);
    at(s, 150);
    go(s, 940, 460);
    go(s, 940, 780);
    commit(s);
    at(s, 650);
    go(s, 1100, 460);
    ticks(s, 65, { shoot: true, aim: 0 });
    go(s, 1500, 460);
  },
  (s) => {
    go(s, 940, 540);
    go(s, 220, 540);
    go(s, 220, 220);
    commit(s);
    go(s, 940, 740);
    go(s, 220, 740);
    go(s, 220, 1020);
    commit(s);
    ticks(s, 6);
    commit(s);
    at(s, 450);
    go(s, 1820, 620);
    go(s, 1820, 220);
    go(s, 1700, 220);
    ticks(s, 1, { interact: true });
    go(s, 1820, 220);
    go(s, 1820, 620);
    go(s, 940, 620);
  },
];
describe('campaign solvability', () => {
  it('Interference makes removing an Echo’s laser cover a real causal failure', () => {
    const s = new Session(campaign.find((l) => l.id === 'interference')!);
    go(s, 180, 350);
    ticks(s, 1, { interact: true });
    go(s, 323, 220);
    ticks(s, 1, { interact: true });
    go(s, 323, 380);
    commit(s);
    at(s, 210);
    go(s, 283, 220);
    ticks(s, 1, { interact: true });
    go(s, 380, 220);
    expect(s.world.player.alive).toBe(true);
    expect(s.world.actors[0].alive).toBe(false);
    expect(s.world.signals.get('A')).toBe(false);
    expect(s.world.doorOpen.get('A')).toBe(false);
  });
  campaign.forEach((level, i) =>
    it(`${i + 1}. ${level.name} is solvable at par with real inputs`, () => {
      const s = new Session(level);
      solutions[i](s);
      expect(s.world.status).toBe('complete');
      expect(s.runs.length).toBe(level.par);
      expect(s.world.player.alive).toBe(true);
      expect(s.world.actors.filter((a) => a.id).every((a) => !a.desync && !a.conflict)).toBe(true);
    }),
  );
});

import { expect } from 'vitest';
import { Session } from '../src/core/session';
import { idle, type Input } from '../src/core/types';
export function ticks(s: Session, count: number, input: Partial<Input> = {}) {
  for (let i = 0; i < count; i++) s.world.step({ ...idle(), ...input });
}
export function go(s: Session, x: number, y: number) {
  for (const axis of ['x', 'y'] as const) {
    const target = axis === 'x' ? x : y;
    let guard = 0;
    while (
      Math.abs(s.world.player[axis] - target) > 2 &&
      s.world.status === 'playing' &&
      guard++ < 900
    ) {
      ticks(s, 1, { [axis]: Math.sign(target - s.world.player[axis]) });
    }
    expect(
      Math.abs(s.world.player[axis] - target),
      `${s.level.id}: blocked going ${axis}=${target}, at ${JSON.stringify(s.world.player)}, tick ${s.world.tick}, status ${s.world.status}`,
    ).toBeLessThan(26);
  }
}
export function at(s: Session, tick: number) {
  ticks(s, Math.max(0, tick - s.world.tick));
}
export function commit(s: Session) {
  expect(s.commit()).toBe(true);
}

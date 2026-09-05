import { HZ } from './types';
/** Wall time schedules simulation ticks, never gameplay events. A stalled tab
 * slows the game instead of skipping input/events or doing an unbounded catch-up. */
export class FixedClock {
  remainder = 0;
  clear() {
    this.remainder = 0;
  }
  advance(milliseconds: number, step: () => boolean | void) {
    this.remainder += Math.max(0, Math.min(milliseconds, 100)) / 1000;
    while (this.remainder + 1e-9 >= 1 / HZ) {
      this.remainder -= 1 / HZ;
      if (step() === false) {
        this.clear();
        break;
      }
    }
  }
}

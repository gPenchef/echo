import { World } from './world';
import { type Level, type Run } from './types';
export class Session {
  runs: Run[] = [];
  world: World;
  deaths = 0;
  retries = 0;
  commits = 0;
  constructor(public level: Level) { this.world = new World(level); }
  reset() { this.world = new World(this.level, this.runs); }
  retry() { this.retries++; this.reset(); }
  commit(timeout = false): boolean {
    if (!this.world.player.alive || this.world.tick < 6 || this.runs.length >= 12) return false;
    this.runs.push(this.world.finish(timeout ? 'timeout' : 'commit')); this.commits++; this.reset(); return true;
  }
  undo() { this.runs.pop(); this.reset(); }
  clear() { this.runs = []; this.reset(); }
}

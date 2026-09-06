import { World } from './world';
import { normalRules, type WorldRules, type Level, type Run } from './types';
export class Session {
  runs: Run[] = [];
  world: World;
  deaths = 0;
  retries = 0;
  commits = 0;
  assisted: boolean;
  constructor(
    public level: Level,
    public rules: WorldRules = normalRules(),
  ) {
    this.assisted = Object.values(rules).some(Boolean);
    this.world = new World(level, [], rules);
  }
  reset() {
    this.world = new World(this.level, this.runs, this.rules);
  }
  retry() {
    this.retries++;
    this.reset();
  }
  commit(timeout = false): boolean {
    if (!this.world.player.alive || this.world.tick < 6 || this.runs.length >= 12) return false;
    this.runs.push(this.world.finish(timeout ? 'timeout' : 'commit'));
    this.commits++;
    this.reset();
    return true;
  }
  undo() {
    this.runs.pop();
    this.reset();
  }
  clear() {
    this.runs = [];
    this.reset();
  }
}

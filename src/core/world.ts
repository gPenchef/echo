import { distance, touches, lineBlocked } from './geometry';
import {
  HZ,
  SPEED,
  RADIUS,
  idle,
  normalRules,
  type WorldRules,
  type Actor,
  type Action,
  type Bullet,
  type Carryable,
  type Feedback,
  type Input,
  type Level,
  type Rect,
  type Run,
} from './types';

export class World {
  tick = 0;
  actors: Actor[];
  objects: Carryable[];
  bullets: Bullet[] = [];
  signals = new Map<string, boolean>();
  switchUntil = new Map<string, number>();
  doorOpen = new Map<string, boolean>();
  turretState: { alive: boolean; charge: number; aim: number; target: number }[];
  feedback: Feedback[] = [];
  status: 'playing' | 'dead' | 'complete' | 'timeout' = 'playing';
  recording: Run;
  constructor(
    public level: Level,
    public runs: Run[] = [],
    public rules: WorldRules = normalRules(),
  ) {
    this.actors = [...runs.map((run) => this.actor(run.number, run)), this.actor(0)];
    this.objects = level.objects.map((o) => ({ ...o }));
    this.turretState = level.turrets.map(() => ({ alive: true, charge: 0, aim: 0, target: -1 }));
    this.recording = {
      number: runs.length + 1,
      duration: 0,
      inputs: [],
      checkpoints: [],
      events: [],
      end: 'commit',
    };
    this.updateSignals();
  }
  actor(id: number, run?: Run): Actor {
    return {
      ...this.level.spawn,
      id,
      run,
      aim: 0,
      alive: true,
      cooldown: 0,
      portalCooldown: 0,
      desync: false,
      conflict: '',
      eventCursor: 0,
      checkpointCursor: 0,
    };
  }
  get player() {
    return this.actors[this.actors.length - 1];
  }
  get limit() {
    return Math.round(this.level.seconds * HZ);
  }
  getStatus() {
    return this.status;
  }
  signal(ids: string[]) {
    return ids.every((id) => this.signals.get(id));
  }
  solids(actor?: Actor): Rect[] {
    if (actor && this.rules.noclip) return [];
    return [
      ...this.level.walls,
      ...this.level.doors.filter(
        (d) => !this.doorOpen.get(d.id) || (d.echoOnly && actor?.id === 0),
      ),
      ...this.objects
        .filter((o) => o.kind === 'crate' && o.holder === undefined)
        .map((o) => ({ x: o.x - 13, y: o.y - 13, w: 26, h: 26 }))
        .filter((r) => !actor || !touches(actor, r)),
    ];
  }
  move(actor: Actor, input: Input) {
    const length = Math.max(1, Math.hypot(input.x, input.y));
    const speed = SPEED / HZ;
    const solids = this.solids(actor);
    const nextX = Math.max(
      RADIUS,
      Math.min(this.level.width - RADIUS, actor.x + (input.x / length) * speed),
    );
    if (!solids.some((r) => touches({ x: nextX, y: actor.y }, r, RADIUS))) actor.x = nextX;
    const nextY = Math.max(
      RADIUS,
      Math.min(this.level.height - RADIUS, actor.y + (input.y / length) * speed),
    );
    if (!solids.some((r) => touches({ x: actor.x, y: nextY }, r, RADIUS))) actor.y = nextY;
  }
  updateSignals() {
    for (const p of this.level.plates) {
      const count =
        this.actors.filter((a) => a.alive && distance(a, p) < 23).length +
        this.objects.filter((o) => o.holder === undefined && distance(o, p) < 23).length;
      const active = this.rules.power || count >= (p.need ?? 1);
      if (active !== (this.signals.get(p.id) ?? false))
        this.feedback.push({ ...p, kind: 'signal' });
      this.signals.set(p.id, active);
    }
    for (const s of this.level.switches)
      this.signals.set(s.id, (this.switchUntil.get(s.id) ?? -1) > this.tick);
    if (this.rules.power) for (const id of this.signals.keys()) this.signals.set(id, true);
    for (const d of this.level.doors) {
      // A closing door waits until its footprint is clear; no crushing or trapping.
      const occupied =
        this.actors.some((a) => a.alive && touches(a, d)) ||
        this.objects.some((o) => touches(o, d, 14));
      this.doorOpen.set(d.id, this.signal(d.signals) || (!!this.doorOpen.get(d.id) && occupied));
    }
  }
  interaction(actor: Actor): Action | undefined {
    const held = this.objects.find((o) => o.holder === actor.id);
    if (held) return { tick: this.tick, kind: 'drop', target: held.id };
    const object = this.objects.find((o) => o.holder === undefined && distance(o, actor) < 43);
    if (object) return { tick: this.tick, kind: 'pickup', target: object.id };
    const sw = this.level.switches.find((s) => !s.target && distance(s, actor) < 43);
    if (sw) return { tick: this.tick, kind: 'switch', target: sw.id };
  }
  action(actor: Actor, event: Action) {
    if (!actor.alive) return;
    const previousConflict = actor.conflict;
    if (event.kind === 'shoot') {
      if (actor.cooldown > 0) return;
      const aim = event.aim ?? actor.aim;
      this.bullets.push({
        x: actor.x + Math.cos(aim) * 16,
        y: actor.y + Math.sin(aim) * 16,
        vx: (Math.cos(aim) * 420) / HZ,
        vy: (Math.sin(aim) * 420) / HZ,
        hostile: false,
        life: 100,
      });
      actor.cooldown = 15;
      this.feedback.push({ ...actor, kind: 'shot' });
    } else if (event.kind === 'switch') {
      const sw = this.level.switches.find((s) => s.id === event.target);
      if (sw && distance(sw, actor) < 43) {
        this.switchUntil.set(
          sw.id,
          sw.seconds ? this.tick + Math.round(sw.seconds * HZ) : Infinity,
        );
        this.feedback.push({ ...sw, kind: 'signal' });
      } else actor.conflict = 'Switch out of reach';
    } else if (event.kind === 'pickup') {
      const object = this.objects.find((o) => o.id === event.target);
      if (
        object &&
        object.holder === undefined &&
        distance(object, actor) < 43 &&
        !this.objects.some((o) => o.holder === actor.id)
      ) {
        object.holder = actor.id;
        this.feedback.push({ ...actor, kind: 'signal' });
      } else actor.conflict = 'Recorded object unavailable';
    } else if (event.kind === 'drop') {
      const object = this.objects.find((o) => o.id === event.target && o.holder === actor.id);
      if (object) {
        object.holder = undefined;
        object.x = actor.x;
        object.y = actor.y;
        this.feedback.push({ ...actor, kind: 'signal' });
      } else actor.conflict = 'Nothing to drop';
    }
    if (actor.id && actor.conflict && actor.conflict !== previousConflict)
      this.feedback.push({
        ...actor,
        kind: 'warning',
        text: `E${actor.id} CONFLICT · ${actor.conflict}. Its remaining actions still replay.`,
      });
  }
  kill(actor: Actor, cause: string) {
    if (this.rules.god) return;
    if (!actor.alive) return;
    actor.alive = false;
    for (const o of this.objects.filter((o) => o.holder === actor.id)) {
      o.holder = undefined;
      o.x = actor.x;
      o.y = actor.y;
    }
    this.feedback.push({
      ...actor,
      kind: 'death',
      text: actor.id
        ? `E${actor.id} LOST · ${cause}. Later actions cancelled.`
        : `${cause} · R to retry. Your recordings are kept.`,
    });
    if (!actor.id) {
      this.status = 'dead';
      this.recording.events.push({ tick: this.tick, kind: 'death' });
    }
  }
  laserActive(index: number) {
    if (this.rules.power) return false;
    const l = this.level.lasers[index];
    if (l.signals.length && this.signal(l.signals)) return false;
    return !l.period || (this.tick / HZ + (l.phase ?? 0)) % l.period < (l.on ?? l.period / 2);
  }
  laserBounds(index: number): Rect {
    const l = this.level.lasers[index],
      vertical = l.h >= l.w;
    const result = { x: l.x, y: l.y, w: l.w, h: l.h };
    // Emitters travel down/right. A physical crate clips the beam; cores do not.
    for (const o of this.objects)
      if (o.kind === 'crate' && touches(o, result, 13)) {
        if (vertical) result.h = Math.max(0, Math.min(result.h, o.y - 13 - l.y));
        else result.w = Math.max(0, Math.min(result.w, o.x - 13 - l.x));
      }
    return result;
  }
  step(input: Input = idle()) {
    if (this.status !== 'playing') return;
    this.feedback = [];
    this.recording.inputs.push({ ...input, interact: false, shoot: false });
    this.updateSignals();
    for (const actor of this.actors) {
      if (!actor.alive) continue;
      actor.cooldown = Math.max(0, actor.cooldown - 1);
      actor.portalCooldown = Math.max(0, actor.portalCooldown - 1);
      const recorded = actor.run?.inputs[this.tick];
      const intent = actor.run ? (recorded ?? { ...idle(), aim: actor.aim }) : input;
      actor.aim = intent.aim;
      this.move(actor, intent);
      if (actor.run) {
        while (
          actor.eventCursor < actor.run.events.length &&
          actor.run.events[actor.eventCursor].tick <= this.tick
        ) {
          this.action(actor, actor.run.events[actor.eventCursor++]);
        }
      } else {
        const events: Action[] = [];
        if (input.interact) {
          const event = this.interaction(actor);
          if (event) events.push(event);
        }
        if (input.shoot && !actor.cooldown)
          events.push({ tick: this.tick, kind: 'shoot', aim: actor.aim });
        for (const event of events) {
          this.recording.events.push(event);
          this.action(actor, event);
        }
      }
      for (const portal of this.level.portals)
        if (
          !actor.portalCooldown &&
          distance(actor, portal) < 19 &&
          !this.solids(actor).some((r) => touches(portal.to, r))
        ) {
          actor.x = portal.to.x;
          actor.y = portal.to.y;
          actor.portalCooldown = 45;
          this.feedback.push({ ...actor, kind: 'teleport' });
          if (!actor.id)
            this.recording.events.push({ tick: this.tick, kind: 'teleport', target: portal.id });
          break;
        }
      for (const object of this.objects.filter((o) => o.holder === actor.id)) {
        object.x = actor.x;
        object.y = actor.y;
      }
      const checkpoint = actor.run?.checkpoints[actor.checkpointCursor];
      if (checkpoint && checkpoint.tick === this.tick) {
        const wasDesynced = actor.desync;
        actor.desync = distance(actor, checkpoint) > (wasDesynced ? 20 : 36);
        actor.checkpointCursor++;
        if (actor.desync && !wasDesynced)
          this.feedback.push({
            ...actor,
            kind: 'warning',
            text: `E${actor.id} DESYNC · Its route is blocked or changed. Tab to inspect history.`,
          });
      }
    }
    this.updateSignals();
    for (let i = 0; i < this.level.lasers.length; i++)
      if (this.laserActive(i)) {
        const beam = this.laserBounds(i);
        for (const a of this.actors)
          if (a.alive && beam.w > 0 && beam.h > 0 && touches(a, beam, 9))
            this.kill(a, 'Laser contact');
      }
    this.stepTurrets();
    this.stepBullets();
    this.updateSignals();
    if (this.tick % 6 === 0)
      this.recording.checkpoints.push({ x: this.player.x, y: this.player.y, tick: this.tick });
    this.tick++;
    this.recording.duration = this.tick;
    // Death wins over exit. A live exit wins over the timeout on the same tick.
    if (
      this.player.alive &&
      distance(this.player, this.level.exit) < 24 &&
      this.signal(this.level.exitSignals ?? []) &&
      (!this.level.core ||
        this.objects.some((o) => o.kind === 'core' && distance(o, this.level.exit) < 35))
    )
      this.status = 'complete';
    if (this.status === 'playing' && this.tick >= this.limit) this.status = 'timeout';
  }
  stepTurrets() {
    const cover = this.solids();
    this.level.turrets.forEach((t, i) => {
      const state = this.turretState[i];
      if (!state.alive) return;
      const target = this.actors
        .filter((a) => a.alive && distance(a, t) < t.range && !lineBlocked(t, a, cover))
        .sort((a, b) => distance(a, t) - distance(b, t) || a.id - b.id)[0];
      if (!target) {
        state.charge = 0;
        state.target = -1;
        return;
      }
      if (state.target !== target.id) state.charge = 0;
      state.target = target.id;
      state.aim = Math.atan2(target.y - t.y, target.x - t.x);
      if (++state.charge >= 72) {
        this.bullets.push({
          x: t.x,
          y: t.y,
          vx: (Math.cos(state.aim) * 210) / HZ,
          vy: (Math.sin(state.aim) * 210) / HZ,
          life: 200,
          hostile: true,
        });
        state.charge = -18;
        this.feedback.push({ ...t, kind: 'shot' });
      }
    });
  }
  stepBullets() {
    const cover = this.solids();
    for (const b of this.bullets) {
      // Substeps prevent thin doors and targets being skipped by fast projectiles.
      for (let n = 0; n < 2 && b.life > 0; n++) {
        b.x += b.vx / 2;
        b.y += b.vy / 2;
        if (cover.some((r) => touches(b, r, 3))) b.life = 0;
        if (b.life && b.hostile) {
          const a = this.actors.find((a) => a.alive && distance(a, b) < 14);
          if (a) {
            this.kill(a, 'Turret fire');
            b.life = 0;
          }
        } else if (b.life) {
          const s = this.level.switches.find((s) => s.target && distance(s, b) < 17);
          if (s) {
            this.switchUntil.set(s.id, s.seconds ? this.tick + s.seconds * HZ : Infinity);
            b.life = 0;
            this.feedback.push({ ...s, kind: 'signal' });
          }
          this.level.turrets.forEach((t, i) => {
            if (this.turretState[i].alive && distance(t, b) < 18) {
              if (!t.shield || this.signals.get(t.shield)) this.turretState[i].alive = false;
              b.life = 0;
            }
          });
        }
      }
      if (b.life <= 0) this.feedback.push({ ...b, kind: 'impact' });
      b.life--;
    }
    this.bullets = this.bullets.filter((b) => b.life > 0);
  }
  finish(end: Run['end']): Run {
    return { ...this.recording, end };
  }
}

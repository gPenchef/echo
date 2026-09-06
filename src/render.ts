import Phaser from 'phaser';
import type { World } from './core/world';
import type { Settings } from './persistence';
import type { Feedback } from './core/types';
import { chamberView, type ChamberView } from './view';

const C = {
  floor: 0x101c28,
  wall: 0x1c2b3b,
  edge: 0x34495d,
  cyan: 0x68dfed,
  white: 0xf1f5e9,
  gold: 0xffd78b,
  red: 0xff657d,
  muted: 0x637c91,
};
export class Renderer {
  g: Phaser.GameObjects.Graphics;
  labels: Phaser.GameObjects.Text[] = [];
  labelCount = 0;
  particles: (Feedback & { age: number })[] = [];
  view: ChamberView = { x: 0, y: 0, w: 960, h: 560, zoom: 1 };
  constructor(public scene: Phaser.Scene) {
    this.g = scene.add.graphics();
  }
  label(x: number, y: number, text: string, color = '#8296aa', size = 11) {
    let label = this.labels[this.labelCount++];
    if (!label) {
      label = this.scene.add
        .text(x, y, '', { fontFamily: 'monospace', fontSize: size })
        .setOrigin(0.5);
      this.labels.push(label);
    }
    // Phaser's setColor rebuilds its text texture even when the color is unchanged.
    if (label.style.color !== color) label.setColor(color);
    label
      .setPosition(x, y)
      .setText(text)
      .setFontSize(Math.max(size, 9 / this.view.zoom))
      .setVisible(true);
  }
  effects(feedback: Feedback[]) {
    this.particles.push(...feedback.map((f) => ({ ...f, age: 0 })));
    if (this.particles.length > 90) this.particles.splice(0, this.particles.length - 90);
  }
  draw(world: World, settings: Settings, delta: number, planning: boolean) {
    const g = this.g,
      l = world.level,
      time = world.tick / 60;
    this.view = chamberView(l, world.player, planning);
    this.scene.cameras.main
      .setZoom(this.view.zoom)
      .centerOn(this.view.x + this.view.w / 2, this.view.y + this.view.h / 2);
    g.clear();
    this.labelCount = 0;
    g.fillStyle(0x090f18).fillRect(0, 0, l.width, l.height);
    g.fillStyle(C.floor).fillRect(40, 40, l.width - 80, l.height - 80);
    for (const [i, region] of (l.regions ?? []).entries()) {
      g.fillStyle(i % 2 ? 0x23404a : 0x353450, 0.18).fillRect(
        region.x,
        region.y,
        region.w,
        region.h,
      );
      this.label(
        region.x + region.w / 2,
        region.y + 25,
        region.name,
        '#638a9c',
        planning ? 24 : 16,
      );
    }
    g.lineStyle(1, 0x213245, 0.45);
    for (let x = 40; x <= l.width - 40; x += 40) g.lineBetween(x, 40, x, l.height - 40);
    for (let y = 40; y <= l.height - 40; y += 40) g.lineBetween(40, y, l.width - 40, y);
    for (let x = 60; x < l.width - 40; x += 80)
      for (let y = 60; y < l.height - 40; y += 80) g.fillStyle(0x456278, 0.28).fillCircle(x, y, 1);
    // Physical circuit traces and matching labels make connections readable without color.
    for (const device of [...l.doors, ...l.lasers])
      for (const id of device.signals) {
        const source = [...l.plates, ...l.switches].find((p) => p.id === id);
        if (!source) continue;
        const x = device.x + device.w / 2,
          y = device.y + device.h / 2;
        g.lineStyle(
          planning ? 3 : 1,
          world.signals.get(id) ? C.cyan : C.muted,
          planning ? 0.65 : 0.28,
        );
        g.beginPath().moveTo(source.x, source.y).lineTo(x, source.y).lineTo(x, y).strokePath();
      }
    const spawn = l.spawn;
    g.lineStyle(1, C.muted, 0.5).strokeCircle(spawn.x, spawn.y, 24);
    if (Math.hypot(spawn.x - l.exit.x, spawn.y - l.exit.y) > 60)
      this.label(spawn.x, spawn.y + 34, 'ORIGIN', '#637c91', 9);
    const unlocked =
      world.signal(l.exitSignals ?? []) &&
      (!l.core ||
        world.objects.some(
          (o) => o.kind === 'core' && Math.hypot(o.x - l.exit.x, o.y - l.exit.y) < 35,
        ));
    const e = l.exit;
    g.fillStyle(C.white, 0.04).fillRoundedRect(e.x - 28, e.y - 28, 56, 56, 7);
    g.lineStyle(2, unlocked ? C.white : C.muted, 0.9).strokeRoundedRect(
      e.x - 24,
      e.y - 24,
      48,
      48,
      5,
    );
    g.lineStyle(1, C.white, 0.3).strokeCircle(
      e.x,
      e.y,
      16 + (settings.reducedMotion ? 0 : Math.sin(time * 3) * 2),
    );
    g.lineStyle(2, C.white, 0.8)
      .lineBetween(e.x - 8, e.y, e.x + 8, e.y)
      .lineBetween(e.x + 2, e.y - 6, e.x + 8, e.y)
      .lineBetween(e.x + 2, e.y + 6, e.x + 8, e.y);
    const exitLabelY = l.plates.some((p) => Math.hypot(p.x - e.x, p.y - e.y) < 35) ? 62 : 40;
    this.label(e.x, e.y + exitLabelY, l.core ? 'CORE → EXIT' : 'EXTRACTION', '#c4d0cf', 10);
    for (const p of l.plates) {
      const active = world.signals.get(p.id),
        radius = p.need ? 30 : 22;
      g.fillStyle(C.cyan, active ? 0.2 : 0.04).fillRoundedRect(
        p.x - radius,
        p.y - radius,
        radius * 2,
        radius * 2,
        5,
      );
      g.lineStyle(2, active ? C.cyan : C.muted).strokeRoundedRect(
        p.x - radius,
        p.y - radius,
        radius * 2,
        radius * 2,
        5,
      );
      g.lineStyle(1, C.cyan, 0.4).strokeRect(p.x - 15, p.y - 15, 30, 30);
      const count = world.actors.filter(
        (a) => a.alive && Math.hypot(a.x - p.x, a.y - p.y) < 23,
      ).length;
      this.label(
        p.x,
        p.y - radius - 12,
        p.need
          ? `${p.id} ${Math.min(count, p.need)}/${p.need}`
          : `${p.id} ${active ? '● ON' : '○'}`,
        active ? '#9ef3ed' : '#91a5b8',
      );
    }
    for (const w of l.walls) {
      g.fillStyle(0x050b11, 0.7).fillRect(w.x + 5, w.y + 5, w.w, w.h);
      g.fillStyle(C.wall).fillRect(w.x, w.y, w.w, w.h);
      g.lineStyle(1, C.edge).strokeRect(w.x + 0.5, w.y + 0.5, w.w - 1, w.h - 1);
      g.lineStyle(2, 0x42586b, 0.45).lineBetween(w.x + 4, w.y + 3, w.x + w.w - 4, w.y + 3);
      if (w.h > 80 && w.w === 40)
        for (let y = w.y + 20; y < w.y + w.h; y += 40)
          g.fillStyle(0x0c1722).fillRect(w.x + 13, y, 14, 3);
    }
    for (const d of l.doors) {
      const open = world.doorOpen.get(d.id);
      g.fillStyle(open ? C.cyan : 0x273f50, open ? 0.07 : 0.9).fillRect(d.x, d.y, d.w, d.h);
      g.lineStyle(2, open ? C.cyan : C.gold, 0.8).strokeRect(d.x + 2, d.y + 2, d.w - 4, d.h - 4);
      if (!open)
        for (let y = d.y + 10; y < d.y + d.h; y += 12)
          g.lineStyle(2, C.gold, 0.35).lineBetween(d.x + 5, y, d.x + d.w - 5, y + 6);
      this.label(d.x + d.w / 2, d.y + d.h / 2, open ? '⋮' : d.id, open ? '#68dfed' : '#ffd78b', 14);
    }
    for (const s of l.switches) {
      const active = world.signals.get(s.id);
      g.fillStyle(active ? C.cyan : 0x263d4c).fillCircle(s.x, s.y, 16);
      g.lineStyle(2, active ? C.white : C.cyan).strokeCircle(s.x, s.y, 18);
      if (s.target)
        g.lineStyle(2, C.floor)
          .strokeCircle(s.x, s.y, 8)
          .lineBetween(s.x - 12, s.y, s.x + 12, s.y)
          .lineBetween(s.x, s.y - 12, s.x, s.y + 12);
      else this.label(s.x, s.y, 'E', active ? '#142c35' : '#b6e8e8', 14);
      const left = Math.max(0, ((world.switchUntil.get(s.id) ?? 0) - world.tick) / 60);
      this.label(
        s.x,
        s.y - 31,
        `${s.id} · ${s.seconds ? (active ? left.toFixed(1) + 's' : s.seconds + 's') : 'LATCH'}`,
        '#9ed0d6',
      );
    }
    l.lasers.forEach((laser, i) => {
      const live = world.laserActive(i),
        beam = world.laserBounds(i),
        vertical = laser.h >= laser.w;
      const x = vertical ? beam.x + beam.w / 2 : beam.x,
        y = vertical ? beam.y : beam.y + beam.h / 2;
      const length = vertical ? beam.h : beam.w,
        fullLength = vertical ? laser.h : laser.w;
      const phase = laser.period ? (time + (laser.phase ?? 0)) % laser.period : 0;
      const warning =
        !live &&
        laser.period &&
        laser.period - phase < 0.5 &&
        !(laser.signals.length && world.signal(laser.signals));
      const color = live ? C.red : warning ? C.gold : C.cyan;
      const endX = x + (vertical ? 0 : length),
        endY = y + (vertical ? length : 0);
      g.lineStyle(live ? 12 : 1, color, live ? 0.1 : 0.5).lineBetween(x, y, endX, endY);
      if (live) g.lineStyle(3, C.red).lineBetween(x, y, endX, endY);
      else
        for (let n = 0; n < length; n += 14)
          g.lineStyle(1, color, 0.45).lineBetween(
            x + (vertical ? 0 : n),
            y + (vertical ? n : 0),
            x + (vertical ? 0 : Math.min(length, n + 6)),
            y + (vertical ? Math.min(length, n + 6) : 0),
          );
      if (length < fullLength)
        for (let n = length + 28; n < fullLength; n += 14)
          g.lineStyle(1, C.cyan, 0.4).lineBetween(
            x + (vertical ? 0 : n),
            y + (vertical ? n : 0),
            x + (vertical ? 0 : Math.min(fullLength, n + 6)),
            y + (vertical ? Math.min(fullLength, n + 6) : 0),
          );
      g.fillStyle(color)
        .fillRect(x - 6, y - 6, 12, 12)
        .fillRect(x + (vertical ? 0 : fullLength) - 6, y + (vertical ? fullLength : 0) - 6, 12, 12);
      this.label(
        x + 36,
        y + 22,
        warning ? 'ARMING' : live ? (length < fullLength ? 'BLOCKED' : 'LIVE') : 'SAFE',
        live ? '#ff8799' : warning ? '#ffd78b' : '#68dfed',
        10,
      );
    });
    for (const p of l.portals) {
      if (planning) {
        g.lineStyle(2, C.cyan, 0.35).lineBetween(p.x, p.y, p.to.x, p.to.y);
      }
      g.fillStyle(C.cyan, 0.08).fillCircle(p.x, p.y, 26);
      g.lineStyle(3, C.cyan).strokeCircle(p.x, p.y, 21);
      g.lineStyle(1, C.cyan, 0.5).strokeCircle(p.x, p.y, 27);
      this.label(p.x, p.y - 39, `TRANSFER ${p.id}`, '#9ed0d6', 11);
      this.label(p.x, p.y, '↗', '#9ed0d6', 20);
    }
    l.turrets.forEach((t, i) => {
      const s = world.turretState[i];
      if (!s.alive) {
        g.lineStyle(2, C.muted, 0.4).strokeCircle(t.x, t.y, 14);
        this.label(t.x, t.y + 25, 'OFFLINE', '#637c91', 9);
        return;
      }
      if (s.charge > 0)
        g.lineStyle(1, C.red, 0.15 + s.charge / 144).lineBetween(
          t.x,
          t.y,
          t.x + Math.cos(s.aim) * t.range,
          t.y + Math.sin(s.aim) * t.range,
        );
      g.fillStyle(0x3b2330).fillCircle(t.x, t.y, 18);
      g.lineStyle(2, C.red).strokeCircle(t.x, t.y, 18);
      g.lineStyle(5, C.red).lineBetween(
        t.x,
        t.y,
        t.x + Math.cos(s.aim) * 26,
        t.y + Math.sin(s.aim) * 26,
      );
      if (t.shield && !world.signals.get(t.shield))
        g.lineStyle(2, C.gold, 0.7).strokeCircle(t.x, t.y, 24);
      this.label(
        t.x,
        t.y - 33,
        t.shield && !world.signals.get(t.shield)
          ? `SHIELD ${t.shield}`
          : s.charge > 20
            ? 'ACQUIRING'
            : 'SENTRY',
        '#ff8799',
        10,
      );
    });
    for (const a of world.actors)
      if (a.run && (planning || settings.trails)) {
        const points = a.run.checkpoints.filter(
          (p) => planning || (p.tick <= world.tick && p.tick > world.tick - 42),
        );
        g.lineStyle(planning ? 2 : 3, a.desync ? C.gold : C.cyan, planning ? 0.35 : 0.2);
        for (let i = 1; i < points.length; i++)
          g.lineBetween(points[i - 1].x, points[i - 1].y, points[i].x, points[i].y);
      }
    // Echoes render first. The current self remains legible when bodies overlap.
    for (const a of world.actors) {
      if (!a.alive) {
        g.lineStyle(2, C.red, 0.5)
          .lineBetween(a.x - 6, a.y - 6, a.x + 6, a.y + 6)
          .lineBetween(a.x + 6, a.y - 6, a.x - 6, a.y + 6);
        continue;
      }
      const color = a.id ? (a.desync || a.conflict ? C.gold : C.cyan) : C.gold;
      g.fillStyle(color, a.id ? 0.06 : 0.08).fillCircle(a.x, a.y, 24);
      g.fillStyle(0x040a10, 0.7).fillEllipse(a.x + 2, a.y + 10, 25, 12);
      g.fillStyle(color, a.id ? (settings.contrast ? 0.65 : 0.22) : 1).fillCircle(a.x, a.y, 11);
      g.lineStyle(a.id ? 2 : 1, a.id ? color : C.white).strokeCircle(a.x, a.y, 12);
      g.lineStyle(3, a.id ? color : C.white).lineBetween(
        a.x + Math.cos(a.aim) * 8,
        a.y + Math.sin(a.aim) * 8,
        a.x + Math.cos(a.aim) * 19,
        a.y + Math.sin(a.aim) * 19,
      );
      if (a.id) {
        g.lineStyle(1, color, 0.6)
          .lineBetween(a.x - 7, a.y - 3, a.x + 7, a.y - 3)
          .lineBetween(a.x - 7, a.y + 3, a.x + 7, a.y + 3);
      }
      const carrying = world.objects.some((o) => o.holder === a.id);
      const onPlate = l.plates.some((p) => Math.hypot(p.x - a.x, p.y - a.y) < 23);
      const labelOffset = carrying ? -49 : onPlate ? 25 + (a.id % 3) * 10 : -25 - (a.id % 3) * 10;
      this.label(
        a.x,
        a.y + labelOffset,
        a.id ? `E${a.id}${a.desync || a.conflict ? ' !' : ''}` : 'YOU',
        a.id ? '#68dfed' : '#ffe0a8',
        10,
      );
    }
    for (const o of world.objects) {
      const y = o.y - (o.holder !== undefined ? 23 : 0);
      g.fillStyle(o.kind === 'core' ? C.gold : 0x536a79, 0.8);
      if (o.kind === 'core') {
        g.fillTriangle(o.x, y - 12, o.x + 10, y, o.x, y + 12).fillTriangle(
          o.x,
          y - 12,
          o.x - 10,
          y,
          o.x,
          y + 12,
        );
        g.lineStyle(1, C.white).strokeCircle(o.x, y, 17);
      } else {
        g.fillRoundedRect(o.x - 13, y - 13, 26, 26, 3);
        g.lineStyle(2, C.white, 0.7).strokeRect(o.x - 9, y - 9, 18, 18);
      }
      if (o.holder === undefined) this.label(o.x, y + 26, o.kind.toUpperCase(), '#b1c2c9', 9);
    }
    for (const b of world.bullets) {
      g.lineStyle(3, b.hostile ? C.red : C.gold).lineBetween(
        b.x,
        b.y,
        b.x - b.vx * 2,
        b.y - b.vy * 2,
      );
      g.fillStyle(C.white).fillCircle(b.x, b.y, 2);
    }
    for (const p of this.particles) {
      p.age += delta;
      if (settings.reducedMotion) continue;
      const life = 1 - p.age / 420;
      const color = p.kind === 'death' ? C.red : p.kind === 'shot' ? C.gold : C.cyan;
      g.lineStyle(2, color, Math.max(0, life * 0.6)).strokeCircle(p.x, p.y, 8 + p.age / 14);
      if (p.kind === 'death')
        for (let n = 0; n < 8; n++) {
          const angle = (n * Math.PI) / 4;
          g.fillStyle(color, Math.max(0, life)).fillRect(
            p.x + (Math.cos(angle) * p.age) / 9,
            p.y + (Math.sin(angle) * p.age) / 9,
            3,
            3,
          );
        }
    }
    this.particles = this.particles.filter((p) => p.age < 420);
    const prompt = world.interaction(world.player);
    if (prompt && world.player.alive && !planning)
      this.label(
        world.player.x,
        world.player.y + 39,
        `E · ${prompt.kind === 'switch' ? 'ACTIVATE ' + prompt.target : prompt.kind.toUpperCase()}`,
        '#f2dfb7',
        11,
      );
    for (let i = this.labelCount; i < this.labels.length; i++) this.labels[i].setVisible(false);
  }
  clearEffects() {
    this.particles = [];
  }
}

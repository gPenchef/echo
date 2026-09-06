import { describe, expect, it } from 'vitest';
import { parseCheat } from '../src/cheats';
import { Session } from '../src/core/session';
import { campaign } from '../src/levels/campaign';
import { idle, normalRules } from '../src/core/types';
import { formatCountdown } from '../src/core/clock';

describe('testing tools', () => {
  it('parses only supported commands and valid one-based chamber numbers', () => {
    expect(parseCheat('  god  ', 17)).toEqual({ kind: 'GOD' });
    expect(parseCheat('warp   17', 17)).toEqual({ kind: 'WARP', index: 16 });
    for (const command of [
      'WARP 0',
      'WARP 18',
      'WARP -1',
      'WARP 1.5',
      'WARP 1; NEXT',
      '<script>',
      '',
      'GOD ON',
    ])
      expect(parseCheat(command, 17)).toBeUndefined();
  });
  it('keeps normal play unmodified and carries explicit test rules across reconstruction', () => {
    const plain = new Session(campaign[4]);
    expect(plain.assisted).toBe(false);
    plain.world.kill(plain.world.player, 'test');
    expect(plain.world.status).toBe('dead');
    const rules = { ...normalRules(), god: true };
    const s = new Session(campaign[4], rules);
    expect(s.assisted).toBe(true);
    for (let i = 0; i < 6; i++) s.world.step();
    expect(s.commit()).toBe(true);
    for (const actor of s.world.actors) s.world.kill(actor, 'test');
    expect(s.world.actors.every((a) => a.alive)).toBe(true);
    s.retry();
    expect(s.world.rules).toBe(rules);
    s.undo();
    expect(s.world.rules.god).toBe(true);
  });
  it('no-clip crosses geometry without allowing actors to escape the world', () => {
    const s = new Session(campaign[1], { ...normalRules(), noclip: true });
    for (let i = 0; i < 240; i++) s.world.step({ ...idle(), x: 1 });
    expect(s.world.player.x).toBeGreaterThan(520);
    for (let i = 0; i < 300; i++) s.world.step({ ...idle(), y: -1 });
    expect(s.world.player.y).toBe(12);
  });
  it('POWER holds circuits active without repeatedly generating signal events', () => {
    const s = new Session(campaign[10], { ...normalRules(), power: true });
    s.world.step();
    expect([...s.world.doorOpen.values()].every(Boolean)).toBe(true);
    expect(s.world.laserActive(0)).toBe(false);
    expect(s.world.feedback.filter((f) => f.kind === 'signal')).toHaveLength(0);
    s.retry();
    expect(s.world.laserActive(0)).toBe(false);
    s.rules.power = false;
    s.world.updateSignals();
    expect(s.world.laserActive(0)).toBe(true);
    expect(s.assisted).toBe(true);
  });
  it('formats minute-long loops without displaying sixty seconds', () => {
    expect(formatCountdown(60)).toBe('01:00.0');
    expect(formatCountdown(59.8)).toBe('00:59.8');
    expect(formatCountdown(120)).toBe('02:00.0');
    expect(formatCountdown(-1)).toBe('00:00.0');
  });
});

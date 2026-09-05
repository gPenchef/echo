import { describe, expect, it } from 'vitest';
import { chamberView, pointerToWorld } from '../src/view';
import { campaign, validateLevel } from '../src/levels/campaign';
import { World } from '../src/core/world';
import { idle } from '../src/core/types';

describe('variable-size worlds and camera', () => {
  it('keeps original chambers at their existing scale and coordinates', () => {
    for (const level of campaign.slice(0, 11)) {
      const view = chamberView(level, level.spawn, false);
      expect(view).toEqual({ x: 0, y: 0, w: 960, h: 560, zoom: 1 });
      expect(pointerToWorld({ x: 123, y: 321 }, view)).toEqual({ x: 123, y: 321 });
    }
  });
  it('follows the player, clamps at all edges, and fits wide and tall overview maps', () => {
    for (const level of campaign.slice(11)) {
      for (const focus of [{ x: 0, y: 0 }, level.spawn, { x: level.width, y: level.height }]) {
        const view = chamberView(level, focus, false);
        expect(view.zoom).toBe(1);
        expect(view.x).toBeGreaterThanOrEqual(0);
        expect(view.y).toBeGreaterThanOrEqual(0);
        expect(view.x + view.w).toBeLessThanOrEqual(level.width);
        expect(view.y + view.h).toBeLessThanOrEqual(level.height);
      }
      const map = chamberView(level, level.spawn, true);
      expect(map.x).toBeLessThanOrEqual(1e-9);
      expect(map.y).toBeLessThanOrEqual(1e-9);
      expect(map.x + map.w).toBeGreaterThanOrEqual(level.width - 1e-9);
      expect(map.y + map.h).toBeGreaterThanOrEqual(level.height - 1e-9);
      expect(pointerToWorld({ x: 480, y: 280 }, map)).toEqual({
        x: level.width / 2,
        y: level.height / 2,
      });
    }
  });
  it('letterboxes a smaller custom chamber without stretching it', () => {
    const view = chamberView({ width: 640, height: 400 }, { x: 100, y: 100 }, false);
    expect(view).toEqual({ x: -160, y: -80, w: 960, h: 560, zoom: 1 });
    expect(pointerToWorld({ x: 480, y: 280 }, view)).toEqual({ x: 320, y: 200 });
  });
  it('rejects invalid dimensions and validates geometry against each level, not the old size', () => {
    const large = campaign[11];
    expect(() => validateLevel(large)).not.toThrow();
    for (const width of [0, 319, 961, NaN, Infinity, 4000])
      expect(() => validateLevel({ ...large, width })).toThrow('dimensions');
    expect(() => validateLevel({ ...large, exit: { x: large.width, y: 100 } })).toThrow('bounds');
    expect(() =>
      validateLevel({
        ...large,
        portals: [{ id: 'bad', x: 100, y: 100, to: { x: 5000, y: 100 } }],
      }),
    ).toThrow('bounds');
    expect(() => validateLevel({ ...large, walls: [{ x: 1580, y: 40, w: 80, h: 40 }] })).toThrow(
      'rectangle',
    );
  });
  it('enforces world boundaries even if an authored perimeter has a gap', () => {
    const world = new World({
      ...campaign[11],
      walls: [],
      objects: [],
      doors: [],
      exit: { x: 100, y: 900 },
    });
    for (let i = 0; i < 1200; i++) world.step({ ...idle(), x: 1, y: 1 });
    expect(world.player.x).toBe(1588);
    expect(world.player.y).toBe(948);
  });
});

import { test, expect, type Page } from '@playwright/test';
type Debug = {
  session: {
    world: {
      player: { x: number; y: number };
      tick: number;
      status: string;
      actors: { alive: boolean; desync: boolean; conflict: string }[];
    };
    runs: unknown[];
  };
};
async function snapshot(page: Page) {
  return page.evaluate(() => {
    const d = (window as unknown as { echoDebug: Debug }).echoDebug;
    return {
      ...d.session.world.player,
      tick: d.session.world.tick,
      status: d.session.world.status,
      actors: d.session.world.actors.map((a) => ({
        alive: a.alive,
        desync: a.desync,
        conflict: a.conflict,
      })),
      echoes: d.session.runs.length,
    };
  });
}
async function walk(page: Page, x: number, y: number) {
  // Release movement on the browser's animation frame, avoiding transport latency
  // at corridor corners. This dispatches ordinary input events, never edits world state.
  await page.evaluate(
    async ({ x, y }) => {
      for (const axis of ['x', 'y'] as const)
        await new Promise<void>((resolve, reject) => {
          const target = axis === 'x' ? x : y;
          let held = '',
            frames = 0;
          const release = () => {
            if (held)
              window.dispatchEvent(new KeyboardEvent('keyup', { code: held, bubbles: true }));
            held = '';
          };
          const frame = () => {
            const w = (window as unknown as { echoDebug: Debug }).echoDebug.session.world,
              diff = target - w.player[axis];
            if (Math.abs(diff) < 3 || w.status === 'complete') {
              release();
              resolve();
              return;
            }
            if (w.status !== 'playing' || ++frames > 900) {
              release();
              reject(
                new Error(
                  `Route failed: ${axis}=${target}, player=${JSON.stringify(w.player)}, status=${w.status}`,
                ),
              );
              return;
            }
            const code = axis === 'x' ? (diff > 0 ? 'KeyD' : 'KeyA') : diff > 0 ? 'KeyS' : 'KeyW';
            if (held !== code) {
              release();
              held = code;
              window.dispatchEvent(new KeyboardEvent('keydown', { code, bubbles: true }));
            }
            requestAnimationFrame(frame);
          };
          frame();
        });
    },
    { x, y },
  );
}
async function until(page: Page, tick: number) {
  await expect
    .poll(async () => (await snapshot(page)).tick, { intervals: [30], timeout: 25000 })
    .toBeGreaterThanOrEqual(tick);
}
async function commit(page: Page) {
  const before = await snapshot(page);
  await page.keyboard.press('Space');
  await page.waitForTimeout(500);
  expect((await snapshot(page)).echoes).toBe(before.echoes + 1);
}

test('final chamber choreography succeeds through browser input and records campaign completion', async ({
  page,
}) => {
  test.setTimeout(120000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/?debug');
  await page.getByRole('button', { name: 'Chambers', exact: true }).click();
  await page.locator('.level-button').last().click();
  await walk(page, 220, 140);
  await commit(page);
  await until(page, 125);
  await walk(page, 460, 300);
  await walk(page, 460, 420);
  await commit(page);
  await until(page, 320);
  await walk(page, 660, 300);
  await walk(page, 660, 140);
  await commit(page);
  await walk(page, 140, 420);
  await page.keyboard.press('e');
  await page.waitForTimeout(34);
  await walk(page, 140, 300);
  await until(page, 480);
  await page.keyboard.press('Tab');
  await page.screenshot({ path: '.playtest/cascade-plan.png', fullPage: true });
  await page.keyboard.press('Tab');
  await walk(page, 860, 300);
  await expect(page.getByText('You were never alone.')).toBeVisible();
  const result = await snapshot(page);
  expect(result.echoes).toBe(3);
  expect(result.actors.every((a) => a.alive && !a.desync && !a.conflict)).toBe(true);
  await page.screenshot({ path: '.playtest/campaign-complete.png', fullPage: true });
  expect(errors).toEqual([]);
});

test('timeout commits once, retry never commits, and pause freezes the last fraction', async ({
  page,
}) => {
  await page.clock.install();
  await page.goto('/?debug');
  await page.getByRole('button', { name: 'Begin experiment' }).click();
  await page.clock.runFor(19700);
  await page.keyboard.press('Escape');
  const before = await snapshot(page);
  await page.clock.runFor(5000);
  expect((await snapshot(page)).tick).toBe(before.tick);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.clock.runFor(800);
  expect((await snapshot(page)).echoes).toBe(1);
  await page.keyboard.press('r');
  await page.clock.runFor(500);
  expect((await snapshot(page)).echoes).toBe(1);
  expect((await snapshot(page)).tick).toBeLessThan(15);
});

test('Interference: an Echo keeps its laser cover until another Echo protects it', async ({
  page,
}) => {
  test.setTimeout(90000);
  await page.goto('/?debug');
  await page.getByRole('button', { name: 'Chambers', exact: true }).click();
  await page.locator('.level-button').filter({ hasText: 'Interference' }).click();
  await walk(page, 180, 350);
  await page.keyboard.press('e');
  await page.waitForTimeout(50);
  await walk(page, 323, 220);
  await page.keyboard.press('e');
  await page.waitForTimeout(50);
  await walk(page, 323, 380);
  await commit(page);
  await walk(page, 220, 140);
  await commit(page);
  await until(page, 240);
  await walk(page, 283, 220);
  await page.keyboard.press('e');
  await page.waitForTimeout(50);
  await walk(page, 580, 220);
  await walk(page, 580, 300);
  await page.keyboard.press('Tab');
  await page.screenshot({ path: '.playtest/interference-plan.png', fullPage: true });
  await page.keyboard.press('Tab');
  await walk(page, 860, 300);
  await expect(page.getByText('Chamber reconstructed.')).toBeVisible();
  const result = await snapshot(page);
  expect(result.echoes).toBe(2);
  expect(result.actors.every((a) => a.alive && !a.desync && !a.conflict)).toBe(true);
});

test('Resonance: a quick mouse click is recorded and an Echo opens the remote timed door', async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.goto('/?debug');
  await page.getByRole('button', { name: 'Chambers', exact: true }).click();
  await page.locator('.level-button').filter({ hasText: 'Resonance' }).click();
  await until(page, 300);
  const box = await page.locator('canvas').boundingBox();
  if (!box) throw new Error('Missing game canvas');
  await page.mouse.click(box.x + (220 / 960) * box.width, box.y + (140 / 560) * box.height);
  await expect(page.locator('.event[title^="shoot"]')).toHaveCount(1);
  await commit(page);
  await walk(page, 140, 480);
  await walk(page, 640, 480);
  await walk(page, 640, 300);
  await walk(page, 860, 300);
  await expect(page.getByText('Chamber reconstructed.')).toBeVisible();
  expect((await snapshot(page)).echoes).toBe(1);
});

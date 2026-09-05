import { test, expect, type Page } from '@playwright/test';
type Snapshot = {
  x: number;
  y: number;
  tick: number;
  runs: number;
  status: string;
  paused: boolean;
  echoes: { x: number; y: number; desync: boolean }[];
};
const state = (page: Page): Promise<Snapshot> =>
  page.evaluate(() => {
    // The opt-in development surface has no dependency on test libraries in production.
    const d = (
      window as unknown as {
        echoDebug: {
          session: {
            world: {
              player: { x: number; y: number };
              tick: number;
              status: string;
              actors: { id: number; x: number; y: number; desync: boolean }[];
            };
            runs: unknown[];
          };
          paused: boolean;
        };
      }
    ).echoDebug;
    const w = d.session.world;
    return {
      x: w.player.x,
      y: w.player.y,
      tick: w.tick,
      runs: d.session.runs.length,
      status: w.status,
      paused: d.paused,
      echoes: w.actors.filter((a) => a.id).map((a) => ({ x: a.x, y: a.y, desync: a.desync })),
    };
  });
async function hold(page: Page, key: string, axis: 'x' | 'y', target: number) {
  const before = await state(page),
    increasing = target > before[axis];
  await page.keyboard.down(key);
  await expect
    .poll(
      async () => {
        const s = await state(page);
        return s.status === 'complete' || (increasing ? s[axis] >= target : s[axis] <= target);
      },
      { intervals: [16], timeout: 6000 },
    )
    .toBe(true);
  await page.keyboard.up(key);
}
test.beforeEach(async ({ page }) => {
  await page.goto('/?debug');
  await expect(page.getByRole('button', { name: 'Begin experiment' })).toBeVisible();
});

test('title, real movement, collisions, pause, planning, completion and persistence', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.screenshot({ path: '.playtest/title.png', fullPage: true });
  await page.getByRole('button', { name: 'Begin experiment' }).click();
  await hold(page, 'd', 'x', 370);
  await page.keyboard.down('d');
  await page.waitForTimeout(350);
  await page.keyboard.up('d');
  expect((await state(page)).x).toBeLessThan(390);
  await page.keyboard.press('Escape');
  const pausedTick = (await state(page)).tick;
  await page.waitForTimeout(200);
  expect((await state(page)).tick).toBe(pausedTick);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.keyboard.press('Tab');
  const planTick = (await state(page)).tick;
  await page.waitForTimeout(200);
  expect((await state(page)).tick).toBe(planTick);
  await page.keyboard.press('Tab');
  await hold(page, 's', 'y', 450);
  await hold(page, 'd', 'x', 860);
  await hold(page, 'w', 'y', 320);
  await expect(page.getByText('Chamber reconstructed.')).toBeVisible();
  await page.getByRole('button', { name: 'Next chamber' }).click();
  await expect(page.locator('#level-title')).toContainText('Again');
  await page.keyboard.press('Escape');
  await page.reload();
  await expect(page.getByRole('button', { name: 'Continue experiment' })).toBeVisible();
  expect(errors).toEqual([]);
});

test('first Echo puzzle through real keyboard input; retry and undo preserve semantics', async ({
  page,
}) => {
  await page.getByRole('button', { name: 'Chambers', exact: true }).click();
  await page.locator('#level-1').click();
  await hold(page, 'd', 'x', 257);
  await hold(page, 'w', 'y', 183);
  await page.keyboard.press('Space');
  await expect.poll(async () => (await state(page)).runs).toBe(1);
  await page.waitForTimeout(2300);
  expect((await state(page)).echoes[0].desync).toBe(false);
  await page.keyboard.press('Tab');
  await page.screenshot({ path: '.playtest/again-plan.png', fullPage: true });
  await page.keyboard.press('Tab');
  await page.keyboard.press('r');
  await page.waitForTimeout(500);
  expect((await state(page)).runs).toBe(1);
  await hold(page, 'd', 'x', 842);
  await expect(page.getByText('Chamber reconstructed.')).toBeVisible();
  await page.getByRole('button', { name: 'Replay chamber' }).click();
  await page.waitForTimeout(200);
  await page.keyboard.press('Space');
  await page.waitForTimeout(500);
  await page.keyboard.press('q');
  expect((await state(page)).runs).toBe(0);
});

test('settings persist, keyboard focus stays in dialogs, every chamber renders at desktop sizes', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await page.getByLabel('Reduced motion').check();
  await page.getByLabel('High contrast').check();
  await page.getByLabel('Master volume').fill('0');
  await page.getByRole('button', { name: 'Done' }).click();
  await page.reload();
  await page.getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByLabel('Reduced motion')).toBeChecked();
  await expect(page.getByLabel('Master volume')).toHaveValue('0');
  await page.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('button', { name: 'Chambers', exact: true }).click();
  const count = await page.locator('.level-button').count();
  for (let i = 0; i < count; i++) {
    await page.locator(`#level-${i}`).click();
    await page.keyboard.press('Tab');
    await page.screenshot({ path: `.playtest/chamber-${i + 1}.png`, fullPage: true });
    expect((await state(page)).status).toBe('playing');
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Chambers', exact: true }).click();
  }
  await page.setViewportSize({ width: 800, height: 700 });
  await page.locator('.level-button').last().click();
  await page.keyboard.press('Tab');
  await page.screenshot({ path: '.playtest/compact.png', fullPage: true });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

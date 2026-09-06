import { expect, test, type Page } from '@playwright/test';
import type { Session } from '../src/core/session';

type Debug = { session: Session; paused: boolean };
const snapshot = (page: Page) =>
  page.evaluate(() => {
    const d = (window as unknown as { echoDebug: Debug }).echoDebug;
    return {
      x: d.session.world.player.x,
      tick: d.session.world.tick,
      runs: d.session.runs.length,
      assisted: d.session.assisted,
      paused: d.paused,
      rules: d.session.rules,
      deaths: d.session.deaths,
    };
  });
async function code(page: Page, text: string) {
  await page.keyboard.press('F2');
  await page.getByLabel('Enter a code').fill(text);
  await page.getByRole('button', { name: 'Execute', exact: true }).click();
}
test('restart button cancels safely from planning, then clears history and resets the level', async ({
  page,
}) => {
  await page.goto('/?debug');
  await page.getByRole('button', { name: 'Begin experiment' }).click();
  await page.keyboard.down('d');
  await page.waitForTimeout(400);
  await page.keyboard.up('d');
  await page.keyboard.press('Space');
  await expect.poll(async () => (await snapshot(page)).runs).toBe(1);
  await page.keyboard.press('Tab');
  const before = await snapshot(page);
  await page.locator('#restart-level').click();
  await page.getByRole('button', { name: 'Keep playing' }).click();
  expect((await snapshot(page)).runs).toBe(1);
  expect((await snapshot(page)).paused).toBe(true);
  expect((await snapshot(page)).tick).toBe(before.tick);
  await page.keyboard.press('Shift+R');
  await page.getByRole('button', { name: 'Restart level now' }).click();
  const after = await snapshot(page);
  expect(after.runs).toBe(0);
  expect(after.x).toBe(140);
  expect(after.paused).toBe(false);
  expect(after.tick).toBeLessThan(20);
  expect(after.deaths).toBe(0);
});

test('typed cheats, persistent rules, no score pollution, clean reset and unlock without fake completions', async ({
  page,
}) => {
  await page.goto('/?debug');
  await page.getByRole('button', { name: 'Begin experiment' }).click();
  await code(page, 'warp 2');
  await expect(page.locator('#level-title')).toContainText('Again');
  await code(page, 'noclip');
  await expect(page.locator('#cheat-result')).toContainText('NOCLIP toggled');
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.locator('#test-badge')).toBeVisible();
  await page.keyboard.down('d');
  await expect(page.getByText('TEST RUN · COMPLETION NOT SAVED', { exact: true })).toBeVisible({
    timeout: 7000,
  });
  await page.keyboard.up('d');
  await expect(page.getByText('TEST RUN · COMPLETION NOT SAVED', { exact: true })).toBeVisible();
  expect(
    await page.evaluate(() => JSON.parse(localStorage.getItem('echo-save-v1')!).completed),
  ).toEqual({});
  await code(page, 'NORMAL');
  expect((await snapshot(page)).assisted).toBe(false);
  expect((await snapshot(page)).rules.noclip).toBe(false);
  await expect(page.locator('#test-badge')).toBeHidden();
  await code(page, 'GOD');
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.keyboard.press('r');
  expect((await snapshot(page)).rules.god).toBe(true);
  await code(page, 'warp 999');
  await expect(page.locator('#cheat-result')).toContainText('Unknown code');
  await page.keyboard.press('Escape');
  await code(page, 'UNLOCK');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Chambers', exact: true }).click();
  await expect(page.locator('.level-button:disabled')).toHaveCount(0);
  await page.reload();
  await page.getByRole('button', { name: 'Begin experiment' }).click();
  expect((await snapshot(page)).rules.god).toBe(false);
});

test('public cheat panel unlocks levels without debug mode and SLOW halves the simulation clock', async ({
  page,
}) => {
  await page.clock.install();
  await page.goto('/');
  await page.getByRole('button', { name: 'Chambers', exact: true }).click();
  expect(await page.locator('.level-button:disabled').count()).toBeGreaterThan(0);
  await code(page, 'UNLOCK');
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await expect(page.locator('.level-button:disabled')).toHaveCount(0);
  await page.locator('#level-0').click();
  await page.clock.runFor(1000);
  const seconds = async () => Number((await page.locator('#timer').innerText()).split(':')[1]);
  await code(page, 'SLOW');
  const before = await seconds();
  await page.clock.runFor(1000);
  expect(await seconds()).toBe(before);
  await page.screenshot({ path: '.playtest/cheat-panel.png' });
  await page.getByRole('button', { name: 'Back', exact: true }).click();
  await page.clock.runFor(1000);
  // HUD text refreshes every ~80ms; the full-speed clock would lose ~1 second.
  const elapsed = before - (await seconds());
  expect(elapsed).toBeGreaterThan(0.35);
  expect(elapsed).toBeLessThan(0.65);
  await expect(page.locator('#test-badge')).toBeVisible();
  expect(await page.evaluate(() => 'echoDebug' in window)).toBe(false);
  await code(page, 'WARP 17');
  await expect(page.locator('#level-title')).toContainText('Homecoming');
  await code(page, 'NORMAL');
  await expect(page.locator('#test-badge')).toBeHidden();
});

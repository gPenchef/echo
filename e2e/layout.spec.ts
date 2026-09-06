import { expect, test, type Page } from '@playwright/test';
import type { Session } from '../src/core/session';
import type { Input } from '../src/core/types';
import { campaign } from '../src/levels/campaign';
import { chamberView } from '../src/view';

type Debug = {
  session: Session;
  start: (index: number) => void;
  freeze: (value?: boolean) => void;
  step: (input?: Input, ticks?: number) => void;
};

async function assertFits(page: Page) {
  // Check actual content bounds, not just hidden document scrollbars.
  const failures = await page.evaluate(() => {
    const failures: string[] = [];
    for (const selector of [
      '#viewport',
      'canvas',
      '#notice',
      '.timeline',
      '.track',
      '#objective',
      '#commit',
      '#plan',
      '#hint',
      '#pause',
      '#restart-level',
      '#timer',
      '#level-title',
      '#chamber-map:not([hidden])',
    ]) {
      document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
        const r = el.getBoundingClientRect();
        if (
          r.width <= 0 ||
          r.height <= 0 ||
          r.x < -1 ||
          r.y < -1 ||
          r.right > innerWidth + 1 ||
          r.bottom > innerHeight + 1
        )
          failures.push(`${selector} outside viewport: ${JSON.stringify(r.toJSON())}`);
        if (el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1)
          failures.push(`${selector} has clipped content`);
      });
    }
    const stage = document.querySelector('#stage')!.getBoundingClientRect();
    const canvas = document.querySelector('canvas')!.getBoundingClientRect();
    if (
      canvas.x < stage.x - 1 ||
      canvas.y < stage.y - 1 ||
      canvas.right > stage.right + 1 ||
      canvas.bottom > stage.bottom + 1
    )
      failures.push('Canvas overlaps HUD');
    if (Math.abs(canvas.width / canvas.height - 12 / 7) > 0.005)
      failures.push('Chamber aspect ratio distorted');
    if (
      document.documentElement.scrollWidth > innerWidth ||
      document.documentElement.scrollHeight > innerHeight ||
      scrollY !== 0
    )
      failures.push('Document scrolls');
    return failures;
  });
  expect(failures).toEqual([]);
}

test('whole chamber and every Echo track fit tall, short, narrow and zoom-sized viewports', async ({
  page,
}) => {
  test.setTimeout(90000);
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?debug');
  await page.getByRole('button', { name: 'Begin experiment' }).click();
  for (const echoes of [0, 4, 12]) {
    await page.evaluate((count) => {
      const d = (window as unknown as { echoDebug: Debug }).echoDebug;
      d.start(10);
      d.freeze();
      for (let i = 0; i < count; i++) {
        d.step(undefined, 6);
        d.session.commit();
      }
      d.step(undefined, 0);
    }, echoes);
    for (const [width, height] of [
      [2560, 1440],
      [1920, 1080],
      [1536, 864],
      [1440, 900],
      [1366, 768],
      [1280, 720],
      [1280, 600],
      [1024, 768],
      [1024, 600],
      [800, 600],
      [768, 1024],
      [640, 480],
      [390, 844],
      [320, 568],
      [844, 390],
      [667, 375],
    ]) {
      await page.setViewportSize({ width, height });
      await page.waitForTimeout(100);
      await test.step(`${width} x ${height}, ${echoes} Echoes`, () => assertFits(page));
      if (echoes === 12 && [1366, 800, 390, 844].includes(width))
        await page.screenshot({ path: `.playtest/layout-${width}x${height}.png` });
    }
  }
  // Every objective/title must also fit the smallest supported viewport.
  await page.setViewportSize({ width: 320, height: 568 });
  for (let index = 0; index < campaign.length; index++) {
    await page.evaluate((i) => {
      const d = (window as unknown as { echoDebug: Debug }).echoDebug;
      d.start(i);
      d.freeze();
    }, index);
    await assertFits(page);
  }
  await page.locator('#pause').click();
  await expect(page.getByRole('button', { name: 'Resume', exact: true })).toBeInViewport();
  await page.getByRole('button', { name: 'Chambers', exact: true }).click();
  const panel = page.locator('.panel');
  expect(await panel.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(true);
  await page.locator('#level-10').click();
  await assertFits(page);
  expect(errors).toEqual([]);
});

test('mouse aim remains accurate after viewport and timeline-driven resizing', async ({ page }) => {
  await page.goto('/?debug');
  await page.getByRole('button', { name: 'Begin experiment' }).click();
  for (const [width, height, echoes] of [
    [1280, 720, 0],
    [800, 600, 12],
    [1366, 768, 4],
  ]) {
    await page.setViewportSize({ width, height });
    await page.evaluate((count) => {
      const d = (window as unknown as { echoDebug: Debug }).echoDebug;
      d.start(0);
      d.freeze();
      for (let i = 0; i < count; i++) {
        d.step(undefined, 6);
        d.session.commit();
      }
      d.step(undefined, 0);
      d.freeze(false);
    }, echoes);
    await page.waitForTimeout(150);
    const canvas = (await page.locator('canvas').boundingBox())!;
    const player = await page.evaluate(() => {
      const p = (window as unknown as { echoDebug: Debug }).echoDebug.session.world.player;
      return { x: p.x, y: p.y };
    });
    await page.mouse.click(
      canvas.x + ((player.x + 150) / 960) * canvas.width,
      canvas.y + ((player.y - 100) / 560) * canvas.height,
    );
    await expect
      .poll(() =>
        page.evaluate(() => {
          const aim = (
            window as unknown as { echoDebug: Debug }
          ).echoDebug.session.world.recording.events.find((event) => event.kind === 'shoot')?.aim;
          return aim === undefined ? Infinity : Math.abs(aim - Math.atan2(-100, 150));
        }),
      )
      // Browser pointer coordinates are quantized to CSS pixels on a scaled canvas.
      .toBeLessThan(0.015);
  }
});

test('large-world camera aiming, overview and reset work at desktop and compact sizes', async ({
  page,
}) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.goto('/?debug');
  await page.getByRole('button', { name: 'Begin experiment' }).click();
  for (const [width, height] of [
    [1280, 720],
    [800, 600],
  ]) {
    await page.setViewportSize({ width, height });
    for (let index = 11; index < campaign.length; index++) {
      await page.evaluate((i) => {
        const d = (window as unknown as { echoDebug: Debug }).echoDebug;
        d.start(i);
        d.freeze();
        d.step({ x: 1, y: 0, aim: 0, interact: false, shoot: false }, 150);
        d.freeze(false);
      }, index);
      await page.waitForTimeout(150);
      const player = await page.evaluate(() => {
        const p = (window as unknown as { echoDebug: Debug }).echoDebug.session.world.player;
        return { x: p.x, y: p.y };
      });
      const view = chamberView(campaign[index], player, false);
      expect(view.x + view.y).toBeGreaterThan(0);
      const canvas = (await page.locator('canvas').boundingBox())!;
      await page.mouse.click(
        canvas.x + ((player.x + 100 - view.x) / 960) * canvas.width,
        canvas.y + ((player.y - 100 - view.y) / 560) * canvas.height,
      );
      await expect
        .poll(() =>
          page.evaluate(() => {
            const aim = (
              window as unknown as { echoDebug: Debug }
            ).echoDebug.session.world.recording.events.find((e) => e.kind === 'shoot')?.aim;
            return aim === undefined ? Infinity : Math.abs(aim + Math.PI / 4);
          }),
        )
        .toBeLessThan(0.02);
      await page.getByRole('button', { name: 'Open chamber map' }).click();
      await assertFits(page);
      await page.screenshot({ path: `.playtest/map-${campaign[index].id}-${width}.png` });
      const tick = await page.evaluate(
        () => (window as unknown as { echoDebug: Debug }).echoDebug.session.world.tick,
      );
      await page.waitForTimeout(100);
      expect(
        await page.evaluate(
          () => (window as unknown as { echoDebug: Debug }).echoDebug.session.world.tick,
        ),
      ).toBe(tick);
      await page.keyboard.press('Tab');
      await page.keyboard.press('r');
      await page.waitForTimeout(100);
      const reset = await page.evaluate(() => {
        const w = (window as unknown as { echoDebug: Debug }).echoDebug.session.world;
        return { x: w.player.x, y: w.player.y, events: w.recording.events.length };
      });
      expect(reset).toEqual({ ...campaign[index].spawn, events: 0 });
      await expect(page.locator('#map-camera')).toHaveAttribute(
        'x',
        String(chamberView(campaign[index], campaign[index].spawn, false).x),
      );
    }
  }
  expect(errors).toEqual([]);
});

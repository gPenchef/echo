import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';
import { setTimeout } from 'node:timers/promises';
import { chromium } from '@playwright/test';

// Test the actual dist build in an isolated browser, including missing assets and
// accidental development instrumentation. The preview server is always stopped.
const preview = spawn(
  process.execPath,
  [
    'node_modules/vite/bin/vite.js',
    'preview',
    '--host',
    '127.0.0.1',
    '--port',
    '4173',
    '--strictPort',
  ],
  { windowsHide: true, stdio: 'pipe' },
);
let output = '';
preview.stdout.on('data', (chunk) => {
  output += chunk;
});
preview.stderr.on('data', (chunk) => {
  output += chunk;
});
let browser;
try {
  let ready = false;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (preview.exitCode !== null) throw new Error(`Preview exited: ${output}`);
    try {
      ready = (await fetch('http://127.0.0.1:4173/')).ok;
    } catch {
      /* Server is starting. */
    }
    if (ready) break;
    await setTimeout(100);
  }
  if (!ready) throw new Error(`Preview did not start: ${output}`);
  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('response', (response) => {
    if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
  });
  await page.goto('http://127.0.0.1:4173/');
  await page.getByRole('button', { name: 'Begin experiment' }).click();
  await page.keyboard.down('d');
  await page.waitForTimeout(400);
  await page.keyboard.up('d');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Resume', exact: true }).waitFor();
  if (await page.evaluate(() => 'echoDebug' in window))
    throw new Error('Development instrumentation leaked into production');
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.keyboard.press('Tab');
  await mkdir('.playtest', { recursive: true });
  await page.screenshot({ path: '.playtest/production.png', fullPage: true });
  if (errors.length) throw new Error(errors.join('\n'));
  console.log(
    'Production smoke passed: assets, canvas, controls, pause, planning, and no browser errors.',
  );
} finally {
  await browser?.close();
  preview.kill();
}

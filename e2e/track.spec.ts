import { test, expect } from '@playwright/test';

/**
 * The initial smoke test proves the harness works - dev
 * servers up, proxy wired, token accepted, React rendering - and nothing about
 * how the UI should behave. That part is yours.
 */
test('the app loads and shows the track title', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'You Verse You' })).toBeVisible();
});

test('mouse-wheel zoom keeps the waveform, segment lane and controls in sync', async ({ page }) => {
  await page.goto('/');

  const waveform = page.getByRole('region', { name: 'Audio waveform', exact: true });
  const lane = page.getByRole('region', { name: 'Segment lane', exact: true });
  const zoomLevel = page.getByRole('button', { name: 'Fit timeline to song', exact: true });
  const zoomIn = page.getByRole('button', { name: 'Zoom in', exact: true });
  const zoomOut = page.getByRole('button', { name: 'Zoom out', exact: true });
  const waveTrack = waveform.locator('[part="wrapper"]');

  await expect(zoomIn).toBeEnabled();
  await expect(waveform).toHaveAttribute('aria-busy', 'false');
  await expect(zoomLevel).toHaveText('1×');
  await expect(zoomOut).toBeDisabled();

  const initialLaneWidth = await lane.evaluate((element) => element.getBoundingClientRect().width);
  const initialWaveWidth = await waveTrack.evaluate((element) => element.scrollWidth);

  await waveform.hover();
  await page.mouse.wheel(0, -100);
  await expect(zoomLevel).toHaveText('1×');
  await expect.poll(() => lane.evaluate((element) => element.getBoundingClientRect().width))
    .toBeCloseTo(initialLaneWidth, 0);

  await page.keyboard.down('Control');
  try {
    await page.mouse.wheel(0, -100);
    await expect(zoomLevel).toHaveText('2×');
  } finally {
    await page.keyboard.up('Control');
  }

  await expect(zoomOut).toBeEnabled();
  await expect.poll(() => lane.evaluate((element) => element.getBoundingClientRect().width))
    .toBeCloseTo(initialLaneWidth * 2, 0);
  await expect.poll(() => waveTrack.evaluate((element) => element.scrollWidth))
    .toBeCloseTo(initialWaveWidth * 2, 0);

  await zoomIn.click();
  await expect(zoomLevel).toHaveText('4×');
  await expect.poll(() => waveTrack.evaluate((element) => element.scrollWidth))
    .toBeCloseTo(initialWaveWidth * 4, 0);

  await waveform.hover();
  await page.keyboard.down('Meta');
  try {
    await page.mouse.wheel(0, 100);
    await expect(zoomLevel).toHaveText('2×');
  } finally {
    await page.keyboard.up('Meta');
  }

  await zoomLevel.click();
  await expect(zoomLevel).toHaveText('1×');
  await expect(zoomOut).toBeDisabled();
  await expect.poll(() => lane.evaluate((element) => element.getBoundingClientRect().width))
    .toBeCloseTo(initialLaneWidth, 0);
  await expect.poll(() => waveTrack.evaluate((element) => element.scrollWidth))
    .toBeCloseTo(initialWaveWidth, 0);
});

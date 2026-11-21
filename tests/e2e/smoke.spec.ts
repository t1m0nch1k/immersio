import { test, expect, type Page } from '@playwright/test';

// The sidebar is a permanent column on a wide viewport, but it starts with
// aria-hidden until opened, so nav buttons are located by CSS, not by role.
const navItem = (label: string) => `nav.side button.nitem:has-text("${label}")`;

async function openApp(page: Page) {
  // Skip the first-run onboarding: the storage loader merges a partial
  // record with defaults, so onboarded:true alone is a valid stored state.
  await page.addInitScript(() => {
    localStorage.setItem('pogruzhenie_v2', JSON.stringify({ onboarded: true }));
  });
  await page.goto('/');
  await expect(page.locator('main h1.display', { hasText: 'Интерактивные уроки' })).toBeVisible();
}

test('app loads without console or page errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    // A failed request also logs a generic "Failed to load resource" line
    // that names no URL; resource failures are checked precisely below via
    // requestfailed/response instead, so skip that line here.
    if (msg.type() === 'error' && !msg.text().startsWith('Failed to load resource')) {
      errors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => errors.push(String(err)));
  page.on('requestfailed', (request) => {
    // Only the app's own assets count: third-party hosts (Google Fonts, the
    // GitHub raw update check) may be unreachable from a sandboxed network,
    // and the app handles those failures gracefully. Same-origin failures
    // are real breakage.
    if (new URL(request.url()).origin === new URL(page.url()).origin) {
      errors.push(`request failed: ${request.url()} ${request.failure()?.errorText ?? ''}`);
    }
  });
  page.on('response', (response) => {
    const url = response.url();
    if (response.status() >= 400 && new URL(url).origin === new URL(page.url()).origin) {
      errors.push(`HTTP ${response.status()}: ${url}`);
    }
  });
  await openApp(page);
  expect(errors).toEqual([]);
});

test('navigation reaches every section', async ({ page }) => {
  await openApp(page);
  const sections: Array<[label: string, heading: string]> = [
    ['Практика', 'Практика и карточки'],
    ['Спринт', 'Спринт слов'],
    ['Слушание', 'Слушание на сегодня'],
    ['Словарь', 'Личный словарь'],
    ['Грамматика', 'От правила к своей фразе'],
    ['Алфавит', 'English alphabet'],
    ['Свой текст', 'Свой текст для погружения'],
    ['Профиль', 'Профиль ученика'],
  ];
  for (const [label, heading] of sections) {
    await page.locator(navItem(label)).click();
    await expect(page.locator('main h1.display', { hasText: heading })).toBeVisible();
  }
  await page.locator(navItem('Уроки')).click();
  await expect(page.locator('main h1.display', { hasText: 'Интерактивные уроки' })).toBeVisible();
});

test('a lesson opens in the reader', async ({ page }) => {
  await openApp(page);
  await page.getByRole('button', { name: 'Продолжить погружение' }).click();
  await expect(page.locator('main h1.display', { hasText: 'Доброе утро' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Оригинал/ })).toBeVisible();
});

test('dictionary opens with search', async ({ page }) => {
  await openApp(page);
  await page.locator(navItem('Словарь')).click();
  await expect(page.locator('main h1.display', { hasText: 'Личный словарь' })).toBeVisible();
  await expect(page.getByPlaceholder('Поиск по слову или переводу...')).toBeVisible();
});

test('grammar opens with its topic list', async ({ page }) => {
  await openApp(page);
  await page.locator(navItem('Грамматика')).click();
  await expect(page.locator('main h1.display', { hasText: 'От правила к своей фразе' })).toBeVisible();
  await expect(page.locator('main').getByText(/Освоено тем: \d+ \/ \d+/)).toBeVisible();
  await expect(page.locator('.grammar-grid').locator('> *').first()).toBeVisible();
});

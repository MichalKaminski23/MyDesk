import { spawn } from 'node:child_process';
import { mkdir, rm } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium, expect } from '@playwright/test';

// Uses its own processes, ports and disposable database, never the user's .env.
const frontend = fileURLToPath(new URL('..', import.meta.url));
const root = path.resolve(frontend, '..');
const output = path.join(frontend, 'test-results');
const db = path.join(output, `integration-${Date.now()}.db`);
await mkdir(output, { recursive: true });
const children = [];
let browser;
let logs = '';
function run(executable, args, cwd, env) {
  const child = spawn(executable, args, { cwd, env: { ...process.env, ...env }, windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
  child.stdout.on('data', data => { logs = (logs + data).slice(-12000); });
  child.stderr.on('data', data => { logs = (logs + data).slice(-12000); });
  child.on('error', error => { logs += error.message; });
  children.push(child);
  return child;
}
async function ready(url, child) {
  for (let i = 0; i < 100; i++) {
    if (child.exitCode !== null) throw new Error(`Server stopped: ${logs}`);
    try { if ((await fetch(url)).ok) return; } catch { /* server starting */ }
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error(`Server did not become ready: ${logs}`);
}

try {
  const python = path.join(root, '.venv', process.platform === 'win32' ? 'Scripts/python.exe' : 'bin/python');
  const backend = run(python, ['-m', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '18000'], root, {
    DATABASE_URL: `sqlite:///${db.replaceAll('\\', '/')}`,
    SECRET_KEY: 'isolated-integration-test-secret-never-for-production',
    ALGORITHM: 'HS256', ACCESS_TOKEN_EXPIRE_MINUTES: '60', ALLOWED_ORIGINS: 'http://127.0.0.1:15173',
    SEED_ADMIN_EMAIL: 'qa-admin@mydesk.pl', SEED_ADMIN_PASSWORD: 'Integration123!', SEED_ADMIN_PHONE: '123456789',
    SEED_EMPLOYEE_EMAIL: 'qa@mydesk.pl', SEED_EMPLOYEE_PASSWORD: 'Integration123!', SEED_EMPLOYEE_PHONE: '123456789',
  });
  await ready('http://127.0.0.1:18000/health', backend);
  const vite = run(process.execPath, [path.join(frontend, 'node_modules/vite/bin/vite.js'), '--host', '127.0.0.1', '--port', '15173'], frontend, { API_PROXY_TARGET: 'http://127.0.0.1:18000' });
  await ready('http://127.0.0.1:15173', vite);
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1440, height: 1080 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:15173');
  await expect(page.locator('.resource-card')).toHaveCount(6);
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: path.join(output, 'mydesk-desktop.png'), fullPage: true, animations: 'disabled' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: path.join(output, 'mydesk-mobile.png'), animations: 'disabled' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.setViewportSize({ width: 1440, height: 1080 });
  await page.getByRole('button', { name: 'Zaloguj się', exact: true }).first().click();
  await page.getByLabel('Służbowy adres e-mail').fill('qa@mydesk.pl');
  await page.getByLabel('Hasło', { exact: true }).fill('Integration123!');
  await page.getByRole('dialog').getByRole('button', { name: 'Zaloguj się' }).click();
  await expect(page.getByText('Cześć, Pracownik!', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Zarezerwuj', exact: true }).first().click();
  const bookedName = await page.locator('.booking-summary strong').innerText();
  await page.getByLabel('Data rezerwacji').fill('2099-11-05');
  await page.getByLabel('Od godziny').fill('09:00');
  const creation = page.waitForResponse(response => response.url().endsWith('/api/reservations') && response.request().method() === 'POST');
  await page.getByRole('button', { name: 'Potwierdź rezerwację' }).click();
  expect((await creation).status()).toBe(201);
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('button', { name: 'Moje rezerwacje' }).click();
  // The seed is for tomorrow, so the far-future test booking is last.
  await page.locator('.reservation-card').last().getByRole('button', { name: 'Edytuj' }).click();
  await page.getByLabel('Od godziny').fill('10:00');
  const update = page.waitForResponse(response => response.request().method() === 'PUT');
  await page.getByRole('button', { name: 'Zapisz zmiany' }).click();
  expect((await update).status()).toBe(200);
  await expect(page.locator('.reservation-card').last()).toContainText('10:00–17:00');
  await page.locator('.reservation-card').last().getByRole('button', { name: /Anuluj rezerwację/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Anuluj rezerwację', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.getByRole('tab', { name: 'Anulowane', exact: true }).click();
  await expect(page.locator('.reservation-list')).toContainText(bookedName);
  await page.getByRole('button', { name: 'Znajdź miejsce', exact: true }).click();
  await page.getByRole('button', { name: 'Zarezerwuj', exact: true }).first().click();
  await page.getByLabel('Data rezerwacji').fill('2099-11-05');
  await page.getByLabel('Od godziny').fill('09:00');
  await page.getByLabel('Powtarzaj rezerwację co tydzień').check();
  await page.getByLabel('Powtarzaj do').fill('2099-11-19');
  const recurrence = page.waitForResponse(response => response.url().endsWith('/api/reservations/recurring'));
  await page.getByRole('button', { name: 'Zarezerwuj cyklicznie' }).click();
  const recurringResponse = await recurrence;
  expect(recurringResponse.status()).toBe(201);
  expect((await recurringResponse.json()).length).toBe(3);
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect(errors).toEqual([]);
  console.log('Live FastAPI integration passed: public availability, login, create, edit, cancel, recurring reservations; desktop/mobile screenshots saved.');
} finally {
  await browser?.close();
  await Promise.all(children.map(child => new Promise(resolve => {
    if (child.exitCode !== null) return resolve();
    child.once('exit', resolve);
    child.kill();
  })));
  await rm(db, { force: true });
}

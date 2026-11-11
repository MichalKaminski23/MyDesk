import { expect, test, type Page } from '@playwright/test';

const resources = [
  { id: 1, name: 'Biurko A1', type: 'desk', capacity: 1, location: 'Strefa ciszy · Piętro 1' },
  { id: 2, name: 'Biurko A2', type: 'desk', capacity: 1, location: 'Open Space · Piętro 1' },
  { id: 3, name: 'Sala Spodek', type: 'room', capacity: 6, location: 'Lewe skrzydło · Piętro 1' },
];
const user = { id: 1, name: 'Jan', surname: 'Kowalski', email: 'jan@example.com', phone_number: '123456789', role: 'employee', is_active: true };
const date = '2099-11-05';
const reservation = { id: 5, user_id: 1, resource_id: 1, resource: resources[0], start_time: `${date}T09:00:00`, end_time: `${date}T17:00:00`, status: 'active' };

async function setup(page: Page, role = 'employee') {
  let bookings = [reservation];
  await page.route('**/api/**', async route => {
    const url = new URL(route.request().url());
    const path = url.pathname;
    const method = route.request().method();
    if (path === '/api/auth/login') return route.fulfill({ json: { access_token: 'test-token', token_type: 'bearer' } });
    if (path === '/api/users/me') return route.fulfill({ json: { ...user, role } });
    if (path === '/api/users' && method === 'GET') return route.fulfill({ json: [{ ...user, role }] });
    if (path === '/api/users/me/password' && method === 'PATCH') return route.fulfill({ json: { message: 'Password changed' } });
    if (path === '/api/resources/availability') return route.fulfill({ json: resources.filter(item => item.id !== 2) });
    if (path === '/api/resources') return route.fulfill({ json: method === 'POST' ? { ...route.request().postDataJSON(), id: 4 } : resources });
    if (path === '/api/reservations' && method === 'GET') return route.fulfill({ json: bookings });
    if (path === '/api/reservations' && method === 'POST') {
      const newBooking = { ...reservation, ...route.request().postDataJSON(), id: 6 };
      bookings = [...bookings, newBooking];
      return route.fulfill({ status: 201, json: newBooking });
    }
    if (path === '/api/reservations/recurring') return route.fulfill({ status: 201, json: [reservation, { ...reservation, id: 6 }] });
    if (path === '/api/reservations/5' && method === 'PUT') {
      bookings = [{ ...reservation, ...route.request().postDataJSON() }];
      return route.fulfill({ json: bookings[0] });
    }
    if (path === '/api/reservations/5' && method === 'DELETE') {
      bookings = [{ ...reservation, status: 'cancelled' }];
      return route.fulfill({ json: { message: 'Cancelled' } });
    }
    if (path === '/api/auth/register') return route.fulfill({ status: 201, json: { ...user, ...route.request().postDataJSON(), id: 7 } });
    return route.fulfill({ status: 404, json: { detail: 'Not found' } });
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Biurka i sale' })).toBeVisible();
}

async function login(page: Page) {
  await page.getByRole('button', { name: 'Zaloguj się', exact: true }).first().click();
  await page.getByLabel('Służbowy adres e-mail').fill('jan@example.com');
  await page.getByLabel('Hasło', { exact: true }).fill('Password123!');
  const request = page.waitForRequest(req => req.url().endsWith('/auth/login'));
  await page.getByRole('dialog').getByRole('button', { name: 'Zaloguj się' }).click();
  expect((await request).postData()).toContain('username=jan%40example.com');
  await expect(page.getByText('Cześć, Jan!', { exact: true })).toBeVisible();
}

test('guest sees real availability and can filter by type, name and availability', async ({ page }) => {
  await setup(page);
  await expect(page.locator('.resource-card')).toHaveCount(3);
  await expect(page.getByRole('button', { name: 'Niedostępne' })).toBeDisabled();
  await page.getByLabel('Tylko dostępne').check();
  await expect(page.locator('.resource-card')).toHaveCount(2);
  await page.getByRole('tab', { name: 'Sale konferencyjne' }).click();
  await expect(page.locator('.resource-card')).toHaveCount(1);
  await page.getByLabel('Szukaj miejsca').fill('nieistniejące');
  await expect(page.getByText('Nie znaleźliśmy takiego miejsca')).toBeVisible();
  await page.getByRole('button', { name: 'Wyczyść filtry' }).click();
  await expect(page.locator('.resource-card')).toHaveCount(3);
});

test('invalid time range does not query availability', async ({ page }) => {
  await setup(page);
  await page.getByLabel('Godzina rozpoczęcia').fill('18:00');
  await page.getByRole('button', { name: 'Sprawdź dostępność' }).click();
  await expect(page.getByRole('alert')).toContainText('Godzina zakończenia');
  await page.getByLabel('Data dostępności').fill(date);
  await page.getByLabel('Godzina rozpoczęcia').fill('08:00');
  const request = page.waitForRequest(req => req.url().includes('/availability?') && req.url().includes(date));
  await page.getByRole('button', { name: 'Sprawdź dostępność' }).click();
  const url = new URL((await request).url());
  expect(url.searchParams.get('start_time')).toBe(`${date}T08:00:00`);
});

test('office map opens the chosen available desk after login', async ({ page }) => {
  await setup(page);
  await page.getByRole('button', { name: 'Mapa biura' }).click();
  const map = page.getByRole('region', { name: 'Schemat biura' });
  await expect(map).toContainText('Liczba biurek w biurze: 2');
  const occupied = map.getByRole('button', { name: 'Biurko A2 Zajęte' });
  const position = await occupied.boundingBox();
  await page.getByLabel('Tylko dostępne').check();
  await expect(map).toContainText('Liczba biurek w biurze: 2');
  await expect(occupied).toHaveClass(/filtered-out/);
  expect(await occupied.boundingBox()).toEqual(position);
  await page.getByLabel('Tylko dostępne').uncheck();
  await expect(occupied).toBeDisabled();
  await map.getByRole('button', { name: 'Biurko A1 Wolne' }).click();

  const loginDialog = page.getByRole('dialog', { name: 'Logowanie' });
  await loginDialog.getByLabel('Służbowy adres e-mail').fill('jan@example.com');
  await loginDialog.getByLabel('Hasło', { exact: true }).fill('Password123!');
  await loginDialog.getByRole('button', { name: 'Zaloguj się' }).click();

  const bookingDialog = page.getByRole('dialog');
  await expect(bookingDialog).toContainText('Biurko A1');
  await expect(bookingDialog.getByRole('button', { name: 'Potwierdź rezerwację' })).toBeVisible();
});

test('zoomed office map pans without selecting the desk under the pointer', async ({ page }) => {
  await setup(page);
  await page.getByRole('button', { name: 'Mapa biura' }).click();
  const viewport = page.getByRole('region', { name: 'Przewijany rzut biura' });
  const mapHeight = await viewport.evaluate(element => element.getBoundingClientRect().height);
  await page.getByRole('button', { name: 'Przybliż mapę' }).click();
  await expect(page.getByRole('button', { name: /obecnie 125%/ })).toBeVisible();
  expect(await viewport.evaluate(element => element.getBoundingClientRect().height)).toBe(mapHeight);

  const desk = viewport.getByRole('button', { name: 'Biurko A1 Wolne' });
  await desk.scrollIntoViewIfNeeded();
  const bounds = await desk.boundingBox();
  if (!bounds) throw new Error('Desk is outside the map viewport');
  const x = bounds.x + bounds.width / 2;
  const y = bounds.y + bounds.height / 2;
  const before = await viewport.evaluate(element => element.scrollLeft);
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x - 80, y, { steps: 8 });
  await page.mouse.up();
  expect(await viewport.evaluate(element => element.scrollLeft)).toBeGreaterThan(before);
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.getByRole('button', { name: 'Oddal mapę' }).click();
  await expect(page.getByRole('button', { name: /obecnie 100%/ })).toBeVisible();
  await page.getByRole('button', { name: 'Oddal mapę' }).click();
  await expect(page.getByRole('button', { name: /obecnie 75%/ })).toBeVisible();
  expect(await viewport.evaluate(element => element.getBoundingClientRect().height)).toBe(mapHeight);
  await page.getByRole('button', { name: /Przywróć widok mapy/ }).click();

  await viewport.scrollIntoViewIfNeeded();
  const surface = await viewport.boundingBox();
  if (!surface) throw new Error('Map viewport is not visible');
  const anchor = { x: surface.x + 150, y: surface.y + 1 };
  const pointOnPlan = () => viewport.locator('.office-map-plan').evaluate((plan, point) => {
    const rect = plan.getBoundingClientRect();
    const zoom = Number(getComputedStyle(plan).zoom);
    return { x: (point.x - rect.left) / zoom, y: (point.y - rect.top) / zoom };
  }, anchor);
  const point = await pointOnPlan();
  await page.mouse.move(anchor.x, anchor.y);
  await page.mouse.wheel(0, -100);
  await expect(page.getByRole('button', { name: /obecnie 122%/ })).toBeVisible();
  const zoomedPoint = await pointOnPlan();
  expect(Math.abs(zoomedPoint.x - point.x)).toBeLessThan(2);
  expect(Math.abs(zoomedPoint.y - point.y)).toBeLessThan(2);

  const scrollLeft = await viewport.evaluate(element => element.scrollLeft);
  await page.route('**/api/resources/availability?*', route => route.fulfill({ json: [resources[1]] }));
  await page.getByRole('button', { name: 'Sprawdź dostępność' }).click();
  await expect(viewport.getByRole('button', { name: 'Biurko A1 Zajęte' })).toBeDisabled();
  await expect(page.getByRole('button', { name: /obecnie 122%/ })).toBeVisible();
  expect(await viewport.evaluate(element => element.scrollLeft)).toBe(scrollLeft);
});

test('login and create recurring reservation with backend weekday format', async ({ page }) => {
  await setup(page); await login(page);
  await page.getByRole('button', { name: 'Zarezerwuj', exact: true }).first().click();
  const modal = page.getByRole('dialog');
  await modal.getByLabel('Data rezerwacji').fill(date);
  await modal.getByLabel('Od godziny').fill('09:00');
  await modal.getByLabel('Powtarzaj rezerwację co tydzień').check();
  await modal.getByLabel('Powtarzaj do').fill('2099-11-30');
  const request = page.waitForRequest(req => req.url().endsWith('/reservations/recurring'));
  await modal.getByRole('button', { name: 'Zarezerwuj cyklicznie' }).click();
  const req = await request;
  expect(req.headers().authorization).toBe('Bearer test-token');
  expect(req.postDataJSON()).toMatchObject({ resource_id: 1, start_time: `${date}T09:00:00`, end_time: `${date}T17:00:00`, repeat_until: '2099-11-30' });
  expect(req.postDataJSON().weekdays.every((day: number) => day >= 0 && day <= 6)).toBe(true);
  await expect(page.getByRole('status')).toContainText('Utworzono rezerwacje cykliczne: 2');
});

test('single booking conflict keeps dialog open and displays actionable error', async ({ page }) => {
  await setup(page); await login(page);
  await page.route('**/api/reservations', route => route.request().method() === 'POST' ? route.fulfill({ status: 409, json: { detail: 'Already booked' } }) : route.fallback());
  await page.getByRole('button', { name: 'Zarezerwuj', exact: true }).first().click();
  await page.getByLabel('Data rezerwacji').fill(date);
  await page.getByRole('button', { name: 'Potwierdź rezerwację' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('alert')).toContainText('Ten termin jest już zajęty');
});

test('employee edits and cancels own reservation', async ({ page }) => {
  await setup(page); await login(page);
  await page.getByRole('button', { name: 'Moje rezerwacje' }).click();
  await page.getByRole('button', { name: 'Edytuj' }).click();
  await page.getByLabel('Od godziny').fill('10:00');
  const request = page.waitForRequest(req => req.method() === 'PUT' && req.url().endsWith('/reservations/5'));
  await page.getByRole('button', { name: 'Zapisz zmiany' }).click();
  expect((await request).postDataJSON().start_time).toBe(`${date}T10:00:00`);
  await expect(page.locator('.reservation-info')).toContainText('10:00–17:00');
  await page.getByRole('button', { name: 'Anuluj rezerwację Biurko A1' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Anuluj rezerwację', exact: true }).click();
  await expect(page.getByText('Brak nadchodzących rezerwacji')).toBeVisible();
  await page.getByRole('tab', { name: 'Anulowane', exact: true }).click();
  await expect(page.locator('.reservation-list')).toContainText('Biurko A1');
});

test('admin creates employee without allowing role escalation in payload', async ({ page }) => {
  await setup(page, 'admin'); await login(page);
  await page.getByRole('button', { name: 'Administracja', exact: true }).click();
  await page.getByLabel('Imię', { exact: true }).fill('Anna');
  await page.getByLabel('Nazwisko', { exact: true }).fill('Nowak');
  await page.getByLabel('E-mail', { exact: true }).fill('anna@example.com');
  await page.getByLabel('Numer telefonu').fill('123456789');
  await page.getByLabel('Hasło początkowe').fill('Password123!');
  const request = page.waitForRequest(req => req.url().endsWith('/auth/register'));
  await page.getByRole('button', { name: 'Utwórz konto pracownika' }).click();
  expect((await request).postDataJSON()).toEqual({ name: 'Anna', surname: 'Nowak', email: 'anna@example.com', phone_number: '123456789', password: 'Password123!' });
  await expect(page.getByRole('status')).toContainText('Identyfikator: 7');
});

test('connection failure can be retried without reporting spaces as occupied', async ({ page }) => {
  await setup(page);
  await page.route('**/api/resources/availability?*', route => route.fulfill({ status: 503, json: { detail: 'Unavailable' } }));
  await page.getByRole('button', { name: 'Sprawdź dostępność' }).click();
  await expect(page.getByText('Nie możemy sprawdzić dostępności')).toBeVisible();
  await expect(page.locator('.resource-card')).toHaveCount(0);
  await page.unroute('**/api/resources/availability?*');
  await page.getByRole('button', { name: 'Spróbuj ponownie' }).click();
  await expect(page.locator('.resource-card')).toHaveCount(3);
});

test('mobile layout has no horizontal overflow and dialogs restore focus', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await setup(page);
  await expect(page.locator('.resource-card')).toHaveCount(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Otwórz menu' }).click();
  await page.getByRole('button', { name: 'Jak to działa?' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Tab');
  expect(await page.getByRole('dialog').evaluate(el => el.contains(document.activeElement))).toBe(true);
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await expect(page.getByRole('button', { name: 'Jak to działa?' })).toBeFocused();
});

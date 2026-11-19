import { test, expect } from '@playwright/test';
import { openSecondaryMenu } from './secondary-menu';

test.use({ timezoneId: 'Europe/Madrid' });

test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-19T12:00:00+01:00'));
  await page.route('**/firebase-config.test.json', route => route.fulfill({ json: { apiKey: '', authDomain: '', projectId: '', appId: '' } }));
});

for (const width of [390, 820, 1440]) {
  test(`Resumen abre el mes actual y el breadcrumb permite consultar el año (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.getByRole('button', { name: /Explorar la demostra/ }).click();
    await expect(page).toHaveURL(/\/resumen\/2026-11$/);
    await expect(page.getByRole('heading', { name: 'noviembre de 2026.', exact: true })).toBeVisible();
    const breadcrumb = page.getByRole('navigation', { name: 'Ruta de navegación' });
    await expect(breadcrumb).toHaveText(/Resumen\s*\/\s*2026\s*\/\s*noviembre/);
    await expect(page.locator('.months-table')).toHaveCount(0);
    await breadcrumb.getByRole('link', { name: '2026', exact: true }).click();
    await expect(page).toHaveURL(/\/\?year=2026$/);
    await expect(page.getByLabel('Año del resumen')).toHaveValue('2026');
    await expect(page.getByRole('heading', { name: 'Movimientos del año', exact: true })).toBeVisible();
    await page.getByLabel('Año del resumen').fill('2025');
    await expect(page.getByRole('heading', { name: 'Hogar 2025.', exact: true })).toBeVisible();
    await openSecondaryMenu(page);
    const navigation = width <= 1024 ? page.getByRole('dialog', { name: 'Menú', exact: true }) : page.getByRole('navigation', { name: 'Navegación principal', exact: true });
    await navigation.getByRole('link', { name: 'Resumen', exact: true }).click();
    await expect(page).toHaveURL(/\/resumen\/2026-11$/);
    await expect(page.getByRole('heading', { name: 'noviembre de 2026.', exact: true })).toBeVisible();
    await page.reload();
    await page.getByRole('button', { name: /Explorar la demostra/ }).click();
    await expect(page.getByRole('heading', { name: 'noviembre de 2026.', exact: true })).toBeVisible();
  });

  test(`la navegación permite alternar entre resumen mensual y anual (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/resumen/2025-03');
    await page.getByRole('button', { name: /Explorar la demostra/ }).click();
    await expect(page.getByRole('heading', { name: 'marzo de 2025.', exact: true })).toBeVisible();
    const primary = page.getByRole('navigation', { name: 'Navegación principal', exact: true });
    if (width <= 1024) {
      await expect(primary.getByRole('link')).toHaveText(['▦Resumen anual', '⇌Liquidaciones']);
    } else {
      await expect(primary.getByRole('link', { name: 'Resumen', exact: true })).toHaveAttribute('aria-current', 'page');
      await expect(primary.getByRole('link', { name: 'Resumen anual', exact: true })).not.toHaveAttribute('aria-current', 'page');
    }
    await primary.getByRole('link', { name: 'Resumen anual', exact: true }).click();
    await expect(page).toHaveURL(/\/\?year=2025$/);
    await expect(page.getByLabel('Año del resumen')).toHaveValue('2025');
    if (width <= 1024) {
      await expect(primary.getByRole('link')).toHaveText(['◫Resumen', '⇌Liquidaciones']);
    } else {
      await expect(primary.getByRole('link', { name: 'Resumen anual', exact: true })).toHaveAttribute('aria-current', 'page');
      await expect(primary.getByRole('link', { name: 'Resumen', exact: true })).not.toHaveAttribute('aria-current', 'page');
    }
    await primary.getByRole('link', { name: 'Resumen', exact: true }).click();
    await expect(page).toHaveURL(/\/resumen\/2026-11$/);
    await expect(page.getByRole('heading', { name: 'noviembre de 2026.', exact: true })).toBeVisible();
    await openSecondaryMenu(page);
    const navigation = width <= 1024 ? page.getByRole('navigation', { name: 'Navegación del menú', exact: true }) : primary;
    await expect(navigation.getByRole('link', { name: 'Resumen', exact: true })).toBeVisible();
    await navigation.getByRole('link', { name: 'Resumen anual', exact: true }).click();
    await expect(page).toHaveURL(/\/\?year=2026$/);
    await expect(page.getByLabel('Año del resumen')).toHaveValue('2026');
    await expect(page.getByRole('dialog', { name: 'Menú', exact: true })).not.toBeVisible();
  });
}

test('Resumen recalcula el mes al cambiar de año según la fecha local', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-12-31T22:30:00Z'));
  await page.goto('/');
  await page.getByRole('button', { name: /Explorar la demostra/ }).click();
  await expect(page).toHaveURL(/\/resumen\/2026-12$/);
  await page.clock.setFixedTime(new Date('2026-12-31T23:30:00Z'));
  const navigation = page.getByRole('navigation', { name: 'Navegación principal', exact: true });
  await navigation.getByRole('link', { name: 'Liquidaciones', exact: true }).click();
  await navigation.getByRole('link', { name: 'Resumen', exact: true }).click();
  await expect(page).toHaveURL(/\/resumen\/2027-01$/);
  await expect(page.getByRole('heading', { name: 'enero de 2027.', exact: true })).toBeVisible();
  await page.getByRole('navigation', { name: 'Ruta de navegación' }).getByRole('link', { name: '2027', exact: true }).click();
  await expect(page.getByLabel('Año del resumen')).toHaveValue('2027');
});

test('un mes histórico conserva el breadcrumb a su propio año', async ({ page }) => {
  await page.goto('/resumen/2025-03');
  await page.getByRole('button', { name: /Explorar la demostra/ }).click();
  await expect(page.getByRole('heading', { name: 'marzo de 2025.', exact: true })).toBeVisible();
  await page.getByRole('navigation', { name: 'Ruta de navegación' }).getByRole('link', { name: '2025', exact: true }).click();
  await expect(page).toHaveURL(/\/\?year=2025$/);
  await expect(page.getByLabel('Año del resumen')).toHaveValue('2025');
});

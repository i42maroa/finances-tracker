import { test, expect } from '@playwright/test';

test.use({ timezoneId: 'Europe/Madrid' });
test.beforeEach(async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-19T12:00:00+01:00'));
  await page.route('**/firebase-config.test.json', route => route.fulfill({ json: { apiKey: '', authDomain: '', projectId: '', appId: '' } }));
});

for (const width of [390, 1440]) {
  for (const monthly of [true, false]) {
    test(`las tarjetas filtran ingresos, gastos o ambos (${monthly ? 'mes' : 'año'}, ${width}px)`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto(monthly ? '/' : '/?year=2026');
      await page.getByRole('button', { name: /Explorar la demostra/ }).click();
      const rows = page.locator('app-movement-list tbody tr');
      const income = page.getByRole('button', { name: 'Filtrar ingresos', exact: true });
      const expense = page.getByRole('button', { name: 'Filtrar gastos', exact: true });
      const balance = page.getByRole('button', { name: 'Mostrar ingresos y gastos', exact: true });
      await expect(rows).toHaveCount(6);
      const stats = await page.locator('.stat-value').allTextContents();
      const months = monthly ? '' : await page.locator('.months-table').textContent();
      await expect(balance).toHaveAttribute('aria-pressed', 'true');

      await expense.focus();
      await page.keyboard.press('Enter');
      await expect(rows).toHaveCount(3);
      await expect(expense).toHaveAttribute('aria-pressed', 'true');
      await expect(page.locator('app-movement-list .positive')).toHaveCount(0);
      await expect(page.getByRole('heading', { name: 'Gastos por categoría', exact: true })).toBeVisible();
      await page.locator('.category-row').filter({ hasText: 'Hogar' }).click();
      await expect(rows).toHaveCount(1);

      await income.focus();
      await page.keyboard.press('Space');
      await expect(income).toHaveAttribute('aria-pressed', 'true');
      await expect(rows).toHaveCount(3);
      await expect(page.locator('app-movement-list .negative')).toHaveCount(0);
      await expect(page.getByRole('heading', { name: 'Ingresos por categoría', exact: true })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Quitar filtro de categoría', exact: true })).toHaveCount(0);
      await expect(page.locator('.list-count')).toHaveText('3 de 6 movimientos');
      await expect(page.locator('.stat-value')).toHaveText(stats);
      if (!monthly) await expect(page.locator('.months-table')).toHaveText(months!);
      await page.getByRole('link', { name: 'Venta del mueble del salón', exact: true }).click();
      await expect(page.getByRole('region', { name: 'Datos del movimiento', exact: true })).toBeVisible();
      await expect(page).toHaveURL(/[?&]type=income/);
      await page.reload();
      await page.getByRole('button', { name: /Explorar la demostra/ }).click();
      await page.getByRole('navigation', { name: 'Ruta de navegación' }).getByRole('link', { name: monthly ? 'noviembre' : '2026', exact: true }).click();
      await expect(income).toHaveAttribute('aria-pressed', 'true');
      await expect(rows).toHaveCount(3);
      await expect(page.getByRole('heading', { name: 'Ingresos por categoría', exact: true })).toBeVisible();

      await page.locator('.category-row').first().click();
      await balance.click();
      await expect(rows).toHaveCount(6);
      await expect(balance).toHaveAttribute('aria-pressed', 'true');
      await expect(page.getByRole('heading', { name: 'Gastos por categoría', exact: true })).toBeVisible();
      await expect(page.locator('.category-row')).toHaveCount(3);
      await expect(page.getByRole('button', { name: 'Quitar filtro de tipo', exact: true })).toHaveCount(0);
      await expect(page.locator('.stat-value')).toHaveText(stats);

      await page.getByRole('button', { name: /Individual/ }).click();
      await expect(rows).toHaveCount(7);
      await expense.click();
      await expect(rows).toHaveCount(4);
      await page.getByRole('button', { name: 'Ver ingresos', exact: true }).click();
      await expect(income).toHaveAttribute('aria-pressed', 'true');
      await expect(rows).toHaveCount(3);
      await expect(page.locator('app-movement-list .negative')).toHaveCount(0);
      await page.getByRole('button', { name: 'Quitar filtro de tipo', exact: true }).click();
      await expect(rows).toHaveCount(7);
      await expect(page.getByRole('heading', { name: 'Gastos por categoría', exact: true })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      if (monthly) await page.screenshot({ path: `.runtime/summary-type-${width}.png`, fullPage: true });
    });
  }
}

test('el filtro de tipo combina la búsqueda, muestra vacíos y reinicia la paginación', async ({ page }) => {
  await page.goto('/?year=2026');
  await page.getByRole('button', { name: /Explorar la demostra/ }).click();
  await expect(page.locator('app-movement-list tbody tr')).toHaveCount(6);
  await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('hucha-demo-v1')!);
    const expense = data.movements.find((item: { id: string }) => item.id === '2');
    const income = data.movements.find((item: { id: string }) => item.id === '6');
    data.movements = [...Array.from({ length: 23 }, (_, index) => ({ ...expense, id: `expense-${index}`, concept: `Gasto ${index}` })), income];
    localStorage.setItem('hucha-demo-v1', JSON.stringify(data));
  });
  await page.reload();
  await page.getByRole('button', { name: /Explorar la demostra/ }).click();
  const pagination = page.getByRole('navigation', { name: 'Paginación de movimientos', exact: true });
  await pagination.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await expect(pagination.getByRole('status')).toHaveText('Página 2 de 3');
  await page.getByRole('button', { name: 'Filtrar ingresos', exact: true }).click();
  await expect(page.locator('app-movement-list tbody tr')).toHaveCount(1);
  await expect(pagination).toHaveCount(0);
  await page.getByRole('button', { name: 'Filtrar gastos', exact: true }).click();
  await expect(pagination.getByRole('status')).toHaveText('Página 1 de 3');
  await pagination.getByRole('button', { name: 'Siguiente', exact: true }).click();
  await page.getByRole('button', { name: 'Mostrar ingresos y gastos', exact: true }).click();
  await expect(pagination.getByRole('status')).toHaveText('Página 1 de 3');
  await page.getByRole('button', { name: 'Filtrar movimientos', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Nombre del movimiento').fill('mueble');
  await page.getByRole('dialog').getByRole('button', { name: 'Aplicar filtros', exact: true }).click();
  await page.getByRole('button', { name: 'Filtrar gastos', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Sin movimientos', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Filtrar ingresos', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Venta del mueble del salón', exact: true })).toBeVisible();
  await expect(page.locator('app-movement-list tbody tr')).toHaveCount(1);
});

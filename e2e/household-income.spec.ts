import { test, expect } from '@playwright/test';

for (const width of [390, 1440]) {
  test(`Hogar suma ingresos de ambos sin compartir gastos individuales ni alterar deudas (${width}px)`, async ({ page }) => {
    await page.clock.setFixedTime(new Date('2026-11-20T12:00:00+01:00'));
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/resumen/2026-11');
    await page.getByRole('button', { name: /Explorar la demostra/ }).click();
    await expect(page.getByRole('heading', { name: 'Movimientos del mes', exact: true })).toBeVisible();
    await page.evaluate(() => {
      const data = JSON.parse(localStorage.getItem('hucha-demo-v1')!);
      const base = data.movements.find((item: { id: string }) => item.id === '2');
      const row = (id: string, type: string, space: string, ownerId: string, amountCents: number, date = '2026-11-02') => ({
        ...base, id, concept: id, type, space, ownerId, actorId: ownerId, createdBy: ownerId, amountCents, date,
        categoryId: type === 'income' ? 'salary' : 'home', subcategoryId: ''
      });
      data.movements = [
        row('Nómina Antonio', 'income', 'individual', 'antonio', 200000),
        row('Nómina Álex', 'income', 'individual', 'alex', 180000),
        { ...row('Ingreso común histórico', 'income', 'shared', 'alex', 10000), categoryId: 'other-income' },
        row('Alquiler común', 'expense', 'shared', 'antonio', 150000),
        row('Gasto privado Antonio', 'expense', 'individual', 'antonio', 10000),
        row('Gasto privado Álex', 'expense', 'individual', 'alex', 20000),
        row('Ingreso de enero', 'income', 'individual', 'antonio', 30000, '2026-01-02'),
        { ...row('Ingreso de otro año', 'income', 'individual', 'alex', 900000, '2025-11-02'), recurringId: 'salary-alex', scheduledDate: '2025-11-02', status: 'confirmed' },
        { ...row('Pendiente', 'income', 'individual', 'alex', 50000), status: 'pending' }
      ];
      data.settlements = [];
      localStorage.setItem('hucha-demo-v1', JSON.stringify(data));
    });
    await page.reload();
    await page.getByRole('button', { name: /Explorar la demostra/ }).click();
    const stats = page.locator('.stat-value');
    await expect(stats).toHaveText(['3900,00 €', '1500,00 €', '2400,00 €']);
    await expect(page.getByRole('button', { name: 'Filtrar ingresos', exact: true })).toContainText('Ingresos totales de la pareja');
    await expect(page.getByRole('button', { name: 'Mostrar ingresos y gastos', exact: true })).toContainText('Disponible tras gastos comunes');
    await expect(page.getByRole('link', { name: 'Nómina Álex', exact: true })).toBeVisible();
    await expect(page.getByRole('link', { name: /Gasto privado/ })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Pendiente', exact: true })).toHaveCount(0);
    await page.screenshot({ path: `.runtime/household-income-${width}.png`, fullPage: true });
    await page.getByRole('link', { name: 'Nómina Álex', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Nómina Álex.', exact: true })).toBeVisible();
    await expect(page.getByRole('group', { name: 'Acciones del movimiento', exact: true })).toHaveCount(0);
    await page.getByRole('navigation', { name: 'Ruta de navegación' }).getByRole('link', { name: 'noviembre', exact: true }).click();
    await page.getByRole('button', { name: /Individual/ }).click();
    await expect(stats).toHaveText(['2050,00 €', '850,00 €', '1200,00 €']);
    await expect(page.getByRole('link', { name: 'Nómina Álex', exact: true })).toHaveCount(0);
    await expect(page.getByRole('link', { name: 'Gasto privado Antonio', exact: true })).toBeVisible();
    await page.locator('.scope-switch').getByRole('button', { name: /Hogar/ }).click();
    await page.getByRole('navigation', { name: 'Ruta de navegación' }).getByRole('link', { name: '2026', exact: true }).click();
    await expect(stats).toHaveText(['4200,00 €', '1500,00 €', '2700,00 €']);
    await expect(page.locator('.months-table tbody tr')).toHaveCount(2);
    await expect(page.locator('.months-table tbody tr').first()).toContainText('300,00 €');
    await expect(page.locator('.months-table tbody tr').last()).toContainText('3900,00 €');
    await page.getByRole('button', { name: 'Filtrar ingresos', exact: true }).click();
    await expect(page.locator('.category-total')).toContainText('4200,00 €');
    await page.getByRole('button', { name: 'Gráfico de líneas', exact: true }).click();
    await page.locator('.category-row').filter({ hasText: 'Nómina' }).click();
    await page.locator('app-monthly-lines .chart-point').nth(10).click();
    await expect(page.getByRole('dialog', { name: 'Importe mensual', exact: true })).toContainText('3800,00 €');
    await page.getByRole('button', { name: /Individual/ }).click();
    await page.getByLabel('Año del resumen').fill('2025');
    await expect(stats).toHaveText(['0,00 €', '0,00 €', '0,00 €']);
    await expect(page.locator('.months-table tbody tr')).toHaveCount(0);
    await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Liquidaciones', exact: true }).click();
    await expect(page.locator('.debt-amount')).toHaveText('800,00 €');
    await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Resumen', exact: true }).click();
    await page.getByRole('button', { name: 'Añadir movimiento', exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('tab', { name: 'Ingreso', exact: true }).click();
    await dialog.getByRole('combobox', { name: 'Categoría', exact: true }).selectOption('salary');
    await dialog.getByLabel('Nombre', { exact: true }).fill('Nuevo ingreso propio');
    await dialog.getByLabel('Importe').fill('100');
    await dialog.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(stats).toHaveText(['4000,00 €', '1500,00 €', '2500,00 €']);
    await page.reload();
    await page.getByRole('button', { name: /Explorar la demostra/ }).click();
    await expect(stats).toHaveText(['4000,00 €', '1500,00 €', '2500,00 €']);
    const movements = await page.evaluate(() => JSON.parse(localStorage.getItem('hucha-demo-v1')!).movements as { id: string; concept: string; space: string; ownerId: string }[]);
    expect(movements.filter(item => item.id === 'Nómina Álex')).toHaveLength(1);
    expect(movements.filter(item => item.id === 'Gasto privado Álex')).toHaveLength(1);
    expect(movements.find(item => item.concept === 'Nuevo ingreso propio')).toMatchObject({ space: 'individual', ownerId: 'antonio' });
    await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Liquidaciones', exact: true }).click();
    await expect(page.locator('.debt-amount')).toHaveText('800,00 €');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

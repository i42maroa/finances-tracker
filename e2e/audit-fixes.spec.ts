import { test, expect } from '@playwright/test';

test('conserva año, espacio, tipo y gráfico al recargar y volver de un movimiento', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-20T12:00:00+01:00'));
  await page.goto('/?year=2026');
  await page.getByRole('button', { name: /Explorar la demostra/ }).click();
  await page.getByRole('button', { name: /Individual/ }).click();
  await page.getByRole('button', { name: 'Ver ingresos', exact: true }).click();
  await page.getByRole('button', { name: 'Gráfico de líneas', exact: true }).click();
  await expect(page).toHaveURL(/chart=lines/);
  await page.reload();
  await page.getByRole('button', { name: /Explorar la demostra/ }).click();
  await expect(page.getByLabel('Año del resumen')).toHaveValue('2026');
  await expect(page.getByRole('button', { name: /Individual/ })).toHaveClass('selected');
  await expect(page.getByRole('heading', { name: 'Ingresos por categoría', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Gráfico de líneas', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.locator('app-movement-list .movement-link').first().click();
  await page.getByRole('navigation', { name: 'Ruta de navegación' }).getByRole('link', { name: '2026', exact: true }).click();
  await expect(page.getByRole('button', { name: /Individual/ })).toHaveClass('selected');
  await expect(page.getByRole('heading', { name: 'Ingresos por categoría', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Gráfico de líneas', exact: true })).toHaveAttribute('aria-pressed', 'true');
});

test('el total anual coincide con los meses visibles cuando hay movimientos futuros', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-11-20T12:00:00+01:00'));
  await page.goto('/?year=2026');
  await page.getByRole('button', { name: /Explorar la demostra/ }).click();
  await expect(page.locator('.stat-value')).toHaveCount(3);
  await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('hucha-demo-v1')!);
    const base = data.movements.find((item: { type: string }) => item.type === 'income');
    data.movements = [{ ...base, id: 'nov', date: '2026-11-01', amountCents: 10000 }, { ...base, id: 'dec', date: '2026-12-01', amountCents: 20000 }];
    data.recurringMovements = [];
    localStorage.setItem('hucha-demo-v1', JSON.stringify(data));
  });
  await page.reload();
  await page.getByRole('button', { name: /Explorar la demostra/ }).click();
  await expect(page.locator('.stat-value').first()).toHaveText('100,00 €');
  await expect(page.locator('.months-table tbody tr')).toHaveCount(1);
  await expect(page.locator('.months-table tbody tr').first()).toContainText('100,00 €');
  await expect(page.locator('app-movement-list tbody tr')).toHaveCount(1);
});

test('guardar sin cambios conserva los metadatos y el historial recurrente', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Explorar la demostra/ }).click();
  await expect(page.locator('app-movement-list .movement-link').first()).toBeVisible();
  const before = await page.evaluate(() => localStorage.getItem('hucha-demo-v1'));
  await page.locator('app-movement-list .movement-link').first().click();
  await page.getByRole('button', { name: 'Editar', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('hucha-demo-v1'))).toBe(before);
  await page.goto('/recurrentes');
  await page.getByRole('button', { name: /Explorar la demostra/ }).click();
  await page.getByRole('button', { name: 'Añadir recurrente' }).click();
  await page.getByRole('dialog').getByLabel('Nombre', { exact: true }).fill('Recurrente sin cambios');
  await page.getByRole('dialog').getByLabel('Importe (€)', { exact: true }).fill('25');
  await page.getByRole('dialog').getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  const recurringBefore = await page.evaluate(() => localStorage.getItem('hucha-demo-v1'));
  await page.getByRole('article', { name: 'Recurrente sin cambios', exact: true }).getByRole('button', { name: 'Editar recurrencia', exact: true }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('hucha-demo-v1'))).toBe(recurringBefore);
});

test('reintentar un alta ya almacenada conserva su identificador y evita duplicados', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Explorar la demostra/ }).click();
  await page.getByRole('button', { name: 'Añadir movimiento', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Nombre', { exact: true }).fill('Alta reintentada');
  await page.getByRole('dialog').getByLabel('Importe (€)', { exact: true }).fill('10');
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function(key, value) {
      original.call(this, key, value);
      if (key === 'hucha-demo-v1') {
        Storage.prototype.setItem = original;
        throw new Error('Respuesta interrumpida');
      }
    };
  });
  await page.getByRole('dialog').getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.getByRole('dialog')).toContainText('Respuesta interrumpida');
  const savedId = await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('hucha-demo-v1')!);
    const id = data.movements.find((item: { concept: string }) => item.concept === 'Alta reintentada').id;
    window.dispatchEvent(new StorageEvent('storage', { key: 'hucha-demo-v1' }));
    return id;
  });
  await page.getByRole('dialog').getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('hucha-demo-v1')!).movements.filter((item: { concept: string }) => item.concept === 'Alta reintentada'));
  expect(saved).toHaveLength(1);
  expect(saved[0].id).toBe(savedId);
});

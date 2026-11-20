import { test, expect } from '@playwright/test';
import { clickSecondary, openSecondaryMenu, openSettings } from './secondary-menu';
test.beforeEach(async ({ page }) => {
  await page.goto(`/?year=${new Date().getFullYear()}`);
  await page.getByRole('button', { name: /Explorar la demostra/ }).click();
  await expect(page.getByRole('heading', { name: /^Hogar \d{4}\.$/ })).toBeVisible();
});

test('el resumen incluye todos los movimientos del año y sustituye a la página anterior', async ({ page }) => {
  await expect(page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Movimientos', exact: true })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Movimientos del año', exact: true })).toBeVisible();
  await page.getByRole('button', { name: /Individual/ }).click();
  await expect(page.locator('app-movement-list tbody tr')).toHaveCount(7);
  await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('hucha-demo-v1')!);
    data.movements.push({ ...data.movements[0], id: 'older', date: (new Date().getFullYear()-1)+'-01-01' });
    localStorage.setItem('hucha-demo-v1', JSON.stringify(data));
  });
  await page.goto('/movimientos');
  await page.getByRole('button', { name: /Explorar la demostra/ }).click();
  await expect(page).toHaveURL(/\/resumen\/\d{4}-\d{2}$/);
  await page.getByRole('navigation', { name: 'Ruta de navegación' }).getByRole('link', { name: String(new Date().getFullYear()), exact: true }).click();
  await page.getByRole('button', { name: /Individual/ }).click();
  await expect(page.locator('app-movement-list tbody tr')).toHaveCount(7);
  await page.getByLabel('Año del resumen').fill(String(new Date().getFullYear()-1));
  await expect(page.locator('app-movement-list tbody tr')).toHaveCount(1);
});

test('categoría y nombre filtran solo la lista y Cancelar descarta el formulario', async ({ page }) => {
  const stats = await page.locator('.stat-value').allTextContents();
  const months = await page.locator('.months-table').textContent();
  await page.locator('.categories-panel').getByRole('button', { name: /Hogar/ }).click();
  await expect(page.locator('app-movement-list tbody tr')).toHaveCount(1);
  await expect(page.locator('.stat-value')).toHaveText(stats);
  await expect(page.locator('.months-table')).toHaveText(months);
  await expect(page.locator('.debt-card')).toHaveCount(0);
  await expect(page.locator('.category-row')).toHaveCount(3);
  await page.getByRole('button', { name: 'Filtrar movimientos', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('button', { name: 'Limpiar nombre' })).toHaveCount(0);
  await dialog.getByLabel('Nombre del movimiento').fill('ALQUILER');
  await dialog.getByRole('button', { name: 'Aplicar filtros' }).click();
  await expect(dialog).not.toBeVisible();
  await page.getByRole('button', { name: 'Quitar filtro de categoría' }).click();
  await expect(page.locator('app-movement-list tbody tr')).toHaveCount(1);
  await page.getByRole('button', { name: 'Filtrar movimientos', exact: true }).click();
  await dialog.getByLabel('Nombre del movimiento').fill('no debe aplicarse');
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(page.locator('app-movement-list tbody tr')).toHaveCount(1);
  await page.getByRole('button', { name: 'Quitar filtro de nombre' }).click();
  await expect(page.locator('app-movement-list tbody tr')).toHaveCount(6);
});

test('la búsqueda ignora tildes y se conserva al volver del detalle y recargar', async ({ page }) => {
  await page.getByRole('button', { name: /Individual/ }).click();
  await page.getByRole('button', { name: 'Filtrar movimientos', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Nombre del movimiento').fill('IMPRESION');
  await page.getByRole('dialog').getByRole('button', { name: 'Aplicar filtros' }).click();
  await expect(page.locator('app-movement-list tbody tr')).toHaveCount(1);
  await page.getByRole('link', { name: 'Encargo de impresión 3D', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Encargo de impresión 3D.' })).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: /Explorar la demostra/ }).click();
  await page.getByRole('navigation', { name: 'Ruta de navegación' }).getByRole('link', { name: String(new Date().getFullYear()), exact: true }).click();
  await expect(page.locator('app-movement-list tbody tr')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Quitar filtro de nombre' })).toContainText('IMPRESION');
});

test('se puede editar y eliminar un movimiento desde su detalle y volver al resumen', async ({ page }) => {
  await page.getByRole('row').filter({ hasText: 'Nuestro alquiler' }).getByRole('cell').last().click();
  await expect(page.getByRole('navigation', { name: 'Ruta de navegación' })).toHaveText(new RegExp('Resumen\\s*/\\s*'+new Date().getFullYear()+'\\s*/\\s*Nuestro alquiler'));
  await expect(page.locator('app-movement-list button')).toHaveCount(0);
  await clickSecondary(page, page.getByRole('button', { name: 'Editar', exact: true }));
  await page.getByRole('dialog').getByLabel('Importe').fill('900');
  await page.getByRole('dialog').getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(page.locator('.detail-amount')).toHaveText('−900,00 €');
  await clickSecondary(page, page.getByRole('button', { name: 'Eliminar', exact: true }));
  await page.getByRole('dialog').getByRole('button', { name: 'Eliminar registro', exact: true }).click();
  await expect(page.getByRole('heading', { name: /^Hogar \d{4}\.$/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Nuestro alquiler', exact: true })).toHaveCount(0);
});

for (const width of [1440, 390]) {
test(`configuración separa perfil y pareja (${width}px)`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 });
  await expect(page.getByRole('button', { name: 'Cerrar sesión', exact: true })).toHaveCount(0);
  await openSettings(page);
  const settings = page.getByRole('group', { name: 'Opciones de configuración' });
  await openSecondaryMenu(page);
  await expect(settings.getByRole('link')).toHaveCount(3);
  await clickSecondary(page, settings.getByRole('link', { name: 'Perfil', exact: true }));
  await expect(page).toHaveURL(/configuracion[/]perfil/);
  await expect(page.getByRole('navigation', { name: 'Ruta de navegación' })).toHaveText(/Configuración\s*[/]\s*Perfil/);
  await expect(page.locator('.account-card')).toContainText('Antonio');
  await expect(page.locator('.couple-card')).toHaveCount(0);
  await openSecondaryMenu(page);
  await expect(page.getByRole('button', { name: 'Cerrar sesión', exact: true })).toHaveCount(1);
  await clickSecondary(page, settings.getByRole('link', { name: 'Ver nuestra pareja', exact: true }));
  await expect(page).toHaveURL(/configuracion[/]pareja/);
  await expect(page.getByRole('heading', { name: 'Nuestra pareja.', exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Ruta de navegación' })).toHaveText(/Configuración\s*[/]\s*Nuestra pareja/);
  await expect(page.locator('.couple-card')).toContainText('Álex');
  await expect(page.locator('.account-card')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Cerrar sesión', exact: true })).toHaveCount(0);
  await clickSecondary(page, settings.getByRole('link', { name: 'Categorías', exact: true }));
  await expect(page.getByRole('heading', { name: 'Categorías.' })).toBeVisible();
  await clickSecondary(page, page.getByRole('link', { name: 'Mi perfil: Antonio', exact: true }));
  await expect(page).toHaveURL(/configuracion[/]perfil/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await clickSecondary(page, page.getByRole('group', { name: 'Opciones del perfil' }).getByRole('button', { name: 'Cerrar sesión', exact: true }));
  await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
});
}

test('el modal de filtros y las categorías se usan en el detalle mensual móvil', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('.months-table tbody a').first().click();
  await expect(page.getByRole('heading', { name: 'Movimientos del mes' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Añadir movimiento', exact: true })).toBeVisible();
  await page.locator('.categories-panel').getByRole('button', { name: /Hogar/ }).click();
  await expect(page.locator('app-movement-list tbody tr')).toHaveCount(1);
  await page.getByRole('button', { name: 'Filtrar movimientos', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Nombre del movimiento').fill('no existe');
  await page.getByRole('dialog').getByRole('button', { name: 'Aplicar filtros' }).click();
  await expect(page.getByRole('heading', { name: 'Sin movimientos' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('la lista pagina por diez y vuelve al inicio al buscar o cambiar de año', async ({ page }) => {
  await page.evaluate(() => {
    const data = JSON.parse(localStorage.getItem('hucha-demo-v1')!);
    const base = data.movements.find((item: { space: string; type: string }) => item.space === 'shared' && item.type === 'expense');
    data.movements = Array.from({ length: 23 }, (_, index) => ({ ...base, id: `page-${index}`, concept: `Registro ${String(index + 1).padStart(2, '0')}`, amountCents: 100 }));
    localStorage.setItem('hucha-demo-v1', JSON.stringify(data));
  });
  await page.reload();
  await page.getByRole('button', { name: /Explorar la demostra/ }).click();
  const pagination = page.getByRole('navigation', { name: 'Paginación de movimientos' });
  await expect(page.locator('.list-count')).toHaveText('23 movimientos en total');
  await expect(page.locator('app-movement-list tbody tr')).toHaveCount(10);
  await expect(pagination.getByRole('button', { name: 'Anterior' })).toBeDisabled();
  await pagination.getByRole('button', { name: 'Siguiente' }).click();
  await expect(pagination.getByRole('status')).toHaveText('Página 2 de 3');
  await expect(page.getByRole('link', { name: 'Registro 11', exact: true })).toBeVisible();
  await pagination.getByRole('button', { name: 'Siguiente' }).click();
  await expect(page.locator('app-movement-list tbody tr')).toHaveCount(3);
  await expect(pagination.getByRole('button', { name: 'Siguiente' })).toBeDisabled();
  await pagination.getByRole('button', { name: 'Anterior' }).click();
  await expect(pagination.getByRole('status')).toHaveText('Página 2 de 3');
  await page.getByRole('button', { name: 'Filtrar movimientos', exact: true }).click();
  await page.getByRole('dialog').getByLabel('Nombre del movimiento').fill('Registro 23');
  await page.getByRole('dialog').getByRole('button', { name: 'Aplicar filtros' }).click();
  await expect(pagination).toHaveCount(0);
  await expect(page.locator('.list-count')).toHaveText('1 de 23 movimientos');
  await expect(page.locator('app-movement-list tbody tr')).toHaveCount(1);
  await page.getByRole('button', { name: 'Quitar filtro de nombre' }).click();
  await expect(pagination.getByRole('status')).toHaveText('Página 1 de 3');
  await pagination.getByRole('button', { name: 'Siguiente' }).click();
  await page.getByLabel('Año del resumen').fill(String(new Date().getFullYear() - 1));
  await expect(pagination).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Sin movimientos' })).toBeVisible();
});

test('alterna ingresos y gastos, muestra sectores y permite filtrar desde una cuña', async ({ page }) => {
  await expect(page.locator('.subtle-tag')).toHaveCount(0);
  const stats = await page.locator('.stat-value').allTextContents();
  await expect(page.getByRole('navigation', { name: 'Paginación de movimientos' })).toHaveCount(0);
  await page.getByRole('button', { name: 'Ver ingresos', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Ingresos por categoría' })).toBeVisible();
  await expect(page.locator('.category-total')).toContainText('2445,00');
  await expect(page.locator('.category-row')).toHaveCount(3);
  await page.getByRole('button', { name: 'Gráfico de sectores', exact: true }).click();
  await expect(page.locator('.category-pie path')).toHaveCount(3);
  expect(await page.locator('.category-pie path').first().getAttribute('d')).not.toContain('NaN');
  await page.locator('.category-pie path').filter({ hasText: 'Otros ingresos' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('app-movement-list tbody tr')).toHaveCount(1);
  await expect(page.getByRole('link', { name: 'Venta del mueble del salón', exact: true })).toBeVisible();
  await expect(page.locator('.stat-value')).toHaveText(stats);
  await page.getByRole('button', { name: 'Ver gastos', exact: true }).click();
  await expect(page.locator('.category-pie path')).toHaveCount(3);
  await expect(page.getByRole('button', { name: 'Quitar filtro de categoría' })).toHaveCount(0);
  await expect(page.locator('app-movement-list tbody tr')).toHaveCount(6);
  await page.getByRole('button', { name: 'Gráfico de barras', exact: true }).click();
  await expect(page.locator('.category-pie')).toHaveCount(0);
  await expect(page.locator('.bar-track')).toHaveCount(3);
});

test('el gráfico se adapta al móvil y maneja períodos sin datos', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Gráfico de sectores', exact: true }).click();
  await expect(page.locator('.category-pie path')).toHaveCount(3);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.getByRole('button', { name: 'Ver ingresos', exact: true }).click();
  await page.getByLabel('Año del resumen').fill('2020');
  await expect(page.locator('.category-pie')).toHaveCount(0);
  await expect(page.getByText('No hay ingresos en este período.', { exact: true })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Paginación de movimientos' })).toHaveCount(0);
  await expect(page.locator('.list-count')).toHaveText('0 movimientos en total');
});

test('ordena por fecha descendente y creación, y muestra solo la parte individual de Hogar', async ({ page }) => {
  const year = new Date().getFullYear();
  await page.evaluate(year => {
    const data = JSON.parse(localStorage.getItem('hucha-demo-v1')!);
    const base = data.movements.find((item: { type: string; space: string }) => item.type === 'expense' && item.space === 'shared');
    data.movements = [
      { ...base, id: 'old', concept: 'Anterior', amountCents: 101, date: `${year}-01-01`, createdAt: `${year}-01-01T09:00:00.000Z` },
      { ...base, id: 'same-day-old', concept: 'Mismo día anterior', amountCents: 5800, payment: 'half', date: `${year}-02-01`, createdAt: `${year}-02-01T09:00:00.000Z` },
      { ...base, id: 'new', concept: 'Último', amountCents: 85000, actorId: 'alex', date: `${year}-02-01`, createdAt: `${year}-02-01T10:00:00.000Z` },
      { ...base, id: 'private-other', concept: 'Privado de Álex', space: 'individual', ownerId: 'alex' },
      { ...base, id: 'personal', concept: 'Individual completo', amountCents: 3200, space: 'individual', ownerId: 'antonio', date: `${year}-01-02`, createdAt: `${year}-01-02T09:00:00.000Z` }
    ];
    localStorage.setItem('hucha-demo-v1', JSON.stringify(data));
  }, year);
  await page.reload();
  await page.getByRole('button', { name: /Explorar la demostra/ }).click();
  await expect(page.locator('app-movement-list .movement-link')).toHaveText(['Último', 'Mismo día anterior', 'Anterior']);
  await expect(page.getByRole('row').filter({ hasText: 'Último' }).locator('.amount')).toHaveText('−850,00 €');
  await page.getByRole('button', { name: /Individual/ }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Último' }).locator('.amount')).toHaveText('−425,00 €');
  await expect(page.getByRole('row').filter({ hasText: 'Mismo día anterior' }).locator('.amount')).toHaveText('−29,00 €');
  await expect(page.getByRole('row').filter({ hasText: 'Individual completo' }).locator('.amount')).toHaveText('−32,00 €');
  await expect(page.locator('app-movement-list tbody tr').last().locator('.amount')).toHaveText('−0,51 €');
  await expect(page.getByRole('combobox', { name: 'Persona', exact: true })).toHaveCount(0);
  await expect(page.getByRole('checkbox')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Privado de Álex', exact: true })).toHaveCount(0);
  await page.goto(`/?year=${year}&scope=personal&person=alex&shared=false`);
  await page.getByRole('button', { name: /Explorar la demostra/ }).click();
  await expect(page.getByRole('link', { name: 'Individual completo', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Privado de Álex', exact: true })).toHaveCount(0);
  await expect(page.locator('app-movement-list tbody tr').last().locator('.amount')).toHaveText('−0,51 €');
  await page.getByRole('link', { name: 'Último', exact: true }).click();
  await expect(page.locator('.detail-amount')).toHaveText('−850,00 €');
});

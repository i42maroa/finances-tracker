import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto(`/?year=${new Date().getFullYear()}`);
  await page.getByRole('button', { name: /Explorar la demostra/ }).click();
  await expect(page.getByRole('heading', { name: /^Hogar \d{4}\.$/ })).toBeVisible();
});

test('el resumen anual permite abrir los meses con movimientos y volver desde el breadcrumb', async ({ page }) => {
  const year = new Date().getFullYear();
  const month = new Date().getMonth();
  const monthName = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(new Date(year, month, 1));
  await expect(page.getByLabel('Año del resumen')).toHaveValue(String(year));
  expect(await page.locator('.months-panel').evaluate(el => !!(el.compareDocumentPosition(document.querySelector('.categories-panel')!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
  await expect(page.locator('.debt-card')).toHaveCount(0);
  await expect(page.locator('.list-count')).toHaveText('4 movimientos en total');
  await expect(page.getByRole('navigation', { name: 'Ruta de navegación' })).toHaveText(new RegExp(`Resumen\\s*/\\s*${year}`));
  await expect(page.locator('.months-table tbody tr')).toHaveCount(1);
  const rows = page.locator('.months-table tbody tr');
  await expect(rows.first()).toContainText(monthName);
  await page.getByRole('link', { name: monthName, exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/resumen/${year}-${String(month + 1).padStart(2, '0')}`));
  await expect(page.getByRole('heading', { name: `${monthName} de ${year}.`, exact: true })).toBeVisible();
  await expect(page.locator('.debt-card')).toHaveCount(0);
  await expect(page.locator('.months-table')).toHaveCount(0);
  await expect(page.getByRole('heading', { name: 'Movimientos del mes' })).toBeVisible();
  const breadcrumb = page.getByRole('navigation', { name: 'Ruta de navegación' });
  await expect(breadcrumb).toHaveText(new RegExp(`Resumen\\s*/\\s*${year}\\s*/\\s*${monthName}`));
  await breadcrumb.getByRole('link', { name: String(year), exact: true }).click();
  await expect(rows).toHaveCount(1);
  await expect(page.locator('.debt-card')).toHaveCount(0);
});

test('suma meses del año, excluye otros años y el detalle incluye todos los movimientos', async ({ page }) => {
  const year = new Date().getFullYear() - 1;
  await page.evaluate(year => {
    const data = JSON.parse(localStorage.getItem('hucha-demo-v1')!);
    const base = data.movements.find((item: {type: string; space: string}) => item.type === 'income' && item.space === 'shared');
    data.movements = Array.from({ length: 7 }, (_, i) => ({ ...base, id: `jan-${i}`, amountCents: 100, date: `${year}-01-${String(i + 1).padStart(2, '0')}` }));
    data.movements.push({ ...base, id: 'dec', type: 'expense', categoryId: 'home', amountCents: 300, date: `${year}-12-01` });
    data.movements.push({ ...base, id: 'old', amountCents: 900000, date: `${year - 1}-01-01` });
    localStorage.setItem('hucha-demo-v1', JSON.stringify(data));
  }, year);
  await page.reload();
  await page.getByRole('button', { name: /Explorar la demostra/ }).click();
  await page.getByLabel('Año del resumen').fill(String(year));
  await expect(page.locator('.stat-value').nth(0)).toHaveText('7,00 €');
  await expect(page.locator('.stat-value').nth(1)).toHaveText('3,00 €');
  await expect(page.locator('.stat-value').nth(2)).toHaveText('4,00 €');
  await expect(page.locator('.months-table tbody tr').first()).toContainText('7,00 €');
  await expect(page.locator('.months-table tbody tr').last().getByRole('cell').last()).toHaveText('-3,00 €');
  await page.getByRole('link', { name: 'enero', exact: true }).click();
  await expect(page.locator('app-movement-list tbody tr')).toHaveCount(7);
  await expect(page.locator('.stat-value').first()).toHaveText('7,00 €');
  await page.locator('app-movement-list .movement-link').first().click();
  await expect(page.getByRole('navigation', { name: 'Ruta de navegación' })).toHaveText(new RegExp(`Resumen\\s*/\\s*${year}\\s*/\\s*enero\\s*/`));
  await page.reload();
  await page.getByRole('button', { name: /Explorar la demostra/ }).click();
  const originBreadcrumb = page.getByRole('navigation', { name: 'Ruta de navegación' });
  await expect(originBreadcrumb).toHaveText(new RegExp(`Resumen\\s*/\\s*${year}\\s*/\\s*enero\\s*/`));
  await originBreadcrumb.getByRole('link', { name: 'enero', exact: true }).click();
  await expect(page.locator('app-movement-list tbody tr')).toHaveCount(7);
  await page.getByRole('navigation', { name: 'Ruta de navegación' }).getByRole('link', { name: String(year), exact: true }).click();
  await expect(page.getByLabel('Año del resumen')).toHaveValue(String(year));
  await expect(page.locator('.months-table tbody tr')).toHaveCount(2);
});

test('el detalle conserva la atribución individual y muestra todos los registros del mes', async ({ page }) => {
  const year = new Date().getFullYear(), month = new Date().getMonth();
  const label = new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(new Date(year, month, 1));
  await page.getByRole('button', { name: 'Individual', exact: false }).click();
  await expect(page.locator('.stat-value').first()).toHaveText('2385,00 €');
  const income = await page.locator('.stat-value').first().innerText();
  await page.getByRole('link', { name: label, exact: true }).click();
  await expect(page.locator('.view-caption')).toHaveCount(0);
  await expect(page.locator('.stat-value').first()).toHaveText(income);
  await expect(page.locator('app-movement-list tbody tr')).toHaveCount(7);
  await page.reload();
  await page.getByRole('button', { name: /Explorar la demostra/ }).click();
  await expect(page.locator('app-movement-list tbody tr')).toHaveCount(7);
  await expect(page.locator('.debt-card')).toHaveCount(0);
  await expect(page.locator('.category-row')).toHaveCount(4);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('rechaza enlaces con un mes inexistente', async ({ page }) => {
  await page.goto('/resumen/2026-13');
  await page.getByRole('button', { name: /Explorar la demostra/ }).click();
  await expect(page.getByRole('heading', { name: 'Mes no válido' })).toBeVisible();
});

test('oculta meses futuros y vacíos, conserva meses con balance cero y muestra el estado vacío', async ({ page }) => {
  const year = new Date().getFullYear();
  await page.evaluate(year => {
    const data = JSON.parse(localStorage.getItem('hucha-demo-v1')!);
    const base = data.movements.find((item: { type: string; space: string }) => item.type === 'income' && item.space === 'shared');
    data.movements = [
      { ...base, id: 'income', amountCents: 1000, date: `${year}-01-01` },
      { ...base, id: 'expense', type: 'expense', categoryId: 'home', amountCents: 1000, date: `${year}-01-01` },
      { ...base, id: 'future-year', date: `${year + 1}-01-01` }
    ];
    if (new Date().getMonth() < 11) data.movements.push({ ...base, id: 'future-month', date: `${year}-12-01` });
    localStorage.setItem('hucha-demo-v1', JSON.stringify(data));
  }, year);
  await page.reload();
  await page.getByRole('button', { name: /Explorar la demostra/ }).click();
  const panel = page.getByRole('region', { name: 'Resumen por meses' });
  await expect(panel.locator('tbody tr')).toHaveCount(1);
  await expect(panel.locator('tbody tr').first()).toContainText('enero');
  await expect(panel.locator('tbody tr').first().getByRole('cell').last()).toHaveText('0,00 €');
  await expect(panel.locator('tbody tr').first().getByRole('cell').last()).toHaveClass('negative-amount');
  await panel.getByLabel('Año del resumen').fill(String(year + 1));
  await expect(panel.getByText('No hay movimientos todavía.', { exact: true })).toBeVisible();
  await expect(panel.locator('tbody tr')).toHaveCount(0);
  await page.getByRole('button', { name: 'Individual', exact: false }).click();
  await expect(page.getByLabel('Año del resumen')).toHaveValue(String(year + 1));
  await expect(page.getByRole('heading', { name: `Antonio ${year + 1}.`, exact: true })).toBeVisible();
  await panel.getByLabel('Año del resumen').fill(String(year - 2));
  await expect(panel.getByText('No hay movimientos todavía.', { exact: true })).toBeVisible();
});

test('los colores y el selector de año aparecen en el listado también en móvil', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const panel = page.getByRole('region', { name: 'Resumen por meses' });
  const yearInput = panel.getByLabel('Año del resumen');
  await expect(yearInput).toBeVisible();
  const title = await panel.getByRole('heading').boundingBox();
  const input = await yearInput.boundingBox();
  expect(input!.x).toBeGreaterThan(title!.x + title!.width);
  const colors = await page.evaluate(() => {
    const getColor = (variable: string) => { const el = document.createElement('span'); el.style.color = `var(${variable})`; document.body.append(el); const color = getComputedStyle(el).color; el.remove(); return color; };
    return { income: getColor('--color-positive'), expense: getColor('--color-danger'), positiveBackground: getColor('--color-positive-soft'), negativeBackground: getColor('--color-danger-soft') };
  });
  await expect(panel.locator('td.income-amount').first()).toHaveCSS('color', colors.income);
  await page.getByRole('button', { name: /Individual/ }).click();
  await expect(panel.locator('tbody tr').first().getByRole('cell').last()).toHaveClass('income-amount');
  await expect(panel.locator('tbody tr').first().getByRole('cell').last()).toHaveCSS('color', colors.income);
  await expect(page.locator('.stat-card.net')).toHaveCSS('background-color', colors.positiveBackground);
  await expect(page.locator('.stat-card.net .stat-label')).toHaveCSS('color', colors.income);
  await page.locator('.scope-switch').getByRole('button', { name: /Hogar/ }).click();
  await expect(panel.locator('td.expense-amount').first()).toHaveCSS('color', colors.expense);
  await expect(panel.locator('td.negative-amount').first()).toHaveCSS('color', colors.expense);
  await expect(page.locator('.stat-value.negative-amount')).toHaveCSS('color', colors.expense);
  await expect(page.locator('.stat-card.net')).toHaveCSS('background-color', colors.negativeBackground);
  await expect(page.locator('.stat-card.net .stat-label')).toHaveCSS('color', colors.expense);
  await yearInput.fill('2020');
  await expect(page.locator('.stat-card.net .stat-value')).toHaveText('0,00 €');
  await expect(page.locator('.stat-card.net')).toHaveCSS('background-color', colors.negativeBackground);
});

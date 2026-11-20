import { test, expect, Locator } from '@playwright/test';

async function expectChartToFit(chart: Locator): Promise<void> {
  await expect.poll(() => chart.locator('.line-chart-container').evaluate(container => {
    const bounds = container.getBoundingClientRect();
    const labels = Array.from(container.querySelectorAll('.month-label'));
    return container.scrollWidth <= container.clientWidth + 1 && labels.length === 12 && Array.from(container.querySelectorAll('text')).every(label => {
      const rect = label.getBoundingClientRect();
      return rect.left >= bounds.left - 1 && rect.right <= bounds.right + 1
        && rect.bottom <= bounds.bottom + 1 && parseFloat(getComputedStyle(label).fontSize) >= 12;
    });
  })).toBe(true);
}

async function expectMonthAmount(chart: Locator, month: number, amount: string): Promise<void> {
  await chart.locator('.chart-point').nth(month).click();
  const popup = chart.getByRole('dialog', { name: 'Importe mensual', exact: true });
  await expect(popup.locator('.popup-amount')).toHaveText(amount);
  expect(await popup.evaluate(el => {
    const rect = el.getBoundingClientRect();
    const chart = el.closest('.line-chart-container')!.getBoundingClientRect();
    return rect.left >= chart.left && rect.right <= chart.right + 1;
  })).toBe(true);
  await popup.getByRole('button', { name: 'Cerrar importe mensual', exact: true }).click();
  await expect(popup).toHaveCount(0);
  await expect(chart.locator('.chart-point').nth(month)).toBeFocused();
}

for (const width of [1440, 1024, 768, 390, 320]) {
  test(`el gráfico de líneas anual muestra meses, categorías y subcategorías (${width}px)`, async ({ page }) => {
    const year = new Date().getFullYear() - 1;
    await page.setViewportSize({ width, height: 900 });
    await page.evaluate(year => {
      const data = JSON.parse(localStorage.getItem('hucha-demo-v1')!);
      const base = data.movements.find((item: { id: string }) => item.id === '2');
      data.movements = [
        { ...base, id: 'rent-jan', categoryId: 'home', subcategoryId: 'home-sub-1', date: `${year}-01-01`, amountCents: 10000 },
        { ...base, id: 'light-jan', categoryId: 'home', subcategoryId: 'home-sub-2', date: `${year}-01-02`, amountCents: 2000 },
        { ...base, id: 'none-mar', categoryId: 'home', subcategoryId: '', date: `${year}-03-01`, amountCents: 500 },
        { ...base, id: 'rent-dec', categoryId: 'home', subcategoryId: 'home-sub-1', date: `${year}-12-31`, amountCents: 20000 },
        { ...base, id: 'food-jan', categoryId: 'food', subcategoryId: 'food-sub-0', date: `${year}-01-01`, amountCents: 4000 },
        { ...base, id: 'other-year', date: `${year - 1}-01-01`, amountCents: 999999 },
        { ...base, id: 'pending', date: `${year}-01-01`, amountCents: 999999, status: 'pending' },
        { ...base, id: 'income', type: 'income', categoryId: 'other-income', subcategoryId: '', date: `${year}-01-01`, amountCents: 30000 }
      ];
      localStorage.setItem('hucha-demo-v1', JSON.stringify(data));
    }, year);
    await page.reload();
    await page.getByRole('button', { name: /Explorar la demostra/ }).click();
    await page.getByLabel('Año del resumen').fill(String(year));
    await page.getByRole('button', { name: 'Gráfico de líneas', exact: true }).click();
    const chart = page.locator('app-monthly-lines');
    const home = page.locator('.category-row').filter({ hasText: 'Hogar' });
    const supermarket = page.locator('.category-row').filter({ hasText: 'Supermercado' });
    const children = page.getByRole('group', { name: 'Subcategorías de Hogar', exact: true });
    await expect(chart).toHaveCount(0);
    await expect(home).toHaveAttribute('aria-expanded', 'false');
    await home.click();
    await expect(home).toHaveAttribute('aria-expanded', 'true');
    await expect(home.locator('..').locator('app-monthly-lines')).toHaveCount(1);
    await expect(children).toBeVisible();
    expect(await children.evaluate(el => !!(el.compareDocumentPosition(document.querySelector('app-monthly-lines')!) & Node.DOCUMENT_POSITION_FOLLOWING))).toBe(true);
    await expect(chart.locator('polyline')).toHaveCount(1);
    await expect(chart.locator('.line-legend')).toHaveText('Hogar (total)');
    await expectChartToFit(chart);
    await expect(chart.getByText('Ver datos mensuales', { exact: true })).toHaveCount(0);
    await expect(chart.locator('table')).toHaveCount(0);
    await expect(chart.locator('.chart-point')).toHaveCount(12);
    await expectMonthAmount(chart, 0, '120,00 €');
    await expectMonthAmount(chart, 1, '0,00 €');
    await expectMonthAmount(chart, 11, '200,00 €');
    const firstPoint = chart.locator('.chart-point').first();
    const popup = chart.getByRole('dialog', { name: 'Importe mensual', exact: true });
    await firstPoint.focus();
    await firstPoint.press('Enter');
    await expect(popup).toContainText(`enero ${year}`);
    await expect(popup.locator('.popup-category')).toHaveText('Hogar');
    await popup.getByRole('button').press('Escape');
    await expect(popup).toHaveCount(0);
    await expect(firstPoint).toBeFocused();
    await firstPoint.press('Space');
    await expect(popup.locator('.popup-amount')).toHaveText('120,00 €');
    await children.getByRole('button', { name: /^Luz/ }).click();
    await expect(chart.locator('polyline')).toHaveCount(1);
    await expect(popup).toHaveCount(0);
    await expect(chart.locator('.line-legend')).toHaveText('Luz');
    await expectMonthAmount(chart, 0, '20,00 €');
    await children.getByRole('button', { name: /^Luz/ }).click();
    await expect(chart.locator('.line-legend')).toHaveText('Hogar (total)');
    await children.getByRole('button', { name: /^Sin subcategoría/ }).click();
    await expect(chart.locator('.line-legend')).toHaveText('Sin subcategoría');
    await expectMonthAmount(chart, 2, '5,00 €');
    await supermarket.click();
    await expect(home).toHaveAttribute('aria-expanded', 'false');
    await expect(supermarket).toHaveAttribute('aria-expanded', 'true');
    await expect(children).toHaveCount(0);
    await expect(home.locator('..').locator('app-monthly-lines')).toHaveCount(0);
    await expect(supermarket.locator('..').locator('app-monthly-lines')).toHaveCount(1);
    await expect(chart.locator('.line-legend')).toHaveText('Supermercado (total)');
    await expect(page.getByRole('button', { name: 'Quitar filtro de subcategoría', exact: true })).toHaveCount(0);
    await supermarket.focus();
    await page.keyboard.press('Enter');
    await expect(supermarket).toHaveAttribute('aria-expanded', 'false');
    await expect(chart).toHaveCount(0);
    await home.click();
    await children.getByRole('button', { name: /^Luz/ }).click();
    await page.getByRole('button', { name: /Individual/ }).click();
    await expectMonthAmount(chart, 0, '10,00 €');
    await page.getByRole('button', { name: 'Ver ingresos', exact: true }).click();
    await expect(chart).toHaveCount(0);
    const income = page.locator('.category-row').filter({ hasText: 'Otros ingresos' });
    await expect(income).toHaveAttribute('aria-expanded', 'false');
    await income.click();
    await expect(income).toHaveAttribute('aria-expanded', 'true');
    await expect(chart.locator('.line-legend')).toHaveText('Otros ingresos (total)');
    await expectMonthAmount(chart, 0, '150,00 €');
    await chart.locator('.chart-point').first().click();
    await expect(popup).toBeVisible();
    await page.locator('.category-total').click();
    await expect(popup).toHaveCount(0);
    await expectChartToFit(chart);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `.runtime/annual-lines-${width}.png`, fullPage: true });
    await page.setViewportSize({ width: width < 768 ? 1024 : 390, height: 900 });
    await expectChartToFit(chart);
    await page.getByLabel('Año del resumen').fill(String(year - 2));
    await expect(chart).toHaveCount(0);
    await page.getByLabel('Año del resumen').fill(String(year));
    await expect(chart).toBeVisible();
    await page.getByRole('link', { name: 'enero', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Gráfico de líneas', exact: true })).toHaveCount(0);
    await expect(chart).toHaveCount(0);
  });
}

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
  await expect(page.locator('.list-count')).toHaveText('6 movimientos en total');
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
  await expect(panel.locator('tbody tr').first().getByRole('cell').last()).toHaveCSS('color', colors.income);
  await expect(page.locator('.stat-card.net .stat-value')).toHaveCSS('color', colors.income);
  await expect(page.locator('.stat-card.net')).toHaveCSS('background-color', colors.positiveBackground);
  await expect(page.locator('.stat-card.net .stat-label')).toHaveCSS('color', colors.income);
  await yearInput.fill('2020');
  await expect(page.locator('.stat-card.net .stat-value')).toHaveText('0,00 €');
  await expect(page.locator('.stat-card.net')).toHaveCSS('background-color', colors.negativeBackground);
});

import { test, expect } from '@playwright/test';
for (const width of [1440, 390]) {
  test(`alinea icono y nombre de cada categoría (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.route('**/firebase-config.test.json', route => route.fulfill({ json: { apiKey: '', authDomain: '', projectId: '', appId: '' } }));
    await page.goto('/configuracion/categorias');
    await page.getByRole('button', { name: /Explorar la demostra/ }).click();
    await expect(page.getByRole('link', { name: 'Hogar', exact: true })).toBeVisible();
    const alignment = await page.locator('.category-family').evaluateAll(rows => rows.map(row => {
      const icon = row.querySelector('.category-symbol')!.getBoundingClientRect();
      const name = row.querySelector('.category-name')!.getBoundingClientRect();
      return { gap: name.left - icon.right, offset: Math.abs(icon.y + icon.height / 2 - name.y - name.height / 2) };
    }));
    expect(alignment.length).toBeGreaterThan(0);
    for (const row of alignment) { expect(row.gap).toBeGreaterThan(0); expect(row.offset).toBeLessThan(1); }
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

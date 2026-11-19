import { test, expect, Page } from '@playwright/test';
import { clickSecondary, openSecondaryMenu, openSettings } from './secondary-menu';

test.beforeEach(async ({ page }) => {
  await page.route('**/firebase-config.test.json', route => route.fulfill({ json: { apiKey: '', authDomain: '', projectId: '', appId: '' } }));
  await page.goto('/');
  await page.getByRole('button', { name: /Explorar la demostra/ }).click();
  await expect(page.getByRole('heading', { name: 'Movimientos del mes', exact: true })).toBeVisible();
});

async function openCar(page: Page) {
  await openSettings(page);
  await clickSecondary(page, page.getByRole('group', { name: 'Opciones de configuración' }).getByRole('link', { name: 'Categorías', exact: true }));
  await page.getByRole('link', { name: 'Coche', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Coche.', exact: true })).toBeVisible();
}
async function editCar(page: Page) {
  await clickSecondary(page, page.getByRole('group', { name: 'Acciones de la categoría' }).getByRole('button', { name: 'Editar', exact: true }));
  return page.getByRole('dialog', { name: 'Editar categoría', exact: true });
}
async function navigate(page: Page, name: string) {
  await openSecondaryMenu(page);
  const menu = page.getByRole('dialog', { name: 'Menú', exact: true });
  await (await menu.isVisible() ? menu : page.getByRole('navigation', { name: 'Navegación principal', exact: true })).getByRole('link', { name, exact: true }).click();
}

for (const width of [390, 1440]) {
  test(`configura el valor por defecto y propone nombres respetando los escritos y el historial (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await openCar(page);
    let dialog = await editCar(page);
    await dialog.getByRole('combobox', { name: 'Subcategoría por defecto', exact: true }).selectOption('car-sub-0');
    await dialog.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.locator('.category-default')).toContainText('Gasolina');
    await page.reload();
    await page.getByRole('button', { name: /Explorar la demostra/ }).click();
    await expect(page.locator('.category-default')).toContainText('Gasolina');
    await navigate(page, 'Resumen');
    await page.getByRole('button', { name: 'Añadir movimiento', exact: true }).click();
    dialog = page.getByRole('dialog', { name: 'Añadir movimiento', exact: true });
    const category = dialog.getByRole('combobox', { name: 'Categoría', exact: true });
    const subcategory = dialog.getByRole('combobox', { name: 'Subcategoría', exact: true });
    const name = dialog.getByLabel('Nombre', { exact: true });
    await category.selectOption('car');
    await expect(subcategory).toHaveValue('car-sub-0');
    await expect(name).toHaveValue('Gasolina');
    await subcategory.selectOption('car-sub-1');
    await expect(name).toHaveValue('Mecánico');
    await name.fill('Revisión del coche');
    await subcategory.selectOption('car-sub-0');
    await expect(name).toHaveValue('Revisión del coche');
    await category.selectOption('home');
    await expect(subcategory).toHaveValue('');
    await expect(name).toHaveValue('Revisión del coche');
    await category.selectOption('car');
    await expect(subcategory).toHaveValue('car-sub-0');
    await expect(name).toHaveValue('Revisión del coche');
    await dialog.getByLabel('Importe (€)', { exact: true }).fill('20');
    await page.screenshot({ path: `.runtime/category-defaults-${width}.png`, fullPage: true });
    await dialog.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await page.getByRole('link', { name: 'Revisión del coche', exact: true }).click();
    await clickSecondary(page, page.getByRole('button', { name: 'Editar', exact: true }));
    dialog = page.getByRole('dialog', { name: 'Editar movimiento', exact: true });
    await expect(dialog.getByLabel('Nombre', { exact: true })).toHaveValue('Revisión del coche');
    await expect(dialog.getByRole('combobox', { name: 'Subcategoría', exact: true })).toHaveValue('car-sub-0');
    await dialog.getByRole('combobox', { name: 'Subcategoría', exact: true }).selectOption('car-sub-1');
    await expect(dialog.getByLabel('Nombre', { exact: true })).toHaveValue('Revisión del coche');
    await dialog.getByRole('button', { name: 'Guardar', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await navigate(page, 'Resumen');
    await page.getByRole('button', { name: 'Añadir movimiento', exact: true }).click();
    dialog = page.getByRole('dialog', { name: 'Añadir movimiento', exact: true });
    await dialog.getByRole('combobox', { name: 'Categoría', exact: true }).selectOption('car');
    await expect(dialog.getByLabel('Nombre', { exact: true })).toHaveValue('Gasolina');
    await dialog.getByRole('tab', { name: 'Ingreso', exact: true }).click();
    await expect(dialog.getByLabel('Nombre', { exact: true })).toHaveValue('');
    await dialog.getByRole('tab', { name: 'Gasto', exact: true }).click();
    await dialog.getByRole('combobox', { name: 'Categoría', exact: true }).selectOption('car');
    await dialog.getByLabel('Nombre', { exact: true }).fill('Gasolina');
    await dialog.getByRole('combobox', { name: 'Subcategoría', exact: true }).selectOption('car-sub-1');
    await expect(dialog.getByLabel('Nombre', { exact: true })).toHaveValue('Gasolina');
    await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test('aplica los valores en nuevos recurrentes y limpia el predeterminado al eliminar la subcategoría', async ({ page }) => {
  await openCar(page);
  let dialog = await editCar(page);
  await dialog.getByRole('combobox', { name: 'Subcategoría por defecto', exact: true }).selectOption('car-sub-0');
  await dialog.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await navigate(page, 'Recurrentes');
  await page.getByRole('button', { name: 'Añadir recurrente' }).click();
  dialog = page.getByRole('dialog', { name: 'Añadir movimiento recurrente', exact: true });
  await dialog.getByRole('combobox', { name: 'Categoría', exact: true }).selectOption('car');
  await expect(dialog.getByRole('combobox', { name: 'Subcategoría', exact: true })).toHaveValue('car-sub-0');
  await expect(dialog.getByLabel('Nombre', { exact: true })).toHaveValue('Gasolina');
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await openCar(page);
  dialog = await editCar(page);
  await dialog.getByRole('combobox', { name: 'Subcategoría por defecto', exact: true }).selectOption('car-sub-1');
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
  await expect(page.locator('.category-default')).toContainText('Gasolina');
  dialog = await editCar(page);
  await dialog.locator('.edit-subcategory').first().getByRole('button', { name: 'Eliminar', exact: true }).click();
  await expect(dialog.getByRole('combobox', { name: 'Subcategoría por defecto', exact: true })).toHaveValue('');
  await dialog.getByRole('button', { name: 'Guardar', exact: true }).click();
  await expect(dialog).not.toBeVisible();
  await expect(page.locator('.category-default')).toContainText('Ninguna');
  await navigate(page, 'Resumen');
  await page.getByRole('button', { name: 'Añadir movimiento', exact: true }).click();
  dialog = page.getByRole('dialog', { name: 'Añadir movimiento', exact: true });
  await dialog.getByRole('combobox', { name: 'Categoría', exact: true }).selectOption('car');
  await expect(dialog.getByRole('combobox', { name: 'Subcategoría', exact: true })).toHaveValue('');
  await expect(dialog.getByLabel('Nombre', { exact: true })).toHaveValue('');
  await dialog.getByRole('button', { name: 'Cancelar', exact: true }).click();
});

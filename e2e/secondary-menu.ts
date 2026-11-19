import { Page, Locator } from '@playwright/test';
export async function openSecondaryMenu(page: Page): Promise<void> {
  const button = page.getByRole('button', { name: 'Abrir menú', exact: true });
  if (await button.isVisible() && !await page.getByRole('dialog', { name: 'Menú', exact: true }).isVisible()) await button.click();
}
export async function clickSecondary(page: Page, locator: Locator): Promise<void> { await openSecondaryMenu(page); await locator.click(); }
export async function openSettings(page: Page): Promise<void> {
  const button = page.getByRole('button', { name: 'Abrir menú', exact: true });
  if (await button.isVisible()) {
    await openSecondaryMenu(page);
    await page.getByRole('dialog', { name: 'Menú', exact: true }).getByRole('link', { name: 'Configuración', exact: true }).click();
  } else {
    await page.getByRole('navigation', { name: 'Navegación principal' }).getByRole('link', { name: 'Configuración', exact: true }).click();
  }
}

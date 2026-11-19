import { test, expect } from '@playwright/test';

for (const width of [320, 390, 700, 820, 1024]) {
  test(`menú a pantalla completa con perfil abajo y fondo inmóvil (${width}px)`, async ({ page }) => {
    await page.setViewportSize({ width, height: 740 });
    await page.route('**/firebase-config.test.json', route => route.fulfill({ json: { apiKey: '', authDomain: '', projectId: '', appId: '' } }));
    await page.goto('/');
    await page.getByRole('button', { name: /Explorar la demostra/ }).click();
    await expect(page.getByRole('link', { name: 'Nuestro alquiler', exact: true })).toBeVisible();
    const primary = page.getByRole('navigation', { name: 'Navegación principal', exact: true });
    await expect(primary.getByRole('link')).toHaveText(['▦Resumen anual', '⇌Liquidaciones']);
    await expect(page.locator('.topbar-account')).not.toBeVisible();
    const bar = await page.locator('.sidebar').boundingBox();
    expect(bar!.y + bar!.height).toBe(740);
    await primary.getByRole('link', { name: 'Liquidaciones', exact: true }).click();
    await expect(page.getByRole('navigation', { name: 'Ruta de navegación' })).toHaveText('Liquidaciones');
    await primary.getByRole('link', { name: 'Resumen', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Movimientos del mes', exact: true })).toBeVisible();
    // Esperar a la restauración de scroll del router tras volver al resumen.
    await page.evaluate(() => new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))));
    const hamburger = page.getByRole('button', { name: 'Abrir menú', exact: true });
    const menu = page.getByRole('dialog', { name: 'Menú', exact: true });
    const hamburgerBox = await hamburger.boundingBox();
    const brandBox = await page.locator('.main-shell .topbar > .compact-brand').boundingBox();

    // Abrir con desplazamiento real sin que Playwright lleve el botón a la vista.
    await page.evaluate(() => window.scrollTo(0, 180));
    const before = await page.evaluate(() => window.scrollY);
    expect(before).toBeGreaterThan(0);
    const structure = await page.locator('main').boundingBox();
    const bottomBar = await page.locator('.sidebar').boundingBox();
    const fab = await page.getByRole('button', { name: 'Añadir movimiento', exact: true }).boundingBox();
    await hamburger.evaluate((button: HTMLButtonElement) => button.click());
    await expect(menu).toBeVisible();
    await expect(hamburger).toHaveAttribute('aria-expanded', 'true');
    const box = await menu.boundingBox();
    expect(box).toEqual({ x: 0, y: 0, width, height: 740 });
    const closeBox = await menu.getByRole('button', { name: 'Cerrar menú', exact: true }).boundingBox();
    expect(closeBox!.x + closeBox!.width / 2).toBe(hamburgerBox!.x + hamburgerBox!.width / 2);
    expect(closeBox!.y + closeBox!.height / 2).toBe(hamburgerBox!.y + hamburgerBox!.height / 2);
    await expect(menu.getByRole('link', { name: 'Hucha, inicio', exact: true }).locator('img')).toHaveAttribute('src', '/favicon.svg');
    expect(await menu.locator('.compact-brand').boundingBox()).toEqual(brandBox);
    const account = await menu.locator('.secondary-menu-footer').boundingBox();
    expect(account!.y).toBeGreaterThan(740 / 2);
    expect(account!.y + account!.height).toBe(740);
    await expect(menu.getByRole('navigation', { name: 'Navegación del menú' }).getByRole('link')).toHaveText(['◫Resumen', '▦Resumen anual', '⇌Liquidaciones', '⚙Configuración']);
    expect(await page.locator('main').boundingBox()).toEqual(structure);
    expect(await page.locator('.sidebar').boundingBox()).toEqual(bottomBar);
    expect(await page.locator('.add-movement-fab').boundingBox()).toEqual(fab);
    expect(await page.evaluate(() => window.scrollY)).toBe(before);
    await expect(menu.getByRole('link', { name: 'Mi perfil: Antonio', exact: true })).toBeVisible();
    await expect(menu.locator('.menu-sync')).toHaveText('Demostración local');
    await expect(menu.getByRole('link', { name: 'Configuración', exact: true })).toBeVisible();
    await page.mouse.move(5, 500);
    await page.mouse.wheel(0, 500);
    // Una segunda acción del navegador permite procesar el intento de scroll.
    await expect(menu).toBeVisible();
    expect(await page.evaluate(() => window.scrollY)).toBe(before);
    await menu.getByRole('button', { name: 'Cerrar menú', exact: true }).click();
    await expect(menu).not.toBeVisible();
    expect(await page.evaluate(() => window.scrollY)).toBe(before);
    expect(await page.locator('main').boundingBox()).toEqual(structure);
    await expect(hamburger).toBeFocused();

    if (width === 390 || width === 820) {
      await hamburger.click();
      await page.screenshot({ path: `.runtime/fullscreen-menu-${width}.png` });
      await menu.getByRole('button', { name: 'Cerrar menú', exact: true }).click();
    }

    await hamburger.click();
    await menu.getByRole('link', { name: 'Liquidaciones', exact: true }).click();
    await expect(menu).not.toBeVisible();
    await expect(page).toHaveURL(/\/liquidaciones$/);
    await hamburger.click();
    await menu.getByRole('link', { name: 'Resumen', exact: true }).click();
    await expect(menu).not.toBeVisible();
    await expect(page.getByRole('heading', { name: 'Movimientos del mes', exact: true })).toBeVisible();

    await page.getByRole('link', { name: 'Nuestro alquiler', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Editar', exact: true })).toHaveCount(0);
    await hamburger.click();
    await menu.getByRole('button', { name: 'Editar', exact: true }).click();
    await expect(menu).not.toBeVisible();
    await expect(page.getByRole('dialog', { name: 'Editar movimiento', exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Cancelar', exact: true }).click();
    await hamburger.click();
    await page.keyboard.press('Escape');
    await expect(menu).not.toBeVisible();
    await hamburger.click();
    await menu.getByRole('link', { name: 'Configuración', exact: true }).click();
    await expect(menu).not.toBeVisible();
    await hamburger.click();
    await menu.getByRole('link', { name: 'Perfil', exact: true }).click();
    await expect(menu).not.toBeVisible();
    await hamburger.click();
    await expect(menu.getByRole('button', { name: 'Cerrar sesión', exact: true })).toBeVisible();
    await page.setViewportSize({ width: 1440, height: 900 });
    await expect(menu).not.toBeVisible();
    await expect(hamburger).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Cerrar sesión', exact: true })).toBeVisible();
    await expect(primary.getByRole('link')).toHaveText(['◫Resumen', '▦Resumen anual', '⇌Liquidaciones', '⚙Configuración']);
    await expect(page.locator('.topbar-account')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('');
  });
}

test('menú en horizontal permite recorrer sus opciones sin desplazar el fondo', async ({ page }) => {
  await page.setViewportSize({ width: 820, height: 390 });
  await page.goto('/configuracion/perfil');
  await page.getByRole('button', { name: /Explorar la demostra/ }).click();
  await page.getByRole('button', { name: 'Abrir menú', exact: true }).click();
  const menu = page.getByRole('dialog', { name: 'Menú', exact: true });
  const box = await menu.boundingBox();
  expect(box!.y + box!.height).toBeLessThanOrEqual(390);
  await expect(menu.getByRole('link', { name: 'Mi perfil: Antonio', exact: true })).toBeInViewport();
  expect(await menu.locator('.secondary-menu-content').evaluate(el => el.scrollHeight > el.clientHeight)).toBe(true);
  const before = await page.evaluate(() => window.scrollY);
  for (let i = 0; i < 10; i++) {
    await page.keyboard.press('Tab');
    await expect(page.locator('.app-layout :focus')).toHaveCount(0);
  }
  await menu.getByRole('button', { name: 'Cerrar sesión', exact: true }).scrollIntoViewIfNeeded();
  await expect(menu.getByRole('button', { name: 'Cerrar sesión', exact: true })).toBeInViewport();
  expect(await page.evaluate(() => window.scrollY)).toBe(before);
  await menu.getByRole('button', { name: 'Cerrar sesión', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Iniciar sesión' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.style.overflow)).toBe('');
});

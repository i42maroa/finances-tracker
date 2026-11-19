import { inject } from '@angular/core';
import { CanActivateFn, Router, Routes } from '@angular/router';
import { ViewService } from './services/view.service';
import { localDate } from './services/finance';

const summaryEntry: CanActivateFn = route => {
  const year = Number(route.queryParamMap.get('year'));
  if (Number.isInteger(year) && year >= 1000 && year <= 9999) return true;
  return inject(Router).createUrlTree(['/resumen', localDate().slice(0, 7)], { queryParams: route.queryParams });
};

export const routes: Routes = [
  { path: '', pathMatch: 'full', canActivate: [summaryEntry], runGuardsAndResolvers: 'paramsOrQueryParamsChange', providers: [ViewService], loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.DashboardComponent), title: 'Resumen · Hucha' },
  { path: 'resumen/:month', providers: [ViewService], data: { monthly: true }, loadComponent: () => import('./pages/dashboard/dashboard').then(m => m.DashboardComponent), title: 'Detalle del mes · Hucha' },
  { path: 'movimientos', pathMatch: 'full', redirectTo: '' },
  { path: 'movimientos/:id', providers: [ViewService], loadComponent: () => import('./pages/movement-detail/movement-detail').then(m => m.MovementDetailComponent), title: 'Detalle del movimiento · Hucha' },
  { path: 'liquidaciones', loadComponent: () => import('./pages/settlements/settlements').then(m => m.SettlementsComponent), title: 'Liquidaciones · Hucha' },
  { path: 'perfil', pathMatch: 'full', redirectTo: 'configuracion/perfil' },
  { path: 'configuracion', pathMatch: 'full', loadComponent: () => import('./pages/settings/settings').then(m => m.SettingsComponent), title: 'Configuración · Hucha' },
  { path: 'configuracion/perfil', loadComponent: () => import('./pages/profile/profile').then(m => m.ProfileComponent), title: 'Mi perfil · Hucha' },
  { path: 'configuracion/pareja', loadComponent: () => import('./pages/couple/couple').then(m => m.CoupleComponent), title: 'Nuestra pareja · Hucha' },
  { path: 'configuracion/categorias', pathMatch: 'full', loadComponent: () => import('./pages/categories/categories').then(m => m.CategoriesComponent), title: 'Categorías · Hucha' },
  { path: 'configuracion/categorias/:id', loadComponent: () => import('./pages/category-detail/category-detail').then(m => m.CategoryDetailComponent), title: 'Detalle de categoría · Hucha' },
  { path: 'perfil/categorias', redirectTo: 'configuracion/categorias', pathMatch: 'full' },
  { path: 'categorias', redirectTo: 'configuracion/categorias', pathMatch: 'full' },
  { path: 'pareja', redirectTo: 'configuracion/pareja', pathMatch: 'full' },
  { path: '**', redirectTo: '' }
];

import { Injectable, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map } from 'rxjs';
import { StoreService } from './store.service';
import { isConfirmed } from './recurring';

@Injectable({ providedIn: 'root' })
export class NavigationService {
  private router = inject(Router);
  private store = inject(StoreService);
  private readonly url = toSignal(this.router.events.pipe(
    filter((event): event is NavigationEnd => event instanceof NavigationEnd),
    map(event => event.urlAfterRedirects)
  ), { initialValue: this.router.url });
  readonly path = computed(() => this.url().split(/[?#]/)[0]);
  readonly inMonthlySummary = computed(() => /^\/resumen\/\d{4}-\d{2}$/.test(this.path()));
  readonly inPlanned = computed(() => /^\/resumen\/\d{4}-\d{2}\/previstos$/.test(this.path()));
  readonly inMonth = computed(() => this.inMonthlySummary() || this.inPlanned());
  readonly selectedMonth = computed(() => this.inMonth() ? this.path().slice(9, 16) : '');
  readonly monthContext = signal<{ month: string; queryParams: Record<string, string | number | boolean> }>({ month: '', queryParams: {} });
  readonly inAnnualSummary = computed(() => this.path() === '/');
  readonly summaryYear = computed(() => {
    if (this.inMonth()) return Number(this.path().slice(9, 13));
    const year = Number(this.router.parseUrl(this.url()).queryParams['year']);
    return this.inAnnualSummary() && Number.isInteger(year) && year >= 1000 && year <= 9999 ? year : new Date().getFullYear();
  });
  readonly canAddMovement = computed(() => this.path() === '/' || /^\/resumen\/\d{4}-\d{2}$/.test(this.path()));
  readonly inProfile = computed(() => this.path() === '/configuracion/perfil');
  readonly inSettings = computed(() => this.path() === '/configuracion' || this.path().startsWith('/configuracion/'));
  readonly category = computed(() => {
    this.path();
    let route = this.router.routerState.snapshot.root;
    while (route.firstChild) route = route.firstChild;
    const id = route.routeConfig?.path === 'configuracion/categorias/:id' ? route.paramMap.get('id') : null;
    return this.store.categories().find(item => item.id === id && !item.archived);
  });
  readonly movementId = computed(() => {
    this.path();
    let route = this.router.routerState.snapshot.root;
    while (route.firstChild) route = route.firstChild;
    return route.routeConfig?.path === 'movimientos/:id' ? route.paramMap.get('id') : null;
  });
  readonly movement = computed(() => this.store.movements().find(item => item.id === this.movementId() && isConfirmed(item)));
}

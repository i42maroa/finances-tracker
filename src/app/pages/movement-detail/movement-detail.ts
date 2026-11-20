import { Component, computed, effect, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationService } from '../../services/navigation.service';
import { ViewService } from '../../services/view.service';
import { share } from '../../services/finance';
import { BreadcrumbComponent, BreadcrumbItem } from '../../shared/breadcrumb/breadcrumb';

@Component({ selector: 'app-movement-detail', imports: [BreadcrumbComponent], templateUrl: './movement-detail.html', styleUrl: './movement-detail.css' })
export class MovementDetailComponent {
  navigation = inject(NavigationService);
  view = inject(ViewService);
  private router = inject(Router);
  movement = this.navigation.movement;
  private route = inject(ActivatedRoute);
  private query = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  readonly origin = computed(() => {
    const query = this.query(), requestedYear = Number(query.get('year'));
    const year = ['summary', 'planned'].includes(query.get('from') || '') && Number.isInteger(requestedYear) && requestedYear >= 1000 && requestedYear <= 9999 ? requestedYear : Number(this.movement()?.date.slice(0, 4) || new Date().getFullYear());
    const rawMonth = query.get('month') || '';
    const month = new RegExp(`^${year}-(0[1-9]|1[0-2])$`).test(rawMonth) ? rawMonth : null;
    return { year, month, planned: query.get('from') === 'planned', filters: { breakdown: query.get('breakdown') || 'expense', chart: query.get('chart') || 'bars', scope: query.get('scope') === 'personal' ? 'personal' : 'shared', type: query.get('type') === 'income' || query.get('type') === 'expense' ? query.get('type')! : 'all', listCategory: query.get('listCategory') || '', listSubcategory: query.get('listSubcategory') || '', name: query.get('name') || '', minCents: query.get('minCents') || '', maxCents: query.get('maxCents') || '', createdBy: query.get('createdBy') || '', sort: query.get('sort') || 'date-desc', recurringExpenses: query.get('recurringExpenses') || '' } };
  });
  readonly breadcrumbs = computed<BreadcrumbItem[]>(() => {
    const origin = this.origin();
    const items: BreadcrumbItem[] = [
      { label: 'Resumen', link: '/', queryParams: { year: new Date().getFullYear() } },
      { label: String(origin.year), link: '/', queryParams: { year: origin.year, ...origin.filters } }
    ];
    if (origin?.month) items.push({ label: new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(new Date(`${origin.month}-01T12:00:00`)), link: `/resumen/${origin.month}`, queryParams: origin.filters });
    if (origin.planned && origin.month) items.push({ label: 'Gastos previstos', link: `/resumen/${origin.month}/previstos`, queryParams: origin.filters });
    items.push({ label: this.movement()?.concept || 'Movimiento no disponible' });
    return items;
  });
  category = computed(() => this.view.store.categories().find(item => item.id === this.movement()?.categoryId));
  constructor() {
    let wasAvailable = false;
    let target: { link: string; queryParams: Record<string, string | number | boolean> } = { link: '/', queryParams: {} };
    effect(() => {
      if (this.movement()) {
        wasAvailable = true;
        const origin = this.origin();
        target = { link: origin.month ? `/resumen/${origin.month}${origin.planned ? '/previstos' : ''}` : '/', queryParams: { year: origin.year, ...origin.filters } };
      } else if (wasAvailable && !this.view.store.loading()) void this.router.navigate([target.link], { queryParams: target.queryParams });
    });
  }
  portion(uid: string): number { return share(this.movement()!.amountCents, this.view.store.couple()!.memberIds, uid); }
  fullDate(date: string): string { return new Intl.DateTimeFormat('es-ES', { dateStyle: 'long' }).format(new Date(`${date}T12:00:00`)); }
}

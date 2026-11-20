import { Component, computed, effect, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { toSignal } from '@angular/core/rxjs-interop';
import { Movement, MovementType } from '../../models/models';
import { ModalService } from '../../services/modal.service';
import { NavigationService } from '../../services/navigation.service';
import { PlannedService } from '../../services/planned.service';
import { RecurringService } from '../../services/recurring.service';
import { ViewService } from '../../services/view.service';
import { errorMessage } from '../../services/errors';
import { isConfirmed, scheduleForOccurrence } from '../../services/recurring';
import { BreadcrumbComponent, BreadcrumbItem } from '../../shared/breadcrumb/breadcrumb';
import { FiltersComponent } from '../../shared/filters/filters';

@Component({ selector: 'app-planned', imports: [RouterLink, ReactiveFormsModule, BreadcrumbComponent, FiltersComponent], templateUrl: './planned.html', styleUrl: './planned.css' })
export class PlannedComponent {
  view = inject(ViewService);
  modal = inject(ModalService);
  planned = inject(PlannedService);
  private recurring = inject(RecurringService);
  private navigation = inject(NavigationService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private params = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });
  private query = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  month = computed(() => this.params().get('month') || '');
  validMonth = computed(() => /^\d{4}-(0[1-9]|1[0-2])$/.test(this.month()));
  monthTitle = computed(() => this.validMonth() ? new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(new Date(`${this.month()}-01T12:00:00`)) : 'Mes no válido');
  returnQuery = computed(() => {
    const query = this.query();
    const filters: Record<string, string | number | boolean> = {};
    for (const key of query.keys) filters[key] = query.get(key) || '';
    return { ...filters, scope: this.view.scope() };
  });
  breadcrumbs = computed<BreadcrumbItem[]>(() => {
    if (!this.validMonth()) return [{ label: 'Resumen', link: '/' }, { label: 'Gastos previstos' }];
    const year = this.month().slice(0, 4), filters = this.returnQuery();
    return [
      { label: 'Resumen', link: '/', queryParams: { year: new Date().getFullYear() } },
      { label: year, link: '/', queryParams: { ...filters, year } },
      { label: new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(new Date(`${this.month()}-01T12:00:00`)), link: `/resumen/${this.month()}`, queryParams: filters },
      { label: 'Gastos previstos' }
    ];
  });
  typeControl = new FormControl<MovementType | 'all'>('all', { nonNullable: true });
  searchControl = new FormControl('', { nonNullable: true });
  private type = toSignal(this.typeControl.valueChanges, { initialValue: 'all' });
  private search = toSignal(this.searchControl.valueChanges, { initialValue: '' });
  rows = computed(() => {
    const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es').trim();
    return this.view.plannedMovements().filter(item => (this.type() === 'all' || item.type === this.type()) && normalize(item.concept).includes(normalize(this.search())));
  });
  dueCount = computed(() => this.view.pending().filter(item => item.date <= this.planned.today()).length);
  busy = signal('');
  error = signal('');
  confirmed = isConfirmed;
  needsAction(item: Movement): boolean { return !isConfirmed(item) && item.date <= this.planned.today(); }
  recurrence(item: Movement) { return this.view.store.recurringMovements().find(value => value.id === item.recurringId); }
  configuration(item: Movement) { const template = this.recurrence(item); return template ? scheduleForOccurrence(template, item.scheduledDate || item.date, item.scheduleIndex) || template : undefined; }
  fullDate(value: string): string { return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(new Date(`${value}T12:00:00`)); }
  movementOrigin() { return { ...this.returnQuery(), from: 'planned', year: Number(this.month().slice(0, 4)), month: this.month() }; }
  status(item: Movement): string {
    if (isConfirmed(item)) return item.type === 'income' ? 'Cobrado' : 'Pagado';
    if (item.date <= this.planned.today()) return item.type === 'income' ? 'Pendiente de cobro' : 'Pendiente de pago';
    return `${item.type === 'income' ? 'Ingreso previsto' : 'Gasto previsto'} · Programado`;
  }
  constructor() {
    this.view.scope.set(this.route.snapshot.queryParamMap.get('scope') === 'personal' ? 'personal' : 'shared');
    effect(() => { this.view.month.set(this.month()); this.view.scope.set(this.query().get('scope') === 'personal' ? 'personal' : 'shared'); });
    effect(() => { if (this.validMonth()) this.navigation.monthContext.set({ month: this.month(), queryParams: this.returnQuery() }); });
    effect(() => {
      const scope = this.view.scope();
      if (scope !== (this.query().get('scope') === 'personal' ? 'personal' : 'shared')) void this.router.navigate([], { relativeTo: this.route, queryParams: { scope }, queryParamsHandling: 'merge', replaceUrl: true });
    });
  }
  async skip(item: Movement): Promise<void> {
    if (this.busy()) return;
    this.busy.set(item.id); this.error.set('');
    try { await this.recurring.skip(item); } catch (error) { this.error.set(errorMessage(error)); } finally { this.busy.set(''); }
  }
}

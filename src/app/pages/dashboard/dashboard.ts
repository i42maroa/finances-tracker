import { Component, computed, effect, inject, signal, ElementRef, ViewChild, HostListener, untracked } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { toSignal } from '@angular/core/rxjs-interop';
import { MovementSort, MovementType } from '../../models/models';
import { NavigationService } from '../../services/navigation.service';
import { ViewService } from '../../services/view.service';
import { ModalService } from '../../services/modal.service';
import { FiltersComponent } from '../../shared/filters/filters';
import { MovementListComponent } from '../../shared/movement-list/movement-list';
import { FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { BreadcrumbComponent, BreadcrumbItem } from '../../shared/breadcrumb/breadcrumb';
import { MonthlyLinesComponent } from '../../shared/monthly-lines/monthly-lines';
import { monthlySeries } from '../../services/monthly-series';
@Component({ selector: 'app-dashboard', imports: [RouterLink, FiltersComponent, MovementListComponent, ReactiveFormsModule, BreadcrumbComponent, MonthlyLinesComponent], templateUrl: './dashboard.html', styleUrl: './dashboard.css' })
export class DashboardComponent {
  @ViewChild('sortMenu') sortMenu?: ElementRef<HTMLDetailsElement>;
  readonly sortOptions: { value: MovementSort; label: string }[] = [
    { value: 'date-desc', label: 'Fecha: más recientes primero' },
    { value: 'date-asc', label: 'Fecha: más antiguos primero' },
    { value: 'amount-desc', label: 'Importe: de mayor a menor' },
    { value: 'amount-asc', label: 'Importe: de menor a mayor' }
  ];
  setSort(sort: MovementSort): void {
    this.view.listSettings.update(value => ({ ...value, sort }));
    this.closeSort();
    this.sortMenu?.nativeElement.querySelector('summary')?.focus();
  }
  closeSort(): void { if (this.sortMenu) this.sortMenu.nativeElement.open = false; }
  @HostListener('document:click', ['$event'])
  closeSortOutside(event: MouseEvent): void { if (event.target instanceof Node && !this.sortMenu?.nativeElement.contains(event.target)) this.closeSort(); }
  view = inject(ViewService);
  modal = inject(ModalService);
  private navigation = inject(NavigationService);
  readonly pageSize = 10;
  readonly page = signal(1);
  readonly pageCount = computed(() => Math.max(1, Math.ceil(this.view.listMovements().length / this.pageSize)));
  readonly currentPage = computed(() => Math.min(this.page(), this.pageCount()));
  readonly pagedMovements = computed(() => this.view.listMovements().slice((this.currentPage() - 1) * this.pageSize, this.currentPage() * this.pageSize));
  readonly chartMode = signal<'bars' | 'pie' | 'lines'>('bars');
  readonly monthlyLines = computed(() => monthlySeries(
    this.view.filtered(), this.view.store.categories(), this.view.year(), this.view.breakdownType(),
    item => this.view.displayAmount(item), this.view.listCategory(), this.view.listSubcategory()
  ).filter(row => this.view.listSubcategory() ? row.detail : !row.detail));
  readonly chartColors = ['var(--color-primary)', 'var(--color-chart-2)', 'var(--color-chart-3)', 'var(--color-chart-4)', 'var(--color-positive)', 'var(--color-lilac-text)', 'var(--color-peach-text)'];
  readonly pieSlices = computed(() => {
    const total = this.view.breakdownTotal();
    let angle = -Math.PI / 2;
    return this.view.breakdown().map((row, index) => {
      const start = angle;
      angle += row.amount / total * Math.PI * 2;
      const middle = (start + angle) / 2;
      const point = (radians: number) => `${100 + 80 * Math.cos(radians)},${100 + 80 * Math.sin(radians)}`;
      return { ...row, color: this.chartColors[index % this.chartColors.length], path: `M100,100 L${point(start)} A80,80 0 0,1 ${point(middle)} A80,80 0 0,1 ${point(angle)} Z`, percent: this.percentage(row.amount) };
    });
  });
  readonly subcategoryBreakdown = computed(() => {
    const result = new Map<string, { id: string; name: string; amount: number }[]>();
    const movements = this.view.filtered().filter(item => item.type === this.view.breakdownType());
    for (const row of this.view.breakdown()) {
      const id = row.category?.id;
      if (!id) continue;
      const totals = new Map<string, number>();
      for (const item of movements.filter(item => item.categoryId === id)) {
        const key = item.subcategoryId || '__none__';
        totals.set(key, (totals.get(key) || 0) + this.view.displayAmount(item));
      }
      const children = this.view.store.categories().filter(child => child.parentId === id && totals.has(child.id)).map(child => ({ id: child.id, name: child.name, amount: totals.get(child.id) || 0 }));
      if (children.length && totals.has('__none__')) children.push({ id: '__none__', name: 'Sin subcategoría', amount: totals.get('__none__')! });
      result.set(id, children);
    }
    return result;
  });
  yearControl = new FormControl(this.view.year(), { nonNullable: true, validators: [Validators.required, Validators.min(1000), Validators.max(9999)] });
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  readonly monthly = !!this.route.snapshot.data['monthly'];
  private params = toSignal(this.route.paramMap, { initialValue: this.route.snapshot.paramMap });
  private queryParams = toSignal(this.route.queryParamMap, { initialValue: this.route.snapshot.queryParamMap });
  readonly selectedMonth = computed(() => this.params().get('month') || '');
  readonly validMonth = computed(() => /^\d{4}-(0[1-9]|1[0-2])$/.test(this.selectedMonth()));
  readonly monthTitle = computed(() => this.validMonth() ? new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(new Date(`${this.selectedMonth()}-01T12:00:00`)) : 'Mes no válido');
  readonly breadcrumbs = computed<BreadcrumbItem[]>(() => {
    const items: BreadcrumbItem[] = [{ label: 'Resumen', link: '/', queryParams: { year: new Date().getFullYear() } }];
    if (this.monthly && this.validMonth()) {
      const year = this.selectedMonth().slice(0, 4);
      items.push({ label: year, link: '/', queryParams: { year } });
      items.push({ label: new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(new Date(`${this.selectedMonth()}-01T12:00:00`)) });
    } else if (!this.monthly) items.push({ label: String(this.view.year()) });
    return items;
  });
  constructor() {
    effect(() => { if (this.monthly && this.validMonth()) this.navigation.monthContext.set({ month: this.selectedMonth(), queryParams: this.movementOrigin() }); });
    effect(() => { if (this.view.scope() === 'personal' && this.view.listSettings().createdBy) this.clearAuthorFilter(); });
    effect(() => this.modal.movementSpace.set(this.view.scope() === 'shared' ? 'shared' : 'individual'));
    effect(() => {
      this.view.year(); this.view.month(); this.view.scope(); this.view.uid(); this.view.listType(); this.view.listCategory(); this.view.listSubcategory(); this.view.listSearch(); this.view.listSettings();
      this.page.set(1);
    });
    this.yearControl.valueChanges.pipe(takeUntilDestroyed()).subscribe(year => {
      if (this.yearControl.valid && Number.isInteger(year)) this.view.year.set(year);
    });
    this.view.period.set(this.monthly ? 'month' : 'year');
    this.view.category.set('');
    if (this.monthly && this.validMonth()) this.view.month.set(this.selectedMonth());
    const query = this.route.snapshot.queryParamMap;
    if (this.monthly) {
      this.view.scope.set(query.get('scope') === 'personal' ? 'personal' : 'shared');
    }
    this.view.listCategory.set(query.get('listCategory') || '');
    this.view.listSubcategory.set(query.get('listSubcategory') || '');
    this.view.listSearch.set(query.get('name') || '');
    this.restoreListSettings(query);
    effect(() => { if (this.monthly && this.validMonth()) this.view.month.set(this.selectedMonth()); });
    effect(() => {
      const year = Number(this.queryParams().get('year'));
      if (!this.monthly && Number.isInteger(year) && year >= 1000 && year <= 9999) {
        this.view.year.set(year);
        this.yearControl.setValue(year, { emitEvent: false });
        const query = this.queryParams();
        if (query.has('scope')) {
          this.view.scope.set(query.get('scope') === 'personal' ? 'personal' : 'shared');
        }
        this.view.listCategory.set(query.get('listCategory') || '');
        this.view.listSubcategory.set(query.get('listSubcategory') || '');
        this.view.listSearch.set(query.get('name') || '');
        this.restoreListSettings(query);
      }
    });
  }
  monthFilters() { return { scope: this.view.scope(), type: this.view.listType() }; }
  movementOrigin() { return { from: 'summary', year: this.monthly ? Number(this.selectedMonth().slice(0, 4)) : this.view.year(), month: this.monthly ? this.selectedMonth() : '', ...this.monthFilters(), listCategory: this.view.listCategory(), listSubcategory: this.view.listSubcategory(), name: this.view.listSearch(), minCents: this.view.listSettings().minCents ?? '', maxCents: this.view.listSettings().maxCents ?? '', createdBy: this.view.listSettings().createdBy, sort: this.view.listSettings().sort, recurringExpenses: this.view.listSettings().recurringExpenses ? '1' : '' }; }
  categoryName() { return this.view.store.categories().find(item => item.id === this.view.listCategory())?.name || this.view.listCategory(); }
  selectSummaryType(type: MovementType | 'all'): void {
    this.view.listType.set(type);
    this.view.breakdownType.set(type === 'income' ? 'income' : 'expense');
    this.clearCategory();
  }
  toggleBreakdown(): void {
    const type = this.view.breakdownType() === 'expense' ? 'income' : 'expense';
    this.view.breakdownType.set(type);
    if (this.view.listType() !== 'all') this.view.listType.set(type);
    this.clearCategory();
  }
  percentage(amount: number): string { return new Intl.NumberFormat('es-ES', { style: 'percent', maximumFractionDigits: 1 }).format(amount / this.view.breakdownTotal()); }
  hasSubcategories(id: string | undefined): boolean { return !!this.subcategoryBreakdown().get(id || '')?.length; }
  selectCategory(id: string): void {
    this.view.listCategory.set(this.view.listCategory() === id ? '' : id);
    this.view.listSubcategory.set('');
  }
  clearCategory(): void { this.view.listCategory.set(''); this.view.listSubcategory.set(''); }
  subcategoryName(): string { return this.view.listSubcategory() === '__none__' ? 'Sin subcategoría' : this.view.store.categories().find(item => item.id === this.view.listSubcategory())?.name || this.view.listSubcategory(); }
  selectSubcategory(id: string): void {
    this.view.listSubcategory.set(this.view.listSubcategory() === id ? '' : id);
    if (this.monthly || this.chartMode() !== 'lines') document.getElementById('summary-movements')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block: 'start' });
  }
  restoreListSettings(query: { get(name: string): string | null }): void {
    const type = query.get('type');
    this.view.listType.set(type === 'income' || type === 'expense' ? type : 'all');
    this.view.breakdownType.set(type === 'income' || type === 'expense' ? type : untracked(() => this.view.store.categories().find(item => item.id === this.view.listCategory())?.type || 'expense'));
    const bound = (name: string) => { const raw = query.get(name); const value = Number(raw); return raw !== null && raw !== '' && Number.isInteger(value) && value >= 0 && value <= 100000000 ? value : null; };
    const sort = query.get('sort');
    this.view.listSettings.set({ minCents: bound('minCents'), maxCents: bound('maxCents'), createdBy: untracked(() => this.view.scope()) === 'shared' ? query.get('createdBy') || '' : '', sort: ['date-asc', 'amount-asc', 'amount-desc'].includes(sort || '') ? sort as MovementSort : 'date-desc', recurringExpenses: query.get('recurringExpenses') === '1' });
  }
  clearAmountFilters(): void { this.view.listSettings.update(value => ({ ...value, minCents: null, maxCents: null })); }
  clearRecurringFilter(): void { this.view.listSettings.update(value => ({ ...value, recurringExpenses: false })); }
  clearAuthorFilter(): void { this.view.listSettings.update(value => ({ ...value, createdBy: '' })); }
  openFilters(): void { this.modal.open({ kind: 'movement-filters', showAuthor: this.view.scope() === 'shared', value: { name: this.view.listSearch(), ...this.view.listSettings() }, apply: filters => { const { name, ...settings } = filters; this.view.listSearch.set(name); this.view.listSettings.set(settings); } }); }
  goPage(page: number): void {
    this.page.set(Math.max(1, Math.min(page, this.pageCount())));
    document.getElementById('summary-movements')?.scrollIntoView({ behavior: 'instant', block: 'start' });
  }
  openMonth(month: string): void { void this.router.navigate(['/resumen', month], { queryParams: this.monthFilters() }); }
}

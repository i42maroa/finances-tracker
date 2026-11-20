import { Injectable, computed, inject, signal } from '@angular/core';
import { StoreService } from './store.service';
import { AuthService } from './auth.service';
import { BalanceService } from './balance.service';
import { localDate, share } from './finance';
import { Movement, MovementType, MovementFilters } from '../models/models';
import { isConfirmed, plannedMonthMovements } from './recurring';
@Injectable({ providedIn: 'root' })
export class ViewService {
  store = inject(StoreService);
  auth = inject(AuthService);
  balances = inject(BalanceService);
  month = signal(localDate().slice(0, 7));
  period = signal<'month' | 'year'>('month');
  year = signal(new Date().getFullYear());
  scope = signal<'shared' | 'personal'>('shared');
  category = signal('');
  from = signal('');
  to = signal('');
  search = signal('');
  listCategory = signal('');
  listSubcategory = signal('');
  listSearch = signal('');
  listType = signal<MovementType | 'all'>('all');
  listSettings = signal<Omit<MovementFilters, 'name'>>({ minCents: null, maxCents: null, createdBy: '', sort: 'date-desc' });
  hasListFilters = computed(() => !!(this.listType() !== 'all' || this.listCategory() || this.listSubcategory() || this.listSearch() || this.listSettings().minCents !== null || this.listSettings().maxCents !== null || this.listSettings().createdBy || this.listSettings().recurringExpenses));
  breakdownType = signal<MovementType>('expense');
  uid = computed(() => this.auth.user()?.uid || '');
  filtered = computed(() => this.store.movements().filter(item => {
    if (!isConfirmed(item)) return false;
    const from = this.from() || (this.period() === 'year' ? `${this.year()}-01-01` : `${this.month()}-01`);
    const to = this.to() || (this.period() === 'year' ? `${this.year()}-12-31` : `${this.month()}-31`);
    if (item.date < from || item.date > to || this.category() && item.categoryId !== this.category()) return false;
    const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
    if (!normalize(item.concept).includes(normalize(this.search().trim()))) return false;
    return this.scope() === 'shared' ? item.space === 'shared' || item.type === 'income' : item.space === 'individual' ? item.ownerId === this.uid() : true;
  }).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt)));
  summary = computed(() => this.balances.summary(this.filtered(), this.scope() === 'personal' ? this.uid() : undefined));
  plannedMovements = computed(() => plannedMonthMovements(this.store.recurringMovements(), this.store.movements(), this.month())
    .filter(item => this.scope() === 'shared' ? item.space === 'shared' : item.space === 'shared' || item.ownerId === this.uid()));
  pending = computed(() => this.plannedMovements().filter(item => !isConfirmed(item)));
  pendingTotals = computed(() => {
    const total = (type: MovementType) => this.pending().filter(item => item.type === type).reduce((sum, item) => sum + this.displayAmount(item), 0);
    return { incomeCents: total('income'), expenseCents: total('expense') };
  });
  private matchesList(item: Movement): boolean {
    const normalize = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
    const settings = this.listSettings(), amount = this.displayAmount(item);
    return (this.listType() === 'all' || item.type === this.listType())
      && (!this.listCategory() || item.categoryId === this.listCategory())
      && (!this.listSubcategory() || (item.subcategoryId || '__none__') === this.listSubcategory())
      && normalize(item.concept).includes(normalize(this.listSearch().trim()))
      && (settings.minCents === null || amount >= settings.minCents) && (settings.maxCents === null || amount <= settings.maxCents)
      && (!settings.createdBy || item.createdBy === settings.createdBy)
      && (!settings.recurringExpenses || item.type === 'expense' && !!item.recurringId);
  }
  listMovements = computed(() => {
    const settings = this.listSettings();
    return this.filtered().filter(item => this.matchesList(item)).sort((a, b) => {
      const date = b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt);
      if (settings.sort === 'date-asc') return -date;
      if (settings.sort === 'amount-asc') return this.displayAmount(a) - this.displayAmount(b) || date;
      if (settings.sort === 'amount-desc') return this.displayAmount(b) - this.displayAmount(a) || date;
      return date;
    });
  });
  months = computed(() => Array.from({ length: 12 }, (_, index) => {
    const month = `${this.year()}-${String(index + 1).padStart(2, '0')}`;
    const planned = plannedMonthMovements(this.store.recurringMovements(), this.store.movements(), month).filter(item => item.space === 'shared' || this.scope() === 'personal' && item.ownerId === this.uid());
    return {
      month,
      pendingCount: planned.filter(item => !isConfirmed(item)).length,
      hasPlanned: planned.length > 0,
      label: new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(new Date(this.year(), index, 1)),
      ...this.balances.summary(this.filtered().filter(item => item.date.startsWith(month)), this.scope() === 'personal' ? this.uid() : undefined)
    };
  }).filter(row => row.month <= localDate().slice(0, 7) && (row.incomeCents !== 0 || row.expenseCents !== 0 || row.hasPlanned)));
  breakdown = computed(() => {
    const categories = this.store.categories();
    const totals = new Map<string, number>();
    for (const item of this.filtered()) {
      if (item.type !== this.breakdownType()) continue;
      const amount = this.displayAmount(item);
      totals.set(item.categoryId, (totals.get(item.categoryId) || 0) + amount);
    }
    return [...totals].map(([id, amount]) => ({ category: categories.find(item => item.id === id), amount })).filter(row => row.amount > 0).sort((a, b) => b.amount - a.amount);
  });
  breakdownTotal = computed(() => this.breakdown().reduce((total, row) => total + row.amount, 0));
  displayAmount(movement: Movement): number {
    return this.scope() === 'personal' && movement.space === 'shared'
      ? share(movement.amountCents, this.store.couple()!.memberIds, this.uid())
      : movement.amountCents;
  }
  categoryLabel(item: Pick<Movement, 'categoryId' | 'subcategoryId'>): string {
    const categories = this.store.categories();
    const parent = categories.find(category => category.id === item.categoryId);
    const child = categories.find(category => category.id === item.subcategoryId);
    return [parent?.name, child?.name].filter(Boolean).join(' · ');
  }
  name(uid: string | null | undefined): string { return uid ? this.store.couple()?.memberNames[uid] || 'Miembro' : ''; }
  money(cents: number): string { return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100); }
  date(date: string): string { return new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' }).format(new Date(`${date}T12:00:00`)); }
}

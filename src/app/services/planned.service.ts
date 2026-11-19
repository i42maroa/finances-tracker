import { DestroyRef, Injectable, computed, inject, signal } from '@angular/core';
import { StoreService } from './store.service';
import { localDate } from './finance';
import { dueOccurrences, pendingOccurrences } from './recurring';

@Injectable({ providedIn: 'root' })
export class PlannedService {
  private store = inject(StoreService);
  today = signal(localDate());
  due = computed(() => dueOccurrences(this.store.recurringMovements(), this.store.movements(), this.today()));
  notice = computed(() => {
    const rows = this.due();
    if (!rows.length) return null;
    const month = rows[0].date.slice(0, 7);
    return { month, count: rows.length, label: new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(new Date(`${month}-01T12:00:00`)) };
  });
  forMonth(month: string) { return pendingOccurrences(this.store.recurringMovements(), this.store.movements(), month); }
  constructor() {
    const refresh = () => this.today.set(localDate());
    const timer = window.setInterval(refresh, 60000);
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    inject(DestroyRef).onDestroy(() => {
      window.clearInterval(timer);
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    });
  }
}

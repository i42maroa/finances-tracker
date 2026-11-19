import { Injectable, computed, inject } from '@angular/core';
import { StoreService } from './store.service';
import { calculateDebt, summarize } from './finance';
import { Movement } from '../models/models';
@Injectable({ providedIn: 'root' })
export class BalanceService {
  private store = inject(StoreService);
  debt = computed(() => calculateDebt(this.store.movements(), this.store.settlements(), this.store.couple()?.memberIds || []));
  summary(movements: Movement[], uid?: string, includeShared = true) { return summarize(movements, this.store.couple()?.memberIds || [], uid, includeShared); }
}

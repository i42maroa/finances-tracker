import { Component, computed, inject, signal } from '@angular/core';
import { RecurringMovement } from '../../models/models';
import { ModalService } from '../../services/modal.service';
import { ViewService } from '../../services/view.service';
import { RecurringService } from '../../services/recurring.service';
import { localDate } from '../../services/finance';
import { errorMessage } from '../../services/errors';
import { BreadcrumbComponent } from '../../shared/breadcrumb/breadcrumb';

@Component({ selector: 'app-recurring', imports: [BreadcrumbComponent], templateUrl: './recurring.html', styleUrl: './recurring.css' })
export class RecurringComponent {
  view = inject(ViewService);
  modal = inject(ModalService);
  private recurring = inject(RecurringService);
  scope = signal<'all' | 'shared' | 'individual'>('all');
  busy = signal('');
  error = signal('');
  rows = computed(() => this.view.store.recurringMovements().filter(item => this.scope() === 'all' || item.space === this.scope()).sort((a, b) => Number(b.enabled) - Number(a.enabled) || a.concept.localeCompare(b.concept)));
  add(): void { this.modal.movementSpace.set(this.scope() === 'individual' ? 'individual' : 'shared'); this.modal.open({ kind: 'recurring' }); }
  status(item: RecurringMovement): string { return !item.enabled ? 'Pausado' : item.endDate && item.endDate < localDate() ? 'Finalizado' : item.startDate > localDate() ? 'Programado' : 'Activo'; }
  date(value: string): string { return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(new Date(`${value}T12:00:00`)); }
  async toggle(item: RecurringMovement): Promise<void> {
    if (this.busy()) return;
    this.busy.set(item.id); this.error.set('');
    try { await this.recurring.toggle(item); } catch (error) { this.error.set(errorMessage(error)); } finally { this.busy.set(''); }
  }
}

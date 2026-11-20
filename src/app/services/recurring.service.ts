import { Injectable, inject } from '@angular/core';
import { Movement, RecurringMovement, RecurringSchedule } from '../models/models';
import { AuthService } from './auth.service';
import { StoreService } from './store.service';
import { MovementService } from './movement.service';
import { localDate } from './finance';
import { sameRecord } from './records';
import { recurringSchedule, validDate } from './recurring';

@Injectable({ providedIn: 'root' })
export class RecurringService {
  private store = inject(StoreService);
  private auth = inject(AuthService);
  private movements = inject(MovementService);

  async save(schedule: RecurringSchedule, previous?: RecurringMovement, draftId?: string, draftCreatedAt?: string): Promise<void> {
    if (!validDate(schedule.startDate) || schedule.endDate && (!validDate(schedule.endDate) || schedule.endDate < schedule.startDate)) throw new Error('Revisa las fechas de inicio y fin.');
    if (!schedule.days.length || schedule.days.some(day => !Number.isInteger(day) || day < 1 || day > 31)) throw new Error('Selecciona al menos un día de cobro o pago, entre el 1 y el 31.');
    if (previous && (schedule.type !== previous.type || schedule.space !== previous.space || schedule.ownerId !== previous.ownerId)) throw new Error('El tipo y el espacio se conservan para proteger el historial. Crea otra recurrencia para cambiarlos.');
    if (schedule.type === 'income' && schedule.space !== 'individual') throw new Error('Los ingresos recurrentes se guardan en Individual.');
    const now = new Date().toISOString();
    const example: Movement = { ...schedule, id: previous?.id || draftId || '', date: schedule.startDate, createdBy: previous?.createdBy || this.auth.user()!.uid, createdAt: previous?.createdAt || draftCreatedAt || now, updatedAt: now };
    const normalized = this.movements.normalize(example, previous ? { ...previous, date: previous.startDate } : undefined);
    const days = [...new Set(schedule.days)].sort((a, b) => a - b);
    if (previous && sameRecord({ ...recurringSchedule(previous), days: [...previous.days].sort((a, b) => a - b), effectiveFrom: '' }, recurringSchedule({ ...schedule, ...normalized, days, effectiveFrom: '' }))) return;
    const effectiveFrom = previous ? localDate() : schedule.startDate;
    const value: RecurringMovement = {
      ...recurringSchedule({ ...schedule, ...normalized, effectiveFrom }),
      id: previous?.id || draftId || crypto.randomUUID(), createdBy: example.createdBy, createdAt: example.createdAt, updatedAt: now,
      days, revision: (previous?.revision || 0) + 1,
      history: previous ? [...previous.history, { ...recurringSchedule(previous), effectiveUntil: effectiveFrom }] : []
    };
    await this.store.saveRecurring(value);
  }
  async toggle(value: RecurringMovement): Promise<void> { await this.save({ ...recurringSchedule(value), enabled: !value.enabled }, value); }
  async confirm(value: Movement, previous: Movement): Promise<void> {
    const normalized = this.movements.normalize({ ...value, status: 'confirmed' }, previous);
    await this.store.saveOccurrence({ ...normalized, updatedAt: previous.updatedAt });
  }
  async skip(value: Movement): Promise<void> { await this.store.saveOccurrence({ ...value, status: 'skipped' }); }
}

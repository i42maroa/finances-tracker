import { Injectable, inject } from '@angular/core';
import { Movement, Settlement } from '../models/models';
import { StoreService } from './store.service';
import { AuthService } from './auth.service';
import { validDate } from './recurring';
@Injectable({ providedIn: 'root' })
export class MovementService {
  private store = inject(StoreService);
  private auth = inject(AuthService);
  async save(value: Movement, expected: Movement | null = null): Promise<void> {
    value = this.normalize(value);
    await this.store.save('movements', value, expected);
  }
  normalize(value: Movement, previous = this.store.movements().find(item => item.id === value.id)): Movement {
    if (previous?.recurringId && (value.recurringId !== previous.recurringId || value.scheduledDate !== previous.scheduledDate || value.type !== previous.type || value.space !== previous.space || value.ownerId !== previous.ownerId)) throw new Error('El tipo y el espacio de este movimiento recurrente se conservan. Puedes ajustar su importe, fecha y demás detalles.');
    if (!Number.isInteger(value.amountCents) || value.amountCents <= 0 || value.amountCents > 100000000) throw new Error('Introduce un importe válido.');
    if (!validDate(value.date) || !value.concept.trim() || value.concept.length > 100) throw new Error('Revisa el nombre y la fecha del movimiento.');
    const description = value.description ?? '';
    if (description.length > 1000) throw new Error('La descripción no puede superar los 1000 caracteres.');
    value = { ...value, description: description.trim() };
    if (value.space === 'individual' && value.ownerId !== this.auth.user()?.uid) throw new Error('Solo puedes guardar tus propios movimientos individuales.');
    const members = this.store.couple()?.memberIds || [];
    const category = this.store.categories().find(item => item.id === value.categoryId);
    if (!category || category.type !== value.type) throw new Error('Selecciona una categoría del tipo de movimiento.');
    if (category.parentId) throw new Error('Selecciona una categoría general.');
    if (value.subcategoryId) {
      const child = this.store.categories().find(item => item.id === value.subcategoryId);
      if (!child || child.parentId !== category.id || child.type !== value.type || child.archived && previous?.subcategoryId !== child.id) throw new Error('Selecciona una subcategoría activa de esta categoría.');
    }
    if (category.archived && previous?.categoryId !== category.id) throw new Error('Esta categoría está archivada. Selecciona una categoría activa.');
    if (value.space === 'shared' && members.length !== 2) throw new Error('Vincula a tu pareja antes de registrar movimientos de Hogar.');
    if (!members.includes(value.ownerId) || !members.includes(value.actorId)) throw new Error('Selecciona una persona de vuestra pareja.');
    if (value.type === 'income' || value.space === 'individual') value = { ...value, payment: 'single' };
    if (value.type === 'income' && value.space === 'individual') value = { ...value, actorId: value.ownerId };
    return value;
  }
  async saveSettlement(value: Settlement, expected: Settlement | null = null): Promise<void> {
    const members = this.store.couple()?.memberIds || [];
    if (members.length !== 2 || value.fromId === value.toId || !members.includes(value.fromId) || !members.includes(value.toId)) throw new Error('La liquidación debe ser entre los dos miembros de la pareja.');
    await this.store.save('settlements', value, expected);
  }
}

import { Debt, Movement, Settlement, Summary } from '../models/models';
import { isConfirmed } from './recurring';

export function eurosToCents(value: string | number): number {
  const text = String(value).trim().replace(',', '.');
  if (!/^\d{1,7}(\.\d{1,2})?$/.test(text)) throw new Error('Introduce un importe válido, con un máximo de dos decimales.');
  const [whole, decimal = ''] = text.split('.');
  const cents = Number(whole) * 100 + Number(decimal.padEnd(2, '0'));
  if (cents <= 0 || cents > 100000000) throw new Error('El importe debe estar entre 0,01 € y 1.000.000 €.');
  return cents;
}
// The first member receives the extra cent when the amount is odd. This keeps all totals exact.
export function share(cents: number, memberIds: string[], uid: string): number {
  return Math.floor(cents / 2) + (memberIds[0] === uid ? cents % 2 : 0);
}
export function summarize(movements: Movement[], memberIds: string[], uid?: string, includeShared = true): Summary {
  let incomeCents = 0, expenseCents = 0;
  for (const movement of movements) {
    if (!isConfirmed(movement)) continue;
    let amount = movement.amountCents;
    if (uid) {
      if (movement.space === 'individual' && movement.ownerId !== uid) continue;
      if (movement.space === 'shared') {
        if (!includeShared) continue;
        amount = share(amount, memberIds, uid);
      }
    }
    if (movement.type === 'income') incomeCents += amount;
    else expenseCents += amount;
  }
  return { incomeCents, expenseCents, netCents: incomeCents - expenseCents };
}
export function calculateDebt(movements: Movement[], settlements: Settlement[], memberIds: string[]): Debt {
  if (memberIds.length !== 2) return { amountCents: 0, fromId: null, toId: null };
  const [first, second] = memberIds;
  let credit = 0;
  for (const movement of movements) {
    if (!isConfirmed(movement)) continue;
    if (movement.space !== 'shared') continue;
    const entitlement = share(movement.amountCents, memberIds, first);
    const actual = movement.payment === 'half' && movement.type === 'expense'
      ? entitlement : movement.actorId === first ? movement.amountCents : 0;
    credit += (actual - entitlement) * (movement.type === 'expense' ? 1 : -1);
  }
  for (const settlement of settlements) credit += settlement.fromId === first ? settlement.amountCents : -settlement.amountCents;
  return { amountCents: Math.abs(credit), fromId: credit === 0 ? null : credit > 0 ? second : first, toId: credit === 0 ? null : credit > 0 ? first : second };
}
export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

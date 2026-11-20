import { Movement } from '../models/models';

// Compare business fields independently of field order and optional empty values.
export function sameRecord(a: unknown, b: unknown): boolean {
  const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
    ? Object.fromEntries(Object.entries(value).filter(([key, child]) => !['updatedAt', 'revision'].includes(key) && child !== undefined && child !== '').sort(([a], [b]) => a.localeCompare(b)).map(([key, child]) => [key, canonical(child)])) : value;
  return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
}
export function sameOccurrence(current: Movement, requested: Movement): boolean {
  const business = ({ type, amountCents, date, concept, description, categoryId, subcategoryId, space, ownerId, actorId, payment, recurringId, scheduledDate, status }: Movement) =>
    ({ type, amountCents, date, concept, description, categoryId, subcategoryId, space, ownerId, actorId: payment === 'half' ? undefined : actorId, payment, recurringId, scheduledDate, status });
  return sameRecord(business(current), business(requested));
}
export function assertUnchanged(current: unknown, expected: unknown): void {
  if (JSON.stringify(current) !== JSON.stringify(expected)) {
    // Field order from Firestore is not stable.
    const actual = current as { updatedAt?: string; revision?: number } | undefined;
    const baseline = expected as typeof actual;
    if (!sameRecord(current, expected) || actual?.updatedAt !== baseline?.updatedAt || actual?.revision !== baseline?.revision)
      throw new Error('El registro ha cambiado o se ha eliminado. Vuelve a abrirlo antes de guardar.');
  }
}

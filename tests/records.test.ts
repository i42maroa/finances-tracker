import { describe, expect, it } from 'vitest';
import { assertUnchanged, sameOccurrence, sameRecord } from '../src/app/services/records';
import { rollups } from '../src/app/services/rollups';
import { share } from '../src/app/services/finance';
import { Movement } from '../src/app/models/models';

describe('Ediciones concurrentes', () => {
  const original = { id: 'm', amountCents: 100, updatedAt: 'original', revision: 1 };
  it('detecta cambios, eliminaciones y el regreso al valor original tras otra edición', () => {
    expect(() => assertUnchanged({ ...original, amountCents: 200, revision: 2 }, original)).toThrow('ha cambiado');
    expect(() => assertUnchanged(undefined, original)).toThrow('ha cambiado');
    expect(() => assertUnchanged({ ...original, revision: 3 }, original)).toThrow('ha cambiado');
  });
  it('acepta el orden de campos que devuelve Firestore y evita escrituras sin cambios', () => {
    expect(() => assertUnchanged({ revision: 1, updatedAt: 'original', amountCents: 100, id: 'm' }, original)).not.toThrow();
    expect(sameRecord({ ...original, description: '' }, { ...original, updatedAt: 'new' })).toBe(true);
    expect(sameRecord(original, { ...original, amountCents: 200 })).toBe(false);
  });
});

it('agrupa meses, categorías y subcategorías conservando el reparto de céntimos impares', () => {
  const base: Movement = { id: 'm', amountCents: 101, date: '2026-01-02', type: 'expense', concept: 'Compra', categoryId: 'food', space: 'shared', ownerId: 'a', actorId: 'a', payment: 'single', createdBy: 'a', createdAt: 'now', updatedAt: 'now' };
  const rows = [base, { ...base, id: '2', subcategoryId: 'fresh', amountCents: 201 }, { ...base, id: '3', type: 'income' as const, categoryId: 'salary', date: '2026-02-01', amountCents: 10000 }];
  expect(sameOccurrence(base, { ...base, createdBy: 'b', createdAt: 'later' })).toBe(true);
  expect(sameOccurrence(base, { ...base, actorId: 'b' })).toBe(false);
  expect(sameOccurrence({ ...base, payment: 'half' }, { ...base, payment: 'half', actorId: 'b' })).toBe(true);
  expect(sameOccurrence(base, { ...base, status: 'skipped' })).toBe(false);
  const first = rollups(rows, row => share(row.amountCents, ['a', 'b'], 'a'));
  const second = rollups(rows, row => share(row.amountCents, ['a', 'b'], 'b'));
  expect(first.total).toEqual({ incomeCents: 5000, expenseCents: 152, netCents: 4848 });
  expect(first.total.expenseCents + second.total.expenseCents).toBe(302);
  expect(first.months.get('2026-01')?.expenseCents).toBe(152);
  expect(first.categories.get('expense')?.get('food')).toBe(152);
  expect(first.children.get('expense')?.get('food')?.get('fresh')).toBe(101);
  expect(first.children.get('expense')?.get('food')?.get('__none__')).toBe(51);
});

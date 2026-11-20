import { describe, expect, it } from 'vitest';
import { Category, Movement } from '../src/app/models/models';
import { monthlySeries } from '../src/app/services/monthly-series';
import { share } from '../src/app/services/finance';

const categories: Category[] = [
  { id: 'home', name: 'Hogar', icon: '', type: 'expense', archived: false },
  { id: 'rent', name: 'Alquiler', icon: '', type: 'expense', parentId: 'home', archived: true },
  { id: 'light', name: 'Luz', icon: '', type: 'expense', parentId: 'home', archived: false }
];
const movement = (overrides: Partial<Movement> = {}): Movement => ({
  id: '1', type: 'expense', amountCents: 101, date: '2026-01-10', categoryId: 'home',
  concept: '', space: 'shared', ownerId: 'a', actorId: 'a', payment: 'single',
  createdBy: 'a', createdAt: '', updatedAt: '', ...overrides
});
const amount = (item: Movement) => item.amountCents;

describe('Series mensuales por categoría y subcategoría', () => {
  it('suma por mes en céntimos y completa los doce meses con ceros', () => {
    const result = monthlySeries([movement(), movement({ amountCents: 299 }), movement({ date: '2026-12-31', amountCents: 1000 })], categories, 2026, 'expense', amount);
    expect(result).toEqual([{ id: 'home', label: 'Hogar', detail: false, values: [400, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1000] }]);
  });
  it('excluye otros años, tipos y movimientos sin confirmar', () => {
    expect(monthlySeries([
      movement({ date: '2025-01-01' }), movement({ type: 'income' }),
      movement({ status: 'pending' }), movement({ status: 'skipped' })
    ], categories, 2026, 'expense', amount)).toEqual([]);
    expect(monthlySeries([movement({ type: 'income' })], categories, 2026, 'income', amount)).toHaveLength(1);
  });
  it('conserva el total de la categoría y desglosa subcategorías archivadas y sin clasificar', () => {
    const result = monthlySeries([
      movement({ subcategoryId: 'rent', amountCents: 10000 }), movement({ subcategoryId: 'light', amountCents: 2000 }),
      movement({ amountCents: 500 }), movement({ categoryId: 'other', amountCents: 99999 })
    ], categories, 2026, 'expense', amount, 'home');
    expect(result.map(row => [row.label, row.values[0]])).toEqual([['Hogar', 12500], ['Alquiler', 10000], ['Luz', 2000], ['Sin subcategoría', 500]]);
  });
  it('aísla una subcategoría y permite seleccionar Sin subcategoría', () => {
    const rows = [movement({ subcategoryId: 'light' }), movement({ amountCents: 50 })];
    expect(monthlySeries(rows, categories, 2026, 'expense', amount, 'home', 'light').map(row => [row.label, row.values[0]])).toEqual([['Luz', 101]]);
    expect(monthlySeries(rows, categories, 2026, 'expense', amount, 'home', '__none__').map(row => [row.label, row.values[0]])).toEqual([['Sin subcategoría', 50]]);
  });
  it('usa la atribución individual exacta sin duplicar una categoría sin subcategorías', () => {
    const result = monthlySeries([movement()], categories, 2026, 'expense', item => share(item.amountCents, ['a', 'b'], 'a'), 'home');
    expect(result).toHaveLength(1);
    expect(result[0].values[0]).toBe(51);
  });
});

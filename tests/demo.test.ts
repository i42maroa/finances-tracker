import { describe, expect, it } from 'vitest';
import { createDemo, updateDemoMovements } from '../src/app/services/demo';

describe('Movimientos de demostración', () => {
  it('clasifica los gastos en subcategorías de su categoría general', () => {
    const data = createDemo();
    for (const movement of data.movements.filter(item => item.type === 'expense')) {
      const child = data.categories.find(item => item.id === movement.subcategoryId);
      expect(child?.parentId).toBe(movement.categoryId);
      expect(child?.type).toBe(movement.type);
    }
    expect(data.movements.find(item => item.concept === 'Gasolina')).toMatchObject({ categoryId: 'car', subcategoryId: 'car-sub-0' });
  });

  it('actualiza ejemplos antiguos sin reemplazar ediciones ni subcategorías archivadas', () => {
    const data = createDemo();
    for (const movement of data.movements) delete movement.subcategoryId;
    data.movements.find(item => item.id === '3')!.concept = 'Compra editada';
    data.categories.find(item => item.id === 'leisure-sub-0')!.archived = true;
    Object.assign(data.movements.find(item => item.id === '7')!, { concept: 'Abono de transporte', categoryId: 'transport' });
    const count = data.movements.length;
    expect(updateDemoMovements(data)).toBe(true);
    expect(data.movements).toHaveLength(count);
    expect(data.movements.find(item => item.id === '2')?.subcategoryId).toBe('home-sub-1');
    expect(data.movements.find(item => item.id === '3')).toMatchObject({ concept: 'Compra editada' });
    expect(data.movements.find(item => item.id === '3')?.subcategoryId).toBeUndefined();
    expect(data.movements.find(item => item.id === '4')?.subcategoryId).toBeUndefined();
    expect(data.movements.find(item => item.id === '7')).toMatchObject({ concept: 'Gasolina', categoryId: 'car', subcategoryId: 'car-sub-0' });
    expect(updateDemoMovements(data)).toBe(false);
  });
});

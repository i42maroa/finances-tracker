import { Category, Movement, MovementType } from '../models/models';
import { isConfirmed } from './recurring';

export interface MonthlySeries {
  id: string;
  label: string;
  values: number[];
  detail: boolean;
}

export function monthlySeries(
  movements: Movement[], categories: Category[], year: number, type: MovementType,
  amount: (movement: Movement) => number, categoryId = '', subcategoryId = ''
): MonthlySeries[] {
  const totals = new Map<string, MonthlySeries>();
  const names = new Map(categories.map(category => [category.id, category.name]));
  const add = (id: string, label: string, month: number, cents: number, detail: boolean) => {
    if (!totals.has(id)) totals.set(id, { id, label, values: Array(12).fill(0), detail });
    totals.get(id)!.values[month] += cents;
  };
  const rows = movements.filter(item => isConfirmed(item) && item.type === type
    && item.date.slice(0, 4) === String(year) && (!categoryId || item.categoryId === categoryId));
  const hasChildren = !!categoryId && rows.some(item => !!item.subcategoryId);
  for (const item of rows) {
    const month = Number(item.date.slice(5, 7)) - 1;
    if (month < 0 || month > 11 || !Number.isInteger(month)) continue;
    const cents = amount(item);
    const child = item.subcategoryId || '__none__';
    if (!subcategoryId) add(item.categoryId, names.get(item.categoryId) || 'Categoría eliminada', month, cents, false);
    if (categoryId && (hasChildren || subcategoryId) && (!subcategoryId || child === subcategoryId)) {
      add(`${categoryId}/${child}`, child === '__none__' ? 'Sin subcategoría' : names.get(child) || 'Subcategoría eliminada', month, cents, true);
    }
  }
  return [...totals.values()].sort((a, b) => Number(a.detail) - Number(b.detail)
    || b.values.reduce((sum, value) => sum + value, 0) - a.values.reduce((sum, value) => sum + value, 0));
}

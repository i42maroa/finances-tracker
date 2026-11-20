import { Movement, MovementType, Summary } from '../models/models';
export function rollups(rows: Movement[], amount: (row: Movement) => number) {
  const total: Summary = { incomeCents: 0, expenseCents: 0, netCents: 0 };
  const months = new Map<string, Summary>();
  const categories = new Map<MovementType, Map<string, number>>();
  const children = new Map<MovementType, Map<string, Map<string, number>>>();
  for (const row of rows) {
    const cents = amount(row), key = row.type === 'income' ? 'incomeCents' : 'expenseCents', month = row.date.slice(0, 7);
    total[key] += cents;
    const summary = months.get(month) || { incomeCents: 0, expenseCents: 0, netCents: 0 };
    summary[key] += cents; summary.netCents = summary.incomeCents - summary.expenseCents; months.set(month, summary);
    if (!categories.has(row.type)) categories.set(row.type, new Map());
    const category = categories.get(row.type)!; category.set(row.categoryId, (category.get(row.categoryId) || 0) + cents);
    if (!children.has(row.type)) children.set(row.type, new Map());
    const parents = children.get(row.type)!;
    if (!parents.has(row.categoryId)) parents.set(row.categoryId, new Map());
    const subcategories = parents.get(row.categoryId)!, subcategory = row.subcategoryId || '__none__';
    subcategories.set(subcategory, (subcategories.get(subcategory) || 0) + cents);
  }
  total.netCents = total.incomeCents - total.expenseCents;
  return { total, months, categories, children };
}

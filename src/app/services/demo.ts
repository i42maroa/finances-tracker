import { Category, HouseholdData } from '../models/models';
import { localDate } from './finance';

export function defaultCategories(): Category[] {
  return [
    { id: 'home', name: 'Hogar', type: 'expense' as const, icon: '⌂', archived: false },
    { id: 'food', name: 'Supermercado', type: 'expense' as const, icon: '▦', archived: false },
    { id: 'leisure', name: 'Ocio', type: 'expense' as const, icon: '☀', archived: false },
    { id: 'transport', name: 'Transporte', type: 'expense' as const, icon: '↗', archived: false },
    { id: 'car', name: 'Coche', type: 'expense' as const, icon: '↗', archived: false },
    ...Object.entries({ home: ['Hipoteca', 'Alquiler', 'Luz', 'Agua', 'Internet'], food: ['Alimentación', 'Limpieza'], leisure: ['Cena', 'Cine'], car: ['Gasolina', 'Mecánico'] }).flatMap(([parentId, names]) => names.map((name, index) => ({ id: `${parentId}-sub-${index}`, name, parentId, type: 'expense' as const, icon: '·', archived: false }))),
    { id: 'other', name: 'Otros gastos', type: 'expense' as const, icon: '⋯', archived: false },
    { id: 'salary', name: 'Nómina', type: 'income' as const, icon: '↙', archived: false },
    { id: 'projects', name: 'Proyectos', type: 'income' as const, icon: '✧', archived: false },
    { id: 'other-income', name: 'Otros ingresos', type: 'income' as const, icon: '+', archived: false }
  ];
}
export function createDemo(): HouseholdData {
  const month = localDate().slice(0, 7), now = new Date().toISOString();
  return {
    couple: { id: 'demo', memberIds: ['antonio', 'alex'], memberNames: { antonio: 'Antonio', alex: 'Álex' }, inviteCode: 'DEMO', createdAt: now },
    categories: defaultCategories(),
    movements: [
      { id: '1', concept: 'Nómina de este mes', amountCents: 225000, date: `${month}-01`, type: 'income', categoryId: 'salary', space: 'individual', ownerId: 'antonio', actorId: 'antonio', payment: 'single', createdBy: 'antonio', createdAt: now, updatedAt: now },
      { id: '2', concept: 'Nuestro alquiler', amountCents: 85000, date: `${month}-02`, type: 'expense', categoryId: 'home', subcategoryId: 'home-sub-1', space: 'shared', ownerId: 'antonio', actorId: 'antonio', payment: 'single', createdBy: 'antonio', createdAt: now, updatedAt: now },
      { id: '3', concept: 'La compra de la semana', amountCents: 8640, date: `${month}-05`, type: 'expense', categoryId: 'food', subcategoryId: 'food-sub-0', space: 'shared', ownerId: 'alex', actorId: 'alex', payment: 'single', createdBy: 'alex', createdAt: now, updatedAt: now },
      { id: '4', concept: 'Una cena para dos', amountCents: 5800, date: `${month}-08`, type: 'expense', categoryId: 'leisure', subcategoryId: 'leisure-sub-0', space: 'shared', ownerId: 'antonio', actorId: 'antonio', payment: 'half', createdBy: 'antonio', createdAt: now, updatedAt: now },
      { id: '5', concept: 'Encargo de impresión 3D', amountCents: 7500, date: `${month}-10`, type: 'income', categoryId: 'projects', space: 'individual', ownerId: 'antonio', actorId: 'antonio', payment: 'single', createdBy: 'antonio', createdAt: now, updatedAt: now },
      { id: '6', concept: 'Venta del mueble del salón', amountCents: 12000, date: `${month}-12`, type: 'income', categoryId: 'other-income', space: 'shared', ownerId: 'alex', actorId: 'alex', payment: 'single', createdBy: 'alex', createdAt: now, updatedAt: now },
      { id: '7', concept: 'Gasolina', amountCents: 3200, date: `${month}-03`, type: 'expense', categoryId: 'car', subcategoryId: 'car-sub-0', space: 'individual', ownerId: 'antonio', actorId: 'antonio', payment: 'single', createdBy: 'antonio', createdAt: now, updatedAt: now }
    ],
    settlements: [{ id: 's1', amountCents: 20000, date: `${month}-07`, fromId: 'alex', toId: 'antonio', note: 'Parte del alquiler', createdBy: 'alex', createdAt: now, updatedAt: now }]
  };
}

// Upgrade only the original demo examples; keep user-created or reclassified records.
export function updateDemoMovements(data: HouseholdData): boolean {
  const originals = [
    { id: '2', concept: 'Nuestro alquiler', amountCents: 85000, categoryId: 'home', nextCategory: 'home', subcategoryId: 'home-sub-1' },
    { id: '3', concept: 'La compra de la semana', amountCents: 8640, categoryId: 'food', nextCategory: 'food', subcategoryId: 'food-sub-0' },
    { id: '4', concept: 'Una cena para dos', amountCents: 5800, categoryId: 'leisure', nextCategory: 'leisure', subcategoryId: 'leisure-sub-0' },
    { id: '7', concept: 'Abono de transporte', amountCents: 3200, categoryId: 'transport', nextCategory: 'car', subcategoryId: 'car-sub-0' }
  ];
  let changed = false;
  data.movements = data.movements.map(item => {
    const original = originals.find(value => value.id === item.id && value.concept === item.concept && value.amountCents === item.amountCents && value.categoryId === item.categoryId);
    if (!original || item.subcategoryId || item.type !== 'expense') return item;
    const parent = data.categories.find(category => category.id === original.nextCategory && !category.archived);
    const child = data.categories.find(category => category.id === original.subcategoryId && category.parentId === parent?.id && !category.archived);
    if (!parent || !child) return item;
    changed = true;
    return { ...item, concept: item.id === '7' ? 'Gasolina' : item.concept, categoryId: parent.id, subcategoryId: child.id };
  });
  return changed;
}

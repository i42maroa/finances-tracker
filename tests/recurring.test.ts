import { describe, expect, it } from 'vitest';
import { Movement, RecurringMovement } from '../src/app/models/models';
import { dueOccurrences, isConfirmed, pendingOccurrences, plannedMonthMovements, recurringSchedule, scheduleForOccurrence, validDate } from '../src/app/services/recurring';
import { calculateDebt, summarize } from '../src/app/services/finance';

function template(overrides: Partial<RecurringMovement> = {}): RecurringMovement {
  return { id: 'rent', type: 'expense', amountCents: 85001, concept: 'Alquiler', description: '', categoryId: 'home', subcategoryId: '', space: 'shared', ownerId: 'a', actorId: 'a', payment: 'single', startDate: '2026-01-01', endDate: '', days: [2], enabled: true, effectiveFrom: '2026-01-01', createdBy: 'a', createdAt: '2026-01-01T10:00:00Z', updatedAt: '2026-01-01T10:00:00Z', revision: 1, history: [], ...overrides };
}

describe('Calendario de movimientos recurrentes', () => {
  it('conserva la configuración de una confirmación anterior a otra edición del mismo día', () => {
    const original = template({ startDate: '2026-11-01', effectiveFrom: '2026-11-01', amountCents: 900 });
    const [confirmed] = pendingOccurrences([original], [], '2026-11');
    const changed = { ...original, amountCents: 1000, effectiveFrom: '2026-11-02', revision: 2, history: [{ ...recurringSchedule(original), effectiveUntil: '2026-11-02' }] };
    expect(scheduleForOccurrence(changed, confirmed.date, confirmed.scheduleIndex)?.amountCents).toBe(900);
    expect(scheduleForOccurrence(changed, '2026-12-02')?.amountCents).toBe(1000);
  });
  it('mantiene los confirmados en el mes previsto aunque cambie su fecha real, sin duplicarlos', () => {
    const item = template({ startDate: '2026-11-01', effectiveFrom: '2026-11-01' }), [pending] = pendingOccurrences([item], [], '2026-11');
    const confirmed: Movement = { ...pending, date: '2026-12-05', status: 'confirmed', amountCents: 9000 };
    expect(plannedMonthMovements([item], [confirmed], '2026-11')).toEqual([confirmed]);
    expect(pendingOccurrences([item], [confirmed], '2026-11')).toEqual([]);
    expect(dueOccurrences([item], [confirmed], '2026-11-19')).toEqual([]);
    expect(plannedMonthMovements([item], [confirmed], '2026-12').map(row => row.scheduledDate)).toEqual(['2026-12-02']);
  });
  it('muestra pendientes primero, excluye omitidos y movimientos manuales, y conserva pagos sin plantilla', () => {
    const item = template({ days: [2, 20] }), [first] = pendingOccurrences([item], [], '2026-11');
    const confirmed: Movement = { ...first, status: 'confirmed' };
    expect(plannedMonthMovements([item], [confirmed], '2026-11').map(row => row.status)).toEqual(['pending', 'confirmed']);
    expect(plannedMonthMovements([item], [{ ...first, status: 'skipped' }], '2026-11').map(row => row.date)).toEqual(['2026-11-20']);
    expect(plannedMonthMovements([], [confirmed], '2026-11')).toEqual([confirmed]);
    expect(plannedMonthMovements([], [{ ...confirmed, recurringId: undefined }], '2026-11')).toEqual([]);
    expect(plannedMonthMovements([item], [confirmed], '2026-13')).toEqual([]);
  });
  it('avisa desde la fecha prevista, conserva el aviso después y no avisa antes', () => {
    const item = template({ startDate: '2026-11-01', effectiveFrom: '2026-11-01', days: [20] });
    expect(dueOccurrences([item], [], '2026-11-19')).toEqual([]);
    expect(dueOccurrences([item], [], '2026-11-20').map(item => item.date)).toEqual(['2026-11-20']);
    expect(dueOccurrences([item], [], '2026-11-21').map(item => item.date)).toEqual(['2026-11-20']);
  });
  it('prioriza el mes atrasado más antiguo y avanza después de confirmar u omitir sus movimientos', () => {
    const item = template({ startDate: '2026-10-01', effectiveFrom: '2026-10-01', days: [2, 20] });
    const october = pendingOccurrences([item], [], '2026-10');
    expect(dueOccurrences([item], [], '2026-12-01').map(item => item.date)).toEqual(['2026-10-02', '2026-10-20']);
    const saved: Movement[] = october.map((row, index) => ({ ...row, status: index ? 'skipped' : 'confirmed' }));
    expect(dueOccurrences([item], saved, '2026-12-01').map(item => item.date)).toEqual(['2026-11-02', '2026-11-20']);
    const november: Movement[] = pendingOccurrences([item], saved, '2026-11').map(row => ({ ...row, status: 'confirmed' }));
    expect(dueOccurrences([item], [...saved, ...november], '2026-12-01')).toEqual([]);
  });
  it('incluye vencidos de configuraciones pausadas y no confunde el límite entre versiones', () => {
    const original = template({ days: [2, 19, 25] });
    const paused = { ...original, enabled: false, effectiveFrom: '2026-11-19', history: [{ ...recurringSchedule(original), effectiveUntil: '2026-11-19' }] };
    const saved = Array.from({ length: 10 }, (_, index) => pendingOccurrences([original], [], `2026-${String(index + 1).padStart(2, '0')}`).map(item => ({ ...item, status: 'confirmed' as const }))).flat();
    expect(dueOccurrences([paused], saved, '2026-12-01').map(item => item.date)).toEqual(['2026-11-02']);
    expect(dueOccurrences([template({ startDate: '2030-01-01', effectiveFrom: '2030-01-01' })], [], '2026-11-19')).toEqual([]);
  });
  it('incluye los límites y genera varias apariciones solo entre inicio y fin', () => {
    const item = template({ startDate: '2026-11-15', endDate: '2026-12-15', days: [1, 15, 25] });
    expect(pendingOccurrences([item], [], '2026-10')).toEqual([]);
    expect(pendingOccurrences([item], [], '2026-11').map(item => item.date)).toEqual(['2026-11-15', '2026-11-25']);
    expect(pendingOccurrences([item], [], '2026-12').map(item => item.date)).toEqual(['2026-12-01', '2026-12-15']);
    expect(pendingOccurrences([item], [], '2027-01')).toEqual([]);
  });
  it('ajusta los días 29, 30 y 31 sin duplicar el último día y contempla años bisiestos', () => {
    const item = template({ days: [28, 29, 30, 31] });
    expect(pendingOccurrences([item], [], '2027-02').map(item => item.date)).toEqual(['2027-02-28']);
    expect(pendingOccurrences([item], [], '2028-02').map(item => item.date)).toEqual(['2028-02-28', '2028-02-29']);
    expect(pendingOccurrences([item], [], '2026-04').map(item => item.date)).toEqual(['2026-04-28', '2026-04-29', '2026-04-30']);
  });
  it('no regenera confirmados ni omitidos aunque se cambie su fecha real', () => {
    const item = template(), [pending] = pendingOccurrences([item], [], '2026-11');
    for (const status of ['confirmed', 'skipped'] as const) {
      const saved: Movement = { ...pending, date: '2026-12-05', status };
      expect(pendingOccurrences([item], [saved], '2026-11')).toEqual([]);
      expect(pendingOccurrences([item], [saved], '2026-12')).toHaveLength(1);
    }
    expect(pendingOccurrences([item], [], '2026-11')[0].id).toBe(pending.id);
  });
  it('conserva los pendientes anteriores al editar o pausar y aplica cambios desde la fecha efectiva', () => {
    const original = template({ days: [2, 25] });
    const edited = template({ days: [5, 26], amountCents: 90000, effectiveFrom: '2026-11-19', history: [{ ...recurringSchedule(original), effectiveUntil: '2026-11-19' }] });
    expect(pendingOccurrences([edited], [], '2026-11').map(item => [item.date, item.amountCents])).toEqual([['2026-11-02', 85001], ['2026-11-26', 90000]]);
    const paused = { ...edited, enabled: false, effectiveFrom: '2026-11-20', history: [...edited.history, { ...recurringSchedule(edited), effectiveUntil: '2026-11-20' }] };
    expect(pendingOccurrences([paused], [], '2026-11').map(item => item.date)).toEqual(['2026-11-02']);
    expect(pendingOccurrences([paused], [], '2026-12')).toEqual([]);
    const resumed = { ...paused, enabled: true, effectiveFrom: '2026-12-10', history: [...paused.history, { ...recurringSchedule(paused), effectiveUntil: '2026-12-10' }] };
    expect(pendingOccurrences([resumed], [], '2026-12').map(item => item.date)).toEqual(['2026-12-26']);
  });
  it('excluye pendientes y omitidos de balances y deudas y conserva el reparto al confirmar', () => {
    const [pending] = pendingOccurrences([template()], [], '2026-11');
    expect(isConfirmed(pending)).toBe(false);
    expect(summarize([pending, { ...pending, status: 'skipped' }], ['a', 'b']).netCents).toBe(0);
    expect(calculateDebt([pending], [], ['a', 'b']).amountCents).toBe(0);
    const confirmed: Movement = { ...pending, status: 'confirmed' };
    expect(summarize([confirmed], ['a', 'b'], 'a').expenseCents).toBe(42501);
    expect(calculateDebt([confirmed], [], ['a', 'b']).amountCents).toBe(42500);
    expect(isConfirmed({ ...confirmed, status: undefined })).toBe(true);
  });
  it('rechaza fechas inexistentes y meses mal formados', () => {
    expect(validDate('2026-02-29')).toBe(false);
    expect(validDate('2028-02-29')).toBe(true);
    expect(validDate('2026-11-31')).toBe(false);
    expect(validDate('2026-13-01')).toBe(false);
    expect(validDate('')).toBe(false);
    expect(pendingOccurrences([template()], [], '2026-13')).toEqual([]);
  });
  it('al adelantar el inicio incluye los días que se acaban de incorporar al intervalo', () => {
    const original = template({ startDate: '2026-12-01', effectiveFrom: '2026-12-01', days: [2, 20] });
    const edited = { ...original, startDate: '2026-11-01', effectiveFrom: '2026-11-19', history: [{ ...recurringSchedule(original), effectiveUntil: '2026-11-19' }] };
    expect(pendingOccurrences([edited], [], '2026-11').map(item => item.date)).toEqual(['2026-11-02', '2026-11-20']);
  });
  it('recupera Netflix del día 2 al corregir el inicio del 19 al 1 de noviembre', () => {
    const original = template({ concept: 'Netflix', startDate: '2026-11-19', effectiveFrom: '2026-11-19' });
    const edited = { ...original, startDate: '2026-11-01', history: [{ ...recurringSchedule(original), effectiveUntil: '2026-11-19' }] };
    expect(pendingOccurrences([original], [], '2026-11')).toEqual([]);
    const rows = pendingOccurrences([edited], [], '2026-11');
    expect(rows.map(item => item.date)).toEqual(['2026-11-02']);
    expect(dueOccurrences([edited], [], '2026-11-19').map(item => item.date)).toEqual(['2026-11-02']);
    expect(pendingOccurrences([edited], [{ ...rows[0], status: 'confirmed' }], '2026-11')).toEqual([]);
    expect(pendingOccurrences([edited], [{ ...rows[0], status: 'skipped' }], '2026-11')).toEqual([]);
    expect(pendingOccurrences([edited], [], '2026-12').map(item => item.date)).toEqual(['2026-12-02']);
  });
  it('conserva el importe del período ampliado tras editar otra vez o pausar', () => {
    const original = template({ startDate: '2026-11-19', effectiveFrom: '2026-11-19', amountCents: 900 });
    const corrected = { ...original, startDate: '2026-11-01', history: [{ ...recurringSchedule(original), effectiveUntil: '2026-11-19' }] };
    const changed = { ...corrected, amountCents: 1000, effectiveFrom: '2026-11-20', history: [...corrected.history, { ...recurringSchedule(corrected), effectiveUntil: '2026-11-20' }] };
    expect(pendingOccurrences([changed], [], '2026-11').map(item => [item.date, item.amountCents])).toEqual([['2026-11-02', 900]]);
    expect(scheduleForOccurrence(changed, '2026-11-02')?.amountCents).toBe(900);
    expect(scheduleForOccurrence(changed, '2026-12-02')?.amountCents).toBe(1000);
    expect(pendingOccurrences([changed], [], '2026-12').map(item => item.amountCents)).toEqual([1000]);
    const paused = { ...changed, enabled: false, history: [...changed.history, { ...recurringSchedule(changed), effectiveUntil: '2026-11-20' }] };
    expect(pendingOccurrences([paused], [], '2026-11').map(item => [item.date, item.amountCents])).toEqual([['2026-11-02', 900]]);
    expect(pendingOccurrences([paused], [], '2026-12')).toEqual([]);
  });
});

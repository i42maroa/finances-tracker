import { Movement, RecurringMovement, RecurringSchedule } from '../models/models';

export function validDate(value: string): boolean {
  return /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/.test(value)
    && new Date(`${value}T12:00:00Z`).toISOString().slice(0, 10) === value;
}

export function recurringSchedule(value: RecurringSchedule): RecurringSchedule {
  const { type, amountCents, concept, description, categoryId, subcategoryId, space, ownerId, actorId, payment, startDate, endDate, days, enabled, effectiveFrom } = value;
  return { type, amountCents, concept, description, categoryId, subcategoryId, space, ownerId, actorId, payment, startDate, endDate, days: [...days], enabled, effectiveFrom };
}

// Moving the start backwards adds the newly included dates using that revision's settings.
// Keep this interval in the version history so later edits and pauses still preserve those occurrences.
const schedulesCache = new WeakMap<RecurringMovement, (RecurringSchedule & { effectiveUntil: string; scheduleIndex: number })[]>();
export function occurrenceSchedules(template: RecurringMovement) {
  const cached = schedulesCache.get(template);
  if (cached) return cached;
  const versions = [...template.history, { ...recurringSchedule(template), effectiveUntil: '' }];
  let earliestStart = versions[0].startDate;
  const schedules = versions.flatMap((value, scheduleIndex) => {
    const schedule = { ...value, scheduleIndex };
    if (schedule.startDate >= earliestStart) return [schedule];
    const effectiveUntil = schedule.effectiveUntil && schedule.effectiveUntil < earliestStart ? schedule.effectiveUntil : earliestStart;
    earliestStart = schedule.startDate;
    return [{ ...schedule, effectiveFrom: schedule.startDate, effectiveUntil }, schedule];
  });
  schedulesCache.set(template, schedules);
  return schedules;
}

export function scheduleForOccurrence(template: RecurringMovement, date: string, scheduleIndex?: number) {
  if (scheduleIndex !== undefined && Number.isInteger(scheduleIndex) && scheduleIndex >= 0 && scheduleIndex <= template.history.length)
    return template.history[scheduleIndex] || template;
  const last = new Date(`${date.slice(0, 7)}-01T12:00:00Z`); last.setUTCMonth(last.getUTCMonth() + 1, 0);
  return occurrenceSchedules(template).filter(schedule => schedule.enabled && date >= schedule.startDate && (!schedule.endDate || date <= schedule.endDate)
    && date >= schedule.effectiveFrom && (!schedule.effectiveUntil || date < schedule.effectiveUntil)
    && schedule.days.some(day => Math.min(day, last.getUTCDate()) === Number(date.slice(8)))).at(-1);
}

// Pending occurrences are derived, never charged automatically. Stable IDs make confirmation idempotent.
export function pendingOccurrences(templates: RecurringMovement[], saved: Movement[], month: string, occupied: ReadonlySet<string> = new Set(saved.map(item => item.id))): Movement[] {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return [];
  const lastDay = new Date(`${month}-01T12:00:00Z`);
  lastDay.setUTCMonth(lastDay.getUTCMonth() + 1, 0);
  const result = new Map<string, Movement>();
  for (const template of templates) {
    for (const schedule of occurrenceSchedules(template)) {
      if (!schedule.enabled) continue;
      const days = new Set(schedule.days.map(day => Math.min(day, lastDay.getUTCDate())));
      for (const day of days) {
        const date = `${month}-${String(day).padStart(2, '0')}`;
        if (date < schedule.startDate || schedule.endDate && date > schedule.endDate
          || date < schedule.effectiveFrom || schedule.effectiveUntil && date >= schedule.effectiveUntil) continue;
        const id = `recurring-${template.id}-${date}`;
        if (occupied.has(id)) continue;
        result.set(id, {
          id, type: schedule.type, amountCents: schedule.amountCents, concept: schedule.concept,
          description: schedule.description, categoryId: schedule.categoryId, subcategoryId: schedule.subcategoryId,
          space: schedule.space, ownerId: schedule.ownerId, actorId: schedule.actorId, payment: schedule.payment,
          date, scheduledDate: date, recurringId: template.id, status: 'pending', scheduleIndex: schedule.scheduleIndex,
          createdBy: template.createdBy, createdAt: template.createdAt, updatedAt: template.updatedAt
        });
      }
    }
  }
  return [...result.values()].sort((a, b) => a.date.localeCompare(b.date) || a.concept.localeCompare(b.concept));
}

export function isConfirmed(item: Movement): boolean { return !item.status || item.status === 'confirmed'; }

export function plannedMonthMovements(templates: RecurringMovement[], saved: Movement[], month: string, occupied: ReadonlySet<string> = new Set(saved.map(item=>item.id))): Movement[] {
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return [];
  const confirmed = saved.filter(item => !!item.recurringId && isConfirmed(item) && (item.scheduledDate || item.date).startsWith(`${month}-`));
  return [...pendingOccurrences(templates, saved, month, occupied), ...confirmed].sort((a, b) =>
    Number(isConfirmed(a)) - Number(isConfirmed(b))
    || (a.scheduledDate || a.date).localeCompare(b.scheduledDate || b.date) || a.concept.localeCompare(b.concept));
}

// Find the oldest month needing attention. Advance past settled months without materializing years of future rows.
export function dueOccurrences(templates: RecurringMovement[], saved: Movement[], today: string): Movement[] {
  const occupied = new Set(saved.map(item => item.id));
  let firstMonth = '';
  for (const template of templates) {
    for (const schedule of occurrenceSchedules(template)) {
      if (!schedule.enabled) continue;
      const start = schedule.startDate > schedule.effectiveFrom ? schedule.startDate : schedule.effectiveFrom;
      const end = [today, schedule.endDate || today, schedule.effectiveUntil || today].sort()[0];
      if (start > end || schedule.effectiveUntil && start >= schedule.effectiveUntil) continue;
      let month = start.slice(0, 7);
      while (month <= end.slice(0, 7) && (!firstMonth || month < firstMonth)) {
        if (pendingOccurrences([template], saved, month, occupied).some(item => item.date >= start && item.date <= end && (!schedule.effectiveUntil || item.date < schedule.effectiveUntil))) {
          firstMonth = month;
          break;
        }
        const next = Number(month.slice(0, 4)) * 12 + Number(month.slice(5));
        month = `${String(Math.floor(next / 12)).padStart(4, '0')}-${String(next % 12 + 1).padStart(2, '0')}`;
      }
    }
  }
  return firstMonth ? pendingOccurrences(templates, saved, firstMonth, occupied).filter(item => item.date <= today) : [];
}

export type MovementType = 'income' | 'expense';
export type Space = 'individual' | 'shared';
export type MovementSort = 'date-desc' | 'date-asc' | 'amount-desc' | 'amount-asc';
export interface MovementFilters { name: string; minCents: number | null; maxCents: number | null; createdBy: string; sort: MovementSort; recurringExpenses?: boolean; }
export interface Profile { uid: string; name: string; email: string; coupleId: string | null; }
export interface Couple { id: string; memberIds: string[]; memberNames: Record<string, string>; inviteCode: string; createdAt: string; }
export interface Category { revision?: number; id: string; name: string; type: MovementType; icon: string; archived: boolean; parentId?: string; defaultSubcategoryId?: string; }
export interface Movement {
  id: string; type: MovementType; amountCents: number; date: string; concept: string; description?: string;
  categoryId: string; subcategoryId?: string; space: Space; ownerId: string; actorId: string; payment: 'single' | 'half';
  revision?: number; scheduleIndex?: number; createdBy: string; createdAt: string; updatedAt: string;
  recurringId?: string; scheduledDate?: string; status?: 'pending' | 'confirmed' | 'skipped';
}
export interface RecurringSchedule {
  type: MovementType; amountCents: number; concept: string; description: string;
  categoryId: string; subcategoryId: string; space: Space; ownerId: string; actorId: string; payment: 'single' | 'half';
  startDate: string; endDate: string; days: number[]; enabled: boolean; effectiveFrom: string;
}
export interface RecurringHistory extends RecurringSchedule { effectiveUntil: string; }
export interface RecurringMovement extends RecurringSchedule {
  id: string; createdBy: string; createdAt: string; updatedAt: string; revision: number; history: RecurringHistory[];
}
export interface Settlement { revision?: number; id: string; amountCents: number; date: string; fromId: string; toId: string; note: string; createdBy: string; createdAt: string; updatedAt: string; }
export interface HouseholdData { couple: Couple; categories: Category[]; movements: Movement[]; settlements: Settlement[]; recurringMovements?: RecurringMovement[]; }
export interface Summary { incomeCents: number; expenseCents: number; netCents: number; }
export interface Debt { amountCents: number; fromId: string | null; toId: string | null; }
export type ModalState = { kind: 'movement'; value?: Movement; confirmRecurring?: boolean } | { kind: 'recurring'; value?: RecurringMovement } | { kind: 'settlement'; value?: Settlement } | { kind: 'category'; value?: Category; parentId?: string } | { kind: 'movement-filters'; showAuthor: boolean; value: MovementFilters; apply: (filters: MovementFilters) => void } | { kind: 'delete'; collection: 'movements' | 'settlements' | 'categories'; id: string; label: string };
export interface FirebaseConfig { apiKey: string; authDomain: string; projectId: string; appId: string; storageBucket?: string; messagingSenderId?: string; measurementId?: string; useEmulators?: boolean; }

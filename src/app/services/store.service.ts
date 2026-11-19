import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { collection, deleteDoc, doc, onSnapshot, setDoc, Unsubscribe, query, or, where, runTransaction } from 'firebase/firestore';
import { Category, Couple, HouseholdData, Movement, Settlement, RecurringMovement } from '../models/models';
import { pendingOccurrences } from './recurring';
import { AuthService } from './auth.service';
import { FirebaseService } from './firebase.service';
import { createDemo, defaultCategories, updateDemoMovements } from './demo';
import { errorMessage } from './errors';

@Injectable({ providedIn: 'root' })
export class StoreService {
  private auth = inject(AuthService);
  private firebase = inject(FirebaseService);
  couple = signal<Couple | null>(null);
  categories = signal<Category[]>([]);
  movements = signal<Movement[]>([]);
  settlements = signal<Settlement[]>([]);
  recurringMovements = signal<RecurringMovement[]>([]);
  loading = signal(false);
  error = signal('');
  private profileUnsubscribe?: Unsubscribe;
  private subscriptions: Unsubscribe[] = [];
  private revision = signal(0);
  private demoAllMovements: Movement[] = [];
  private demoAllRecurring: RecurringMovement[] = [];
  private canAccess(value: Pick<Movement, 'space' | 'ownerId'>): boolean { return value.space === 'shared' || value.ownerId === this.auth.user()?.uid; }
  constructor() {
    effect(() => {
      const user = this.auth.user(), demo = this.auth.demo();
      this.revision();
      untracked(() => {
      this.profileUnsubscribe?.(); this.clear();
      if (!user) return;
      if (demo) { this.loadDemo(); return; }
      const db = this.firebase.db;
      if (!db) return;
      this.loading.set(true);
      this.profileUnsubscribe = onSnapshot(doc(db, 'users', user.uid), snapshot => {
        const coupleId = snapshot.data()?.['coupleId'] as string | undefined;
        if (coupleId) this.subscribe(coupleId);
        else { this.clear(); }
      }, error => { this.error.set(errorMessage(error)); this.loading.set(false); });
      });
    });
    window.addEventListener('storage', event => {
      if (event.key === 'hucha-demo-v1' && this.auth.demo()) this.loadDemo();
    });
  }
  retry(): void { this.revision.update(value => value + 1); }
  private clear(): void {
    this.subscriptions.forEach(unsubscribe => unsubscribe()); this.subscriptions = [];
    this.couple.set(null); this.categories.set([]); this.movements.set([]); this.settlements.set([]);
    this.recurringMovements.set([]); this.demoAllMovements = []; this.demoAllRecurring = [];
    this.loading.set(false); this.error.set('');
  }
  private loadDemo(): void {
    try {
      const stored = localStorage.getItem('hucha-demo-v1');
      const data = stored ? JSON.parse(stored) as HouseholdData : createDemo();
      const missing = defaultCategories().filter(category => !data.categories.some(item => item.id === category.id));
      data.categories.push(...missing);
      const demoUpdated = updateDemoMovements(data);
      this.demoAllMovements = data.movements;
      this.demoAllRecurring = data.recurringMovements || [];
      this.recurringMovements.set(this.demoAllRecurring.filter(value => this.canAccess(value)));
      this.couple.set(data.couple); this.categories.set(data.categories); this.movements.set(data.movements.filter(value => this.canAccess(value))); this.settlements.set(data.settlements);
      if (!stored || missing.length || demoUpdated) this.persistDemo();
    } catch { this.error.set('No se pudo leer la demostración. Comprueba el almacenamiento del navegador.'); }
  }
  private subscribe(coupleId: string): void {
    this.subscriptions.forEach(unsubscribe => unsubscribe()); this.subscriptions = [];
    const db = this.firebase.db!;
    const pending = new Set(['couple', 'categories', 'movements', 'settlements', 'recurringMovements']);
    const loaded = (key: string) => { pending.delete(key); if (!pending.size) this.loading.set(false); };
    const failed = (error: unknown) => { this.error.set(errorMessage(error)); this.loading.set(false); };
    this.loading.set(true);
    this.subscriptions.push(onSnapshot(doc(db, 'couples', coupleId), snapshot => {
      if (!snapshot.exists()) { failed(new Error('No se encontró el espacio de pareja.')); return; }
      this.couple.set({ ...snapshot.data(), id: snapshot.id } as Couple); loaded('couple');
    }, failed));
    let categoriesSeeded = false;
    this.subscriptions.push(onSnapshot(collection(db, 'couples', coupleId, 'categories'), snapshot => {
      this.categories.set(snapshot.docs.map(item => ({ ...item.data(), id: item.id }) as Category));
      if (!categoriesSeeded) {
        categoriesSeeded = true;
        void runTransaction(db, async transaction => {
          const defaults = defaultCategories();
          const refs = defaults.map(category => doc(db, 'couples', coupleId, 'categories', category.id));
          const existing = await Promise.all(refs.map(ref => transaction.get(ref)));
          defaults.forEach((category, index) => { if (!existing[index].exists()) transaction.set(refs[index], category); });
        }).then(() => loaded('categories')).catch(failed);
      } else loaded('categories');
    }, failed));
    this.subscriptions.push(onSnapshot(query(collection(db, 'couples', coupleId, 'movements'), or(where('space', '==', 'shared'), where('ownerId', '==', this.auth.user()!.uid))), snapshot => { this.movements.set(snapshot.docs.map(item => ({ ...item.data(), id: item.id }) as Movement)); loaded('movements'); }, failed));
    this.subscriptions.push(onSnapshot(collection(db, 'couples', coupleId, 'settlements'), snapshot => { this.settlements.set(snapshot.docs.map(item => ({ ...item.data(), id: item.id }) as Settlement)); loaded('settlements'); }, failed));
    this.subscriptions.push(onSnapshot(query(collection(db, 'couples', coupleId, 'recurringMovements'), or(where('space', '==', 'shared'), where('ownerId', '==', this.auth.user()!.uid))), snapshot => { this.recurringMovements.set(snapshot.docs.map(item => ({ ...item.data(), id: item.id }) as RecurringMovement)); loaded('recurringMovements'); }, failed));
  }
  private persistDemo(): void {
    const data: HouseholdData = { couple: this.couple()!, categories: this.categories(), movements: [...this.demoAllMovements.filter(value => !this.canAccess(value)), ...this.movements()], settlements: this.settlements(), recurringMovements: [...this.demoAllRecurring.filter(value => !this.canAccess(value)), ...this.recurringMovements()] };
    localStorage.setItem('hucha-demo-v1', JSON.stringify(data));
    this.demoAllMovements = data.movements;
    this.demoAllRecurring = data.recurringMovements!;
  }
  async saveRecurring(value: RecurringMovement): Promise<void> {
    if (!this.couple()) throw new Error('Primero crea o vincula vuestra pareja.');
    const check = (previous?: RecurringMovement) => {
      if (!this.canAccess(value) || previous && !this.canAccess(previous)) throw new Error('No tienes acceso a esta recurrencia.');
      if ((previous?.revision || 0) !== value.revision - 1) throw new Error('La recurrencia ha cambiado. Vuelve a abrirla antes de guardar.');
    };
    if (this.auth.demo()) {
      check(this.demoAllRecurring.find(item => item.id === value.id));
      const previous = this.recurringMovements();
      this.recurringMovements.set([...previous.filter(item => item.id !== value.id), value]);
      try { this.persistDemo(); } catch (error) { this.recurringMovements.set(previous); throw error; }
    } else {
      const db = this.firebase.db!, ref = doc(db, 'couples', this.couple()!.id, 'recurringMovements', value.id);
      await runTransaction(db, async transaction => {
        const snapshot = await transaction.get(ref);
        check(snapshot.exists() ? snapshot.data() as RecurringMovement : undefined);
        transaction.set(ref, value);
      });
    }
  }
  async saveOccurrence(value: Movement): Promise<void> {
    if (!this.couple() || !value.recurringId || !value.scheduledDate) throw new Error('La recurrencia no está disponible.');
    const check = (template: RecurringMovement | undefined) => {
      if (!template || !this.canAccess(template)) throw new Error('La recurrencia no está disponible.');
      const pending = pendingOccurrences([template], [], value.scheduledDate!.slice(0, 7)).find(item => item.id === value.id);
      if (!pending || pending.updatedAt !== value.updatedAt) throw new Error('La recurrencia ha cambiado. Revisa de nuevo el pendiente.');
    };
    const saved = { ...value, createdBy: this.auth.user()!.uid, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    if (this.auth.demo()) {
      const existing = this.demoAllMovements.find(item => item.id === value.id);
      if (existing) { if (!this.canAccess(existing)) throw new Error('No tienes acceso a este movimiento.'); return; }
      check(this.recurringMovements().find(item => item.id === value.recurringId));
      await this.save('movements', saved);
    } else {
      const db = this.firebase.db!, cid = this.couple()!.id;
      const ref = doc(db, 'couples', cid, 'movements', value.id);
      await runTransaction(db, async transaction => {
        const existing = await transaction.get(ref);
        if (existing.exists()) return;
        const template = await transaction.get(doc(db, 'couples', cid, 'recurringMovements', value.recurringId!));
        check(template.exists() ? template.data() as RecurringMovement : undefined);
        transaction.set(ref, saved);
      });
    }
  }
  async save(collectionName: 'movements' | 'settlements' | 'categories', value: Movement | Settlement | Category): Promise<void> {
    const couple = this.couple();
    if (!couple) throw new Error('Primero crea o vincula vuestra pareja.');
    if (this.auth.demo()) {
      if (collectionName === 'movements') {
        const previous = this.demoAllMovements.find(item => item.id === value.id);
        if (!this.canAccess(value as Movement) || previous && !this.canAccess(previous)) throw new Error('No tienes acceso a este movimiento individual.');
      }
      const state = this[collectionName] as { (): (Movement | Settlement | Category)[]; set(value: (Movement | Settlement | Category)[]): void };
      const previous = state();
      state.set([...previous.filter(item => item.id !== value.id), value]);
      try { this.persistDemo(); } catch (error) { state.set(previous); throw error; }
    } else await setDoc(doc(this.firebase.db!, 'couples', couple.id, collectionName, value.id), value);
  }
  async saveCategories(values: Category[]): Promise<void> {
    if (!this.couple()) throw new Error('Primero vincula vuestra pareja.');
    if (this.auth.demo()) {
      const previous = this.categories();
      this.categories.set([...previous.filter(item => !values.some(value => value.id === item.id)), ...values]);
      try { this.persistDemo(); } catch (error) { this.categories.set(previous); throw error; }
    } else {
      const { saveCategoryBatch } = await import('./category-batch');
      await saveCategoryBatch(this.firebase.db!, this.couple()!.id, values);
    }
  }
  async remove(collectionName: 'movements' | 'settlements', id: string): Promise<void> {
    const occurrence = collectionName === 'movements' ? this.movements().find(item => item.id === id && item.recurringId) : undefined;
    if (occurrence) { await this.save('movements', { ...occurrence, status: 'skipped', updatedAt: new Date().toISOString() }); return; }
    if (this.auth.demo()) {
      if (collectionName === 'movements' && this.demoAllMovements.some(value => value.id === id && !this.canAccess(value))) throw new Error('No tienes acceso a este movimiento individual.');
      const state = this[collectionName] as { (): (Movement | Settlement)[]; set(value: (Movement | Settlement)[]): void };
      const previous = state(); state.set(previous.filter(item => item.id !== id));
      try { this.persistDemo(); } catch (error) { state.set(previous); throw error; }
    } else await deleteDoc(doc(this.firebase.db!, 'couples', this.couple()!.id, collectionName, id));
  }
}

import { Injectable, effect, inject, signal, untracked } from '@angular/core';
import { collection, deleteDoc, doc, onSnapshot, setDoc, Unsubscribe, query, or, where, runTransaction } from 'firebase/firestore';
import { Category, Couple, HouseholdData, Movement, Settlement } from '../models/models';
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
  loading = signal(false);
  error = signal('');
  private profileUnsubscribe?: Unsubscribe;
  private subscriptions: Unsubscribe[] = [];
  private revision = signal(0);
  private demoAllMovements: Movement[] = [];
  private canAccess(value: Movement): boolean { return value.space === 'shared' || value.ownerId === this.auth.user()?.uid; }
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
      this.couple.set(data.couple); this.categories.set(data.categories); this.movements.set(data.movements.filter(value => this.canAccess(value))); this.settlements.set(data.settlements);
      if (!stored || missing.length || demoUpdated) this.persistDemo();
    } catch { this.error.set('No se pudo leer la demostración. Comprueba el almacenamiento del navegador.'); }
  }
  private subscribe(coupleId: string): void {
    this.subscriptions.forEach(unsubscribe => unsubscribe()); this.subscriptions = [];
    const db = this.firebase.db!;
    const pending = new Set(['couple', 'categories', 'movements', 'settlements']);
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
  }
  private persistDemo(): void {
    const data: HouseholdData = { couple: this.couple()!, categories: this.categories(), movements: [...this.demoAllMovements.filter(value => !this.canAccess(value)), ...this.movements()], settlements: this.settlements() };
    localStorage.setItem('hucha-demo-v1', JSON.stringify(data));
    this.demoAllMovements = data.movements;
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
    if (this.auth.demo()) {
      if (collectionName === 'movements' && this.demoAllMovements.some(value => value.id === id && !this.canAccess(value))) throw new Error('No tienes acceso a este movimiento individual.');
      const state = this[collectionName] as { (): (Movement | Settlement)[]; set(value: (Movement | Settlement)[]): void };
      const previous = state(); state.set(previous.filter(item => item.id !== id));
      try { this.persistDemo(); } catch (error) { state.set(previous); throw error; }
    } else await deleteDoc(doc(this.firebase.db!, 'couples', this.couple()!.id, collectionName, id));
  }
}

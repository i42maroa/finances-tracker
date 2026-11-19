import { Injectable, inject } from '@angular/core';
import { arrayUnion, doc, runTransaction } from 'firebase/firestore';
import { AuthService } from './auth.service';
import { FirebaseService } from './firebase.service';
import { defaultCategories } from './demo';

@Injectable({ providedIn: 'root' })
export class CoupleService {
  private auth = inject(AuthService);
  private firebase = inject(FirebaseService);
  async create(): Promise<void> {
    const db = this.firebase.db!, user = this.auth.user()!;
    const id = crypto.randomUUID();
    const code = Array.from(crypto.getRandomValues(new Uint8Array(10)), byte => byte.toString(16).padStart(2, '0')).join('').toUpperCase();
    await runTransaction(db, async transaction => {
      const profile = await transaction.get(doc(db, 'users', user.uid));
      if (profile.data()?.['coupleId']) throw new Error('Tu cuenta ya pertenece a una pareja.');
      transaction.set(doc(db, 'couples', id), { memberIds: [user.uid], memberNames: { [user.uid]: user.name }, inviteCode: code, createdAt: new Date().toISOString() });
      transaction.set(doc(db, 'invites', code), { coupleId: id, createdBy: user.uid, expiresAt: new Date(Date.now() + 7 * 86400000), ownerName: user.name });
      transaction.set(doc(db, 'users', user.uid), { ...user, coupleId: id });
      for (const category of defaultCategories()) transaction.set(doc(db, 'couples', id, 'categories', category.id), category);
    });
  }
  async join(rawCode: string): Promise<void> {
    const db = this.firebase.db!, user = this.auth.user()!, code = rawCode.replace(/[\s-]/g, '').toUpperCase();
    await runTransaction(db, async transaction => {
      const profile = await transaction.get(doc(db, 'users', user.uid));
      const invitation = await transaction.get(doc(db, 'invites', code));
      if (profile.data()?.['coupleId']) throw new Error('Tu cuenta ya pertenece a una pareja.');
      if (!invitation.exists() || invitation.data()['expiresAt'].toMillis() < Date.now()) throw new Error('El código no existe o ha caducado.');
      const coupleId = invitation.data()['coupleId'] as string;
      if (invitation.data()['createdBy'] === user.uid) throw new Error('Este código es tuyo. Compártelo con tu pareja.');
      transaction.update(doc(db, 'couples', coupleId), { memberIds: arrayUnion(user.uid), [`memberNames.${user.uid}`]: user.name });
      transaction.set(doc(db, 'users', user.uid), { ...user, coupleId });
      transaction.delete(doc(db, 'invites', code));
    });
  }
  async renewInvite(coupleId: string, oldCode: string): Promise<void> {
    const db = this.firebase.db!, user = this.auth.user()!;
    const code = crypto.randomUUID().replace(/-/g, '').slice(0, 20).toUpperCase();
    await runTransaction(db, async transaction => {
      const couple = await transaction.get(doc(db, 'couples', coupleId));
      if (couple.data()?.['memberIds'].length !== 1) throw new Error('La pareja ya está completa.');
      transaction.update(doc(db, 'couples', coupleId), { inviteCode: code });
      transaction.delete(doc(db, 'invites', oldCode));
      transaction.set(doc(db, 'invites', code), { coupleId, createdBy: user.uid, ownerName: user.name, expiresAt: new Date(Date.now() + 7 * 86400000) });
    });
  }
}

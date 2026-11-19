import { Injectable, inject, signal } from '@angular/core';
import { GoogleAuthProvider, createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signInWithPopup, signOut, updateProfile } from 'firebase/auth';
import { Profile } from '../models/models';
import { FirebaseService } from './firebase.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private firebase = inject(FirebaseService);
  user = signal<Profile | null>(null);
  ready = signal(false);
  demo = signal(false);
  async initialize(): Promise<void> {
    try { await this.firebase.initialize(); }
    finally {
      if (!this.firebase.auth) this.ready.set(true);
    }
    if (this.firebase.auth) onAuthStateChanged(this.firebase.auth, user => {
      this.user.set(user ? { uid: user.uid, name: user.displayName || user.email?.split('@')[0] || 'Miembro', email: user.email || '', coupleId: null } : null);
      this.ready.set(true);
    });
  }
  async email(email: string, password: string, name?: string): Promise<void> {
    if (!this.firebase.auth) throw new Error('Configura Firebase para acceder con una cuenta real. Puedes explorar la demostración.');
    if (name) {
      const result = await createUserWithEmailAndPassword(this.firebase.auth, email, password);
      await updateProfile(result.user, { displayName: name });
      this.user.update(user => user ? { ...user, name } : null);
    } else await signInWithEmailAndPassword(this.firebase.auth, email, password);
  }
  async google(): Promise<void> {
    if (!this.firebase.auth) throw new Error('Configura Firebase para utilizar el acceso con Google.');
    await signInWithPopup(this.firebase.auth, new GoogleAuthProvider());
  }
  enterDemo(): void {
    this.demo.set(true);
    this.user.set({ uid: 'antonio', name: 'Antonio', email: 'demo@hucha.local', coupleId: 'demo' });
  }
  async logout(): Promise<void> {
    if (this.firebase.auth && !this.demo()) await signOut(this.firebase.auth);
    this.user.set(null);
    this.demo.set(false);
  }
}

import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
import { Auth, connectAuthEmulator, getAuth } from 'firebase/auth';
import { Firestore, connectFirestoreEmulator, initializeFirestore, memoryLocalCache, persistentLocalCache, persistentMultipleTabManager } from 'firebase/firestore';
import { FirebaseConfig } from '../models/models';
import { environment } from '../../environments/environment';

@Injectable({ providedIn: 'root' })
export class FirebaseService {
  auth: Auth | null = null;
  db: Firestore | null = null;
  async initialize(): Promise<void> {
    const response = await fetch(environment.firebaseConfigUrl, { cache: 'no-store' });
    if (!response.ok) throw new Error('No se pudo leer la configuración de Firebase.');
    const config = await response.json() as FirebaseConfig;
    if (config.useEmulators && !environment.allowEmulators) throw new Error('El entorno de producción no permite conectar con emuladores.');
    if (!config.apiKey || !config.projectId || !config.authDomain || !config.appId) return;
    const app = initializeApp(config);
    this.auth = getAuth(app);
    try { this.db = initializeFirestore(app, { localCache: config.useEmulators ? memoryLocalCache() : persistentLocalCache({ tabManager: persistentMultipleTabManager() }) }); }
    catch { this.db = initializeFirestore(app, { localCache: memoryLocalCache() }); }
    if (config.useEmulators) {
      connectAuthEmulator(this.auth, 'http://127.0.0.1:9099');
      connectFirestoreEmulator(this.db, '127.0.0.1', 8080);
    }
  }
}

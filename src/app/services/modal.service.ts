import { Injectable, signal } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { ModalState, Space } from '../models/models';
@Injectable({ providedIn: 'root' })
export class ModalService {
  private visibility = new BehaviorSubject(false);
  readonly showModal$: Observable<boolean> = this.visibility.asObservable();
  state = signal<ModalState | null>(null);
  movementSpace = signal<Space>('shared');
  busy = signal(false);
  open(state: ModalState): void { this.state.set(state); this.visibility.next(true); }
  close(): void { if (this.busy()) return; this.visibility.next(false); this.state.set(null); }
}

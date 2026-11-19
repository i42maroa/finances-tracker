import { Component, inject, input, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CoupleService } from '../../services/couple.service';
import { StoreService } from '../../services/store.service';
import { AuthService } from '../../services/auth.service';
import { errorMessage } from '../../services/errors';
import { SkeletonComponent } from '../../shared/skeleton/skeleton';
import { BreadcrumbComponent } from '../../shared/breadcrumb/breadcrumb';
@Component({ selector: 'app-couple', imports: [ReactiveFormsModule, SkeletonComponent, BreadcrumbComponent], templateUrl: './couple.html', styleUrl: './couple.css' })
export class CoupleComponent {
  embedded = input(false);
  store = inject(StoreService); auth = inject(AuthService); private service = inject(CoupleService);
  busy = signal(false); error = signal(''); copied = signal(false);
  form = inject(FormBuilder).nonNullable.group({ code: ['', [Validators.required, Validators.pattern(/^[a-fA-F0-9\s-]{20,30}$/)]] });
  async action(kind: 'create' | 'join' | 'renew'): Promise<void> {
    if (this.busy()) return;
    this.error.set('');
    if (kind === 'join' && this.form.invalid) { this.error.set('Introduce el código de 20 caracteres que te ha compartido tu pareja.'); return; }
    this.busy.set(true);
    try {
      if (kind === 'create') await this.service.create();
      else if (kind === 'join') await this.service.join(this.form.controls.code.value);
      else { await this.service.renewInvite(this.store.couple()!.id, this.store.couple()!.inviteCode); this.copied.set(false); }
    } catch (error) { this.error.set(errorMessage(error)); }
    finally { this.busy.set(false); }
  }
  async copy(): Promise<void> {
    try { await navigator.clipboard.writeText(this.store.couple()!.inviteCode); this.copied.set(true); }
    catch { this.error.set('No se pudo copiar. Puedes seleccionar el código y copiarlo manualmente.'); }
  }
}

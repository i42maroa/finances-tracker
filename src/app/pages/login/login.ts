import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { FirebaseService } from '../../services/firebase.service';
import { errorMessage } from '../../services/errors';
import { SkeletonComponent } from '../../shared/skeleton/skeleton';
@Component({ selector: 'app-login', imports: [ReactiveFormsModule, SkeletonComponent], templateUrl: './login.html', styleUrl: './login.css' })
export class LoginComponent {
  auth = inject(AuthService); firebase = inject(FirebaseService);
  register = signal(false); busy = signal(false); error = signal('');
  form = inject(FormBuilder).nonNullable.group({ name: ['', Validators.maxLength(40)], email: ['', [Validators.required, Validators.email]], password: ['', [Validators.required, Validators.minLength(8)]] });
  async submit(google = false): Promise<void> {
    if (this.busy()) return;
    this.error.set('');
    if (!google && (this.form.invalid || this.register() && !this.form.controls.name.value.trim())) { this.form.markAllAsTouched(); this.error.set('Introduce un correo válido, una contraseña de al menos 8 caracteres y tu nombre si creas una cuenta.'); return; }
    this.busy.set(true);
    try {
      const value = this.form.getRawValue();
      if (google) await this.auth.google();
      else await this.auth.email(value.email.trim(), value.password, this.register() ? value.name.trim() : undefined);
    } catch (error) { this.error.set(errorMessage(error)); }
    finally { this.busy.set(false); }
  }
}

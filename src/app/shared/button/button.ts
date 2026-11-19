import { Component, input } from '@angular/core';
@Component({
  selector: 'button[appButton]', templateUrl: './button.html', styleUrl: './button.css',
  host: { class: 'button', '[class.secondary]': 'variant() === "secondary"', '[class.danger]': 'variant() === "danger"' }
})
export class ButtonComponent { variant = input<'primary' | 'secondary' | 'danger'>('primary'); }

import { Component, inject, input } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ViewService } from '../../services/view.service';
@Component({ selector: 'app-filters', imports: [ReactiveFormsModule], templateUrl: './filters.html', styleUrl: './filters.css' })
export class FiltersComponent {
  lockPeriod = input(false);
  dateRange = input(true);
  extraFilters = input(true);
  view = inject(ViewService);
  form = inject(FormBuilder).nonNullable.group({ year: this.view.year(), month: this.view.month(), scope: this.view.scope(), category: this.view.category(), from: this.view.from(), to: this.view.to() });
  update(): void {
    const value = this.form.getRawValue();
    if (!this.lockPeriod() && value.month) this.view.month.set(value.month);
    if (!this.lockPeriod() && Number.isInteger(value.year) && value.year >= 1000 && value.year <= 9999) this.view.year.set(value.year);
    this.view.scope.set(value.scope); this.view.category.set(value.category); this.view.from.set(value.from); this.view.to.set(value.to);
  }
  setScope(scope: 'shared' | 'personal'): void { this.form.controls.scope.setValue(scope); this.update(); }
}

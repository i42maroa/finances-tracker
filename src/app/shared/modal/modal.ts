import { AfterViewInit, Component, ElementRef, ViewChild, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ModalService } from '../../services/modal.service';
import { StoreService } from '../../services/store.service';
import { AuthService } from '../../services/auth.service';
import { MovementService } from '../../services/movement.service';
import { CategoryService } from '../../services/category.service';
import { ViewService } from '../../services/view.service';
import { MovementType, Space } from '../../models/models';
import { eurosToCents, localDate } from '../../services/finance';
import { errorMessage } from '../../services/errors';
import { SkeletonComponent } from '../skeleton/skeleton';
import { ButtonComponent } from '../button/button';

@Component({ selector: 'app-modal', imports: [ReactiveFormsModule, SkeletonComponent, ButtonComponent], templateUrl: './modal.html', styleUrl: './modal.css' })
export class ModalComponent implements AfterViewInit {
  @ViewChild('dialog') dialog!: ElementRef<HTMLDialogElement>;
  modal = inject(ModalService); store = inject(StoreService); auth = inject(AuthService);
  private movements = inject(MovementService); private categories = inject(CategoryService);
  view = inject(ViewService); private fb = inject(FormBuilder).nonNullable;
  state = this.modal.state()!;
  error = signal('');
  private expenseSpace: Space = this.store.couple()?.memberIds.length === 2 ? this.modal.movementSpace() : 'individual';
  payerControl = this.fb.control(this.auth.user()!.uid, Validators.required);
  movementForm = this.fb.group({
    type: this.fb.control<MovementType>('expense'), amount: ['', Validators.required], date: [localDate(), Validators.required],
    concept: ['', [Validators.required, Validators.maxLength(100)]], categoryId: ['', Validators.required], subcategoryId: [''],
    description: ['', Validators.maxLength(1000)],
    space: this.fb.control<Space>(this.expenseSpace),
    ownerId: [this.auth.user()!.uid, Validators.required], actorId: [this.auth.user()!.uid, Validators.required],
    payment: this.fb.control<'single' | 'half'>('single')
  });
  settlementForm = this.fb.group({ amount: ['', Validators.required], date: [localDate(), Validators.required],
    fromId: [this.view.balances.debt().fromId || this.auth.user()!.uid, Validators.required],
    toId: [this.view.balances.debt().toId || this.store.couple()!.memberIds.find(id => id !== this.auth.user()!.uid) || '', Validators.required],
    note: ['', Validators.maxLength(200)]
  });
  categoryForm = this.fb.group({ name: ['', [Validators.required, Validators.maxLength(40)]], type: this.fb.control<MovementType>('expense'), icon: ['✧', [Validators.required, Validators.maxLength(4)]], parentId: [''] });
  filtersForm = this.fb.group({ name: ['', Validators.maxLength(100)], minAmount: [''], maxAmount: [''], createdBy: [''] });
  categoryChildren = this.fb.array<ReturnType<typeof this.childForm>>([]);
  private childForm(value: { id: string; name: string }) { return this.fb.group({ id: value.id, name: [value.name, [Validators.required, Validators.maxLength(40)]], removed: false }); }
  removeChild(index: number): void { this.categoryChildren.at(index).controls.removed.setValue(true); this.categoryChildren.at(index).controls.name.clearValidators(); this.categoryChildren.at(index).controls.name.updateValueAndValidity(); }
  constructor() {
    const state = this.state;
    if (state.kind === 'movement-filters') this.filtersForm.patchValue({ ...state.value, minAmount: state.value.minCents === null ? '' : String(state.value.minCents / 100), maxAmount: state.value.maxCents === null ? '' : String(state.value.maxCents / 100) });
    if (state.kind === 'movement' && state.value) this.movementForm.patchValue({ ...state.value, amount: (state.value.amountCents / 100).toFixed(2) });
    if (state.kind === 'movement' && state.value) {
      if (state.value.type === 'expense') this.expenseSpace = state.value.space;
      this.payerControl.setValue(state.value.payment === 'half' ? '__both__' : state.value.actorId);
      if (state.value.type === 'income') this.movementForm.patchValue({ payment: 'single' });
    }
    if (state.kind === 'movement' && !state.value) this.movementForm.controls.categoryId.setValue(this.availableCategories()[0]?.id || '');
    if (state.kind === 'settlement') {
      if (state.value) this.settlementForm.patchValue({ ...state.value, amount: (state.value.amountCents / 100).toFixed(2) });
      else if (this.view.balances.debt().amountCents) this.settlementForm.controls.amount.setValue((this.view.balances.debt().amountCents / 100).toFixed(2));
    }
    if (state.kind === 'category' && state.value) this.categoryForm.patchValue(state.value);
    if (state.kind === 'category' && state.value && !state.value.parentId) {
      for (const child of this.store.categories().filter(item => item.parentId === state.value!.id && !item.archived)) this.categoryChildren.push(this.childForm(child));
    }
    if (state.kind === 'category' && state.parentId) {
      const parent = this.store.categories().find(item => item.id === state.parentId)!;
      this.categoryForm.patchValue({ parentId: parent.id, type: parent.type, icon: parent.icon });
    }
  }
  ngAfterViewInit(): void { this.dialog.nativeElement.showModal(); }
  get title(): string {
    if (this.state.kind === 'movement-filters') return 'Filtrar movimientos';
    if (this.state.kind === 'delete') return 'Eliminar registro';
    const noun = this.state.kind === 'movement' ? 'movimiento' : this.state.kind === 'settlement' ? 'liquidación' : this.state.parentId || this.state.value?.parentId ? 'subcategoría' : 'categoría';
    return `${this.state.value ? 'Editar' : 'Añadir'} ${noun}`;
  }
  availableCategories() {
    const previousId = this.state.kind === 'movement' ? this.state.value?.categoryId : undefined;
    return this.store.categories().filter(item => !item.parentId && item.type === this.movementForm.controls.type.value && (!item.archived || item.id === previousId));
  }
  availableSubcategories() {
    const previousId = this.state.kind === 'movement' ? this.state.value?.subcategoryId : undefined;
    return this.store.categories().filter(item => item.parentId === this.movementForm.controls.categoryId.value && (!item.archived || item.id === previousId));
  }
  categoryChanged(): void { this.movementForm.controls.subcategoryId.setValue(''); }
  typeChanged(): void { this.categoryChanged(); this.movementForm.controls.categoryId.setValue(this.availableCategories()[0]?.id || ''); }
  selectType(type: MovementType): void {
    if (this.movementForm.controls.type.value !== type) {
      this.movementForm.controls.type.setValue(type);
      this.movementForm.controls.payment.setValue('single');
      this.movementForm.controls.space.setValue(type === 'income' ? 'individual' : this.expenseSpace);
      this.movementForm.controls.ownerId.setValue(this.auth.user()!.uid);
      this.payerControl.setValue(this.auth.user()!.uid);
      this.typeChanged();
    }
    document.getElementById(`movement-tab-${type}`)?.focus();
  }
  spaceChanged(): void {
    this.expenseSpace = this.movementForm.controls.space.value;
    if (this.movementForm.controls.space.value === 'individual') {
      this.movementForm.controls.ownerId.setValue(this.auth.user()!.uid);
      if (this.payerControl.value === '__both__') this.payerControl.setValue(this.auth.user()!.uid);
    }
  }
  async submit(): Promise<void> {
    if (this.modal.busy()) return;
    this.error.set('');
    const state = this.state, user = this.auth.user()!, now = new Date().toISOString();
    try {
      if (state.kind === 'movement-filters') {
        if (this.filtersForm.invalid) throw new Error('El nombre no puede superar los 100 caracteres.');
        const value = this.filtersForm.getRawValue();
        const parse = (amount: string) => !amount.trim() ? null : /^0([.,]0{1,2})?$/.test(amount.trim()) ? 0 : eurosToCents(amount.trim());
        const minCents = parse(value.minAmount), maxCents = parse(value.maxAmount);
        if (minCents !== null && maxCents !== null && minCents > maxCents) throw new Error('El importe mínimo no puede superar al máximo.');
        state.apply({ name: value.name.trim(), minCents, maxCents, createdBy: state.showAuthor ? value.createdBy : '', sort: state.value.sort });
        this.modal.close();
        return;
      }
      if (state.kind === 'movement') {
        this.movementForm.markAllAsTouched();
        if (this.movementForm.invalid) throw new Error('Completa todos los campos del movimiento.');
      } else if (state.kind === 'settlement') {
        this.settlementForm.markAllAsTouched();
        if (this.settlementForm.invalid) throw new Error('Completa el importe, la fecha y ambas personas.');
      } else if (state.kind === 'category') {
        this.categoryForm.markAllAsTouched();
        this.categoryChildren.markAllAsTouched();
        if (this.categoryForm.invalid || this.categoryChildren.invalid) throw new Error('Completa el nombre y el símbolo de la categoría y los nombres de sus subcategorías.');
      }
      this.modal.busy.set(true);
      if (state.kind === 'movement') {
        const { amount, ...value } = this.movementForm.getRawValue();
        if (!value.concept.trim()) throw new Error('Escribe un nombre para el movimiento.');
        if (value.type === 'income') {
          value.payment = 'single'; value.actorId = value.ownerId;
        } else {
          value.payment = value.space === 'shared' && this.payerControl.value === '__both__' ? 'half' : 'single';
          value.actorId = value.payment === 'half' ? user.uid : this.payerControl.value;
        }
        await this.movements.save({ ...value, concept: value.concept.trim(), amountCents: eurosToCents(amount), id: state.value?.id || crypto.randomUUID(), createdBy: state.value?.createdBy || user.uid, createdAt: state.value?.createdAt || now, updatedAt: now });
      } else if (state.kind === 'settlement') {
        const { amount, ...value } = this.settlementForm.getRawValue();
        await this.movements.saveSettlement({ ...value, note: value.note.trim(), amountCents: eurosToCents(amount), id: state.value?.id || crypto.randomUUID(), createdBy: state.value?.createdBy || user.uid, createdAt: state.value?.createdAt || now, updatedAt: now });
      } else if (state.kind === 'category') {
        const value = { ...this.categoryForm.getRawValue(), id: state.value?.id || crypto.randomUUID(), archived: state.value?.archived || false };
        if (state.value && !state.value.parentId) await this.categories.saveFamily(value, this.categoryChildren.getRawValue());
        else await this.categories.save(value);
      } else if (state.collection === 'categories') await this.categories.archive(state.id);
      else await this.store.remove(state.collection, state.id);
      this.modal.busy.set(false); this.modal.close();
    } catch (error) { this.modal.busy.set(false); this.error.set(errorMessage(error)); }
  }
}

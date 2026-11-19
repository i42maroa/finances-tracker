import { Component, inject, computed } from '@angular/core';
import { StoreService } from '../../services/store.service';
import { ModalService } from '../../services/modal.service';
import { RouterLink } from '@angular/router';
import { BreadcrumbComponent } from '../../shared/breadcrumb/breadcrumb';
@Component({ selector: 'app-categories', imports: [RouterLink, BreadcrumbComponent], templateUrl: './categories.html', styleUrl: './categories.css' })
export class CategoriesComponent {
  store = inject(StoreService); modal = inject(ModalService);
  groups = computed(() => [{ type: 'expense', title: 'Gastos', subtitle: 'Categorías de gastos', categories: this.store.categories().filter(item => item.type === 'expense' && !item.parentId && !item.archived) }, { type: 'income', title: 'Ingresos', subtitle: 'Categorías de ingresos', categories: this.store.categories().filter(item => item.type === 'income' && !item.parentId && !item.archived) }]);
  children(id: string) { return this.store.categories().filter(item => item.parentId === id && !item.archived); }
}

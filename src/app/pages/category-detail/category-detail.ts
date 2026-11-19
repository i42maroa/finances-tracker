import { Component, computed, effect, inject } from '@angular/core';
import { Router } from '@angular/router';
import { NavigationService } from '../../services/navigation.service';
import { StoreService } from '../../services/store.service';
import { ModalService } from '../../services/modal.service';
import { BreadcrumbComponent, BreadcrumbItem } from '../../shared/breadcrumb/breadcrumb';
@Component({ selector: 'app-category-detail', imports: [BreadcrumbComponent], templateUrl: './category-detail.html', styleUrl: './category-detail.css' })
export class CategoryDetailComponent {
  navigation = inject(NavigationService); store = inject(StoreService); modal = inject(ModalService);
  private router = inject(Router);
  category = this.navigation.category;
  children = computed(() => this.store.categories().filter(item => item.parentId === this.category()?.id && !item.archived));
  defaultSubcategory = computed(() => this.children().find(item => item.id === this.category()?.defaultSubcategoryId));
  breadcrumbs = computed<BreadcrumbItem[]>(() => [{ label: 'Configuración', link: '/configuracion' }, { label: 'Categorías', link: '/configuracion/categorias' }, { label: this.category()?.name || 'Categoría no disponible' }]);
  constructor() {
    let wasAvailable = false;
    effect(() => {
      if (this.category()) wasAvailable = true;
      else if (wasAvailable && !this.store.loading()) void this.router.navigate(['/configuracion/categorias']);
    });
  }
}

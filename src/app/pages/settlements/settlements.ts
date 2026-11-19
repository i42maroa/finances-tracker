import { Component, inject, computed } from '@angular/core';
import { ViewService } from '../../services/view.service';
import { ModalService } from '../../services/modal.service';
import { BreadcrumbComponent } from '../../shared/breadcrumb/breadcrumb';
@Component({ selector: 'app-settlements', imports: [BreadcrumbComponent], templateUrl: './settlements.html', styleUrl: './settlements.css' })
export class SettlementsComponent {
  view = inject(ViewService); modal = inject(ModalService);
  rows = computed(() => [...this.view.store.settlements()].sort((a,b) => b.date.localeCompare(a.date)));
}

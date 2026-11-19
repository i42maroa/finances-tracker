import { Component, inject, input } from '@angular/core';
import { Movement } from '../../models/models';
import { ViewService } from '../../services/view.service';
import { Router, RouterLink } from '@angular/router';
import { localDate } from '../../services/finance';
@Component({ selector: 'app-movement-list', imports: [RouterLink], templateUrl: './movement-list.html', styleUrl: './movement-list.css' })
export class MovementListComponent {
  rows = input.required<Movement[]>(); view = inject(ViewService); private router = inject(Router);
  origin = input<Record<string, string | number | boolean> | null>(null);
  category(id: string) { return this.view.store.categories().find(item => item.id === id); }
  isNew(movement: Movement): boolean { const created = new Date(movement.createdAt); return Number.isFinite(created.getTime()) && localDate(created) === localDate(); }
  open(id: string): void { void this.router.navigate(['/movimientos', id], { queryParams: this.origin() }); }
}

import { Component, input } from '@angular/core';
import { RouterLink } from '@angular/router';

export interface BreadcrumbItem {
  label: string;
  link?: string;
  queryParams?: Record<string, string | number | boolean>;
}

@Component({ selector: 'app-breadcrumb', imports: [RouterLink], templateUrl: './breadcrumb.html', styleUrl: './breadcrumb.css' })
export class BreadcrumbComponent { items = input.required<BreadcrumbItem[]>(); }

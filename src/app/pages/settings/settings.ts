import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { BreadcrumbComponent } from '../../shared/breadcrumb/breadcrumb';
@Component({ selector: 'app-settings', imports: [RouterLink, BreadcrumbComponent], templateUrl: './settings.html', styleUrl: './settings.css' })
export class SettingsComponent {}

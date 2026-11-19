import { Component, inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { BreadcrumbComponent } from '../../shared/breadcrumb/breadcrumb';

@Component({ selector: 'app-profile', imports: [BreadcrumbComponent], templateUrl: './profile.html', styleUrl: './profile.css' })
export class ProfileComponent { auth = inject(AuthService); }

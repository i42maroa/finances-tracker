import { bootstrapApplication } from '@angular/platform-browser';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { LOCALE_ID, provideAppInitializer, inject } from '@angular/core';
import { AppComponent } from './app/app';
import { AuthService } from './app/services/auth.service';
import { routes } from './app/routes';
bootstrapApplication(AppComponent, {
  providers: [provideRouter(routes, withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' })), { provide: LOCALE_ID, useValue: 'es' }, provideAppInitializer(() => inject(AuthService).initialize().catch(error => console.error('Inicialización:', error)))]
}).catch(error => console.error(error));

import { Component, inject, signal, computed, effect, ElementRef, ViewChild, HostListener, OnDestroy } from '@angular/core';
import { AsyncPipe, NgTemplateOutlet } from '@angular/common';
import { RouterLink, RouterLinkActive, RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AuthService } from './services/auth.service';
import { StoreService } from './services/store.service';
import { ModalService } from './services/modal.service';
import { LoginComponent } from './pages/login/login';
import { CoupleComponent } from './pages/couple/couple';
import { ModalComponent } from './shared/modal/modal';
import { SkeletonComponent } from './shared/skeleton/skeleton';
import { NavigationService } from './services/navigation.service';
@Component({ selector: 'app-root', imports: [AsyncPipe, NgTemplateOutlet, RouterLink, RouterLinkActive, RouterOutlet, LoginComponent, CoupleComponent, ModalComponent, SkeletonComponent], templateUrl: './app.html', styleUrl: './app.css' })
export class AppComponent implements OnDestroy {
  @ViewChild('secondaryMenu') secondaryMenu?: ElementRef<HTMLDialogElement>;
  @ViewChild('hamburger') hamburger?: ElementRef<HTMLButtonElement>;
  secondaryMenuOpen = signal(false);
  private scrollPosition = 0;
  private bodyStyles = '';
  private htmlOverflow = '';
  constructor() {
    inject(Router).events.pipe(takeUntilDestroyed()).subscribe(event => { if (event instanceof NavigationEnd) this.closeSecondaryMenu(); });
    effect(() => { if (!this.auth.user()) this.closeSecondaryMenu(); });
  }
  openSecondaryMenu(): void {
    if (!this.secondaryMenu || this.secondaryMenuOpen()) return;
    this.scrollPosition = window.scrollY;
    this.bodyStyles = document.body.style.cssText;
    this.htmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';
    this.secondaryMenuOpen.set(true);
    this.secondaryMenu.nativeElement.showModal();
  }
  closeSecondaryMenu(): void {
    if (!this.secondaryMenuOpen()) return;
    this.secondaryMenuOpen.set(false);
    this.secondaryMenu?.nativeElement.close();
    document.body.style.cssText = this.bodyStyles;
    document.documentElement.style.overflow = this.htmlOverflow;
    window.scrollTo(0, this.scrollPosition);
    this.hamburger?.nativeElement.focus({ preventScroll: true });
  }
  secondaryAction(event: MouseEvent): void {
    if (event.target instanceof Element && event.target.closest('a,button')) this.closeSecondaryMenu();
  }
  @HostListener('window:resize') onResize(): void { if (window.innerWidth > 1024) this.closeSecondaryMenu(); }
  ngOnDestroy(): void { this.closeSecondaryMenu(); }
  auth = inject(AuthService); store = inject(StoreService); modal = inject(ModalService);
  navigation = inject(NavigationService);
  readonly links = computed(() => [
    { id: 'monthly', path: '/', queryParams: {}, icon: '◫', label: 'Resumen', active: this.navigation.inMonthlySummary(), hideOnBottom: this.navigation.inMonthlySummary() },
    { id: 'annual', path: '/', queryParams: { year: this.navigation.summaryYear() }, icon: '▦', label: 'Resumen anual', active: this.navigation.inAnnualSummary(), hideOnBottom: !this.navigation.inMonthlySummary() },
    { id: 'settlements', path: '/liquidaciones', queryParams: {}, icon: '⇌', label: 'Liquidaciones', active: this.navigation.path() === '/liquidaciones', hideOnBottom: false },
    { id: 'settings', path: '/configuracion', queryParams: {}, icon: '⚙', label: 'Configuración', active: this.navigation.inSettings(), hideOnBottom: true }
  ]);
  logout(): void { void this.auth.logout(); }
}

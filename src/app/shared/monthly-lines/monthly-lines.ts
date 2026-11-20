import { afterNextRender, Component, computed, DestroyRef, effect, ElementRef, HostListener, inject, Injector, input, signal, ViewChild } from '@angular/core';
import { MonthlySeries } from '../../services/monthly-series';

@Component({
  selector: 'app-monthly-lines',
  templateUrl: './monthly-lines.html',
  styleUrl: './monthly-lines.css'
})
export class MonthlyLinesComponent {
  readonly series = input.required<MonthlySeries[]>();
  readonly year = input.required<number>();
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  private readonly destroyRef = inject(DestroyRef);
  private readonly injector = inject(Injector);
  @ViewChild('popupClose') private popupClose?: ElementRef<HTMLButtonElement>;
  private activePoint?: SVGElement;
  readonly selection = signal<{ id: string; month: number } | null>(null);
  readonly width = signal(800);
  readonly compact = computed(() => this.width() < 600);
  readonly rotatedMonths = computed(() => this.width() < 440);
  readonly left = computed(() => this.compact() ? 60 : 130);
  readonly right = computed(() => this.width() - 16);
  readonly bottom = computed(() => this.compact() ? 200 : 270);
  readonly height = computed(() => this.compact() ? 270 : 320);
  readonly colors = ['var(--color-primary)', 'var(--color-chart-2)', 'var(--color-chart-3)', 'var(--color-chart-4)', 'var(--color-positive)', 'var(--color-lilac-text)', 'var(--color-peach-text)'];
  readonly months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  readonly ceiling = computed(() => {
    const max = Math.max(1, ...this.series().flatMap(row => row.values));
    const step = 10 ** Math.floor(Math.log10(max));
    return Math.ceil(max / step) * step;
  });
  readonly ticks = computed(() => Array.from({ length: 5 }, (_, index) => this.ceiling() * index / 4));
  readonly lines = computed(() => this.series().map((row, index) => {
    const points = row.values.map((value, month) => ({ value, month, x: this.x(month), y: this.y(value) }));
    return { ...row, color: this.colors[index % this.colors.length], points, path: points.map(point => `${point.x},${point.y}`).join(' ') };
  }));
  readonly selectedPoint = computed(() => {
    const selection = this.selection();
    const line = this.lines().find(row => row.id === selection?.id);
    if (!selection || !line) return null;
    return { ...line.points[selection.month], label: line.label };
  });
  readonly popupLeft = computed(() => Math.max(8, Math.min(
    (this.selectedPoint()?.x || 0) - 110, this.width() - 228
  )));
  constructor() {
    effect(() => { this.series(); this.year(); this.closePoint(); });
    afterNextRender(() => {
      const updateWidth = (width: number) => { if (width > 0) this.width.set(width); };
      updateWidth(this.host.nativeElement.getBoundingClientRect().width);
      const observer = new ResizeObserver(entries => updateWidth(entries[0].contentRect.width));
      observer.observe(this.host.nativeElement);
      this.destroyRef.onDestroy(() => observer.disconnect());
    });
  }
  openPoint(id: string, month: number, event: Event): void {
    event.stopPropagation();
    this.activePoint = event.currentTarget as SVGElement;
    this.selection.set({ id, month });
    afterNextRender(() => this.popupClose?.nativeElement.focus({ preventScroll: true }), { injector: this.injector });
  }
  closePoint(restoreFocus = false): void {
    this.selection.set(null);
    if (restoreFocus && this.activePoint?.isConnected) this.activePoint.focus({ preventScroll: true });
  }
  @HostListener('document:click', ['$event'])
  closeOutside(event: MouseEvent): void {
    if (event.target instanceof Node && !this.host.nativeElement.querySelector('.point-popup')?.contains(event.target)) this.closePoint();
  }
  @HostListener('keydown.escape', ['$event'])
  closeWithEscape(event: Event): void {
    if (this.selectedPoint()) { event.stopPropagation(); this.closePoint(true); }
  }
  monthName(month: number): string {
    return new Intl.DateTimeFormat('es-ES', { month: 'long' }).format(new Date(2000, month, 1));
  }
  x(month: number): number { return this.left() + month * (this.right() - this.left()) / 11; }
  y(cents: number): number { return this.bottom() - cents / this.ceiling() * (this.bottom() - 20); }
  axisMoney(cents: number): string {
    return this.compact()
      ? new Intl.NumberFormat('es-ES', { notation: 'compact', maximumFractionDigits: 1 }).format(cents / 100).replace(/\s*mil\b/, 'k') + ' €'
      : this.money(cents);
  }
  money(cents: number): string { return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(cents / 100); }
}

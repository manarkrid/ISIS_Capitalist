import { Component, computed, effect, ElementRef, inject, OnDestroy, signal, ViewChild } from '@angular/core';
import { CommonModule, registerLocaleData } from '@angular/common';
import localeFr from '@angular/common/locales/fr';
import { FormsModule } from '@angular/forms';
import { GameServiceService } from './game-service.service';
import { ProduitComponent } from './produit/produit.component';
import { BigvaluePipe } from './bigvalue.pipe';
import { Palier } from './graphql/generated';

type GameModal = 'managers' | 'unlocks' | 'upgrades' | 'angels' | 'angelUpgrades';
registerLocaleData(localeFr);

@Component({
  selector: 'app-root', standalone: true,
  imports: [CommonModule, FormsModule, ProduitComponent, BigvaluePipe],
  templateUrl: './app.component.html', styleUrl: './app.component.css',
})
export class AppComponent implements OnDestroy {
  readonly gameService = inject(GameServiceService);
  readonly world = this.gameService.world;
  readonly usernameInput = signal(this.gameService.user());
  readonly qtmulti = signal(1);
  readonly qtOptions = [1, 10, 100, -1];
  readonly qtLabels: Record<number, string> = { 1: '×1', 10: '×10', 100: '×100', [-1]: 'Max' };
  readonly activeModal = signal<GameModal | null>(null);
  readonly resetConfirmation = signal(false);
  readonly modalTitles: Record<GameModal, string> = {
    managers: 'Votre équipe', unlocks: 'Les prochains paliers', upgrades: 'Améliorations',
    angels: 'Investisseurs', angelUpgrades: 'Améliorations des anges',
  };
  readonly managers = computed(() => this.world()?.managers.filter(m => !m.unlocked) ?? []);
  readonly upgrades = computed(() => this.world()?.upgrades.filter(u => !u.unlocked) ?? []);
  readonly angelUpgrades = computed(() => this.world()?.angelupgrades.filter(u => !u.unlocked) ?? []);
  readonly unlocks = computed(() => {
    const world = this.world();
    if (!world) return [];
    const productUnlocks = world.products.flatMap(product => product.paliers
      .filter(palier => !palier.unlocked)
      .map(palier => ({ palier, target: product.name, quantity: product.quantite })));
    const allUnlocks = world.allunlocks.filter(palier => !palier.unlocked).map(palier => ({
      palier, target: 'Chaque spécialité', quantity: Math.min(...world.products.map(product => product.quantite)),
    }));
    return [...productUnlocks, ...allUnlocks];
  });
  readonly badgeManagers = computed(() => this.managers().filter(m => (this.world()?.money ?? 0) >= m.seuil).length);
  readonly badgeUpgrades = computed(() => this.upgrades().filter(u => (this.world()?.money ?? 0) >= u.seuil).length);
  readonly badgeAngels = computed(() => this.angelUpgrades().filter(u => (this.world()?.activeangels ?? 0) >= u.seuil).length);
  readonly newAngels = computed(() => this.gameService.computeNewAngels());
  readonly unavailable = computed(() => this.gameService.loading() || this.gameService.busy() || !!this.gameService.error());
  readonly snackVisible = signal(false);
  readonly snackText = signal('');
  private snackTimer?: ReturnType<typeof setTimeout>;
  @ViewChild('gameDialog', { static: true }) private dialog!: ElementRef<HTMLDialogElement>;

  constructor() {
    effect(() => {
      const message = this.gameService.snackmessage();
      if (!message) return;
      this.snackText.set(message);
      this.snackVisible.set(true);
      clearTimeout(this.snackTimer);
      this.snackTimer = setTimeout(() => this.snackVisible.set(false), 4000);
    });
  }
  ngOnDestroy(): void { clearTimeout(this.snackTimer); }
  commitName(): void {
    const name = this.usernameInput().trim();
    if (name && !this.gameService.loading() && !this.gameService.busy()) {
      this.closeModal();
      this.gameService.commitName(name);
    }
  }
  openModal(modal: GameModal): void {
    this.activeModal.set(modal);
    this.resetConfirmation.set(false);
    this.dialog.nativeElement.showModal();
  }
  closeModal(): void {
    this.dialog.nativeElement.close();
    this.activeModal.set(null);
    this.resetConfirmation.set(false);
  }
  dismissBackdrop(event: MouseEvent): void {
    if (event.target === event.currentTarget) this.closeModal();
  }
  hireManager(manager: Palier): void { this.gameService.hireManager(manager); }
  buyCashUpgrade(upgrade: Palier): void { this.gameService.buyCashUpgrade(upgrade); }
  buyAngelUpgrade(upgrade: Palier): void { this.gameService.buyAngelUpgrade(upgrade); }
  async doReset(): Promise<void> {
    if (!this.resetConfirmation() || this.unavailable()) return;
    if (await this.gameService.resetWorld()) this.closeModal();
  }
  refreshWorld(): void { this.gameService.refreshWorld(); }
  getProdName(id: number): string {
    if (id === 0) return 'Toutes les spécialités';
    if (id === -1) return 'Les anges actifs';
    return this.world()?.products.find(product => product.id === id)?.name ?? '';
  }
  ratioLabel(palier: Palier): string {
    if (palier.typeratio === 'vitesse') return 'Durée ÷' + palier.ratio;
    if (palier.typeratio === 'ange') return '+' + palier.ratio + ' points de bonus par ange';
    return 'Revenus ×' + palier.ratio;
  }
  imageFallback(event: Event): void {
    const image = event.target as HTMLImageElement;
    image.onerror = null;
    if (!image.src.endsWith('/placeholder.svg')) image.src = 'placeholder.svg';
  }
}

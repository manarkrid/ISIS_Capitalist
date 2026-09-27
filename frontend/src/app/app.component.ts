import {
  Component, inject, signal, computed, effect, OnInit
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GameServiceService } from './game-service.service';
import { ProduitComponent } from './produit/produit.component';
import { BigvaluePipe } from './bigvalue.pipe';
import { Palier } from './graphql/generated';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, FormsModule, ProduitComponent, BigvaluePipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  gameService = inject(GameServiceService);
  world = this.gameService.world;

  // ── Saisie du nom ──────────────────────────────────────────────────────
  usernameInput = signal<string>(this.gameService.user());

  commitName() {
    const name = this.usernameInput();
    if (name.trim()) this.gameService.commitName(name.trim());
  }

  // ── Commutateur quantité achat ─────────────────────────────────────────
  qtmulti = signal<number>(1);
  readonly qtOptions = [1, 10, 100, -1];
  readonly qtLabels: Record<number, string> = { 1: 'x1', 10: 'x10', 100: 'x100', [-1]: 'Max' };

  cycleQt() {
    const idx = this.qtOptions.indexOf(this.qtmulti());
    this.qtmulti.set(this.qtOptions[(idx + 1) % this.qtOptions.length]);
  }

  // ── Modales ────────────────────────────────────────────────────────────
  showManagers = signal(false);
  showUnlocks = signal(false);
  showUpgrades = signal(false);
  showAngels = signal(false);

  // ── Badges ────────────────────────────────────────────────────────────
  badgeManagers = computed(() => {
    const w = this.world();
    if (!w) return 0;
    return w.managers.filter((m) => !m.unlocked && w.money >= m.seuil).length;
  });

  badgeUpgrades = computed(() => {
    const w = this.world();
    if (!w) return 0;
    return w.upgrades.filter((u) => !u.unlocked && w.money >= u.seuil).length;
  });

  badgeAngels = computed(() => {
    const w = this.world();
    if (!w) return 0;
    return w.angelupgrades.filter((u) => !u.unlocked && w.activeangels >= u.seuil).length;
  });

  newAngels = computed(() => this.gameService.computeNewAngels());

  // ── Snack message ──────────────────────────────────────────────────────
  snackVisible = signal(false);
  snackText = signal('');
  private snackTimer: any;

  constructor() {
    effect(() => {
      const msg = this.gameService.snackmessage();
      if (!msg) return;
      this.snackText.set(msg);
      this.snackVisible.set(true);
      clearTimeout(this.snackTimer);
      this.snackTimer = setTimeout(() => this.snackVisible.set(false), 2500);
    });
  }

  ngOnInit() {
    this.usernameInput.set(this.gameService.user());
  }

  // ── Actions ────────────────────────────────────────────────────────────
  hireManager(manager: Palier) { this.gameService.hireManager(manager); }
  buyCashUpgrade(upgrade: Palier) { this.gameService.buyCashUpgrade(upgrade); }
  buyAngelUpgrade(upgrade: Palier) { this.gameService.buyAngelUpgrade(upgrade); }

  async doReset() {
    await this.gameService.resetWorld();
    this.showAngels.set(false);
  }

  refreshWorld() { this.gameService.refreshWorld(); }

  // helper pour le template
  getProdName(idcible: number): string {
    return this.world()?.products?.find((p) => p.id === idcible)?.name ?? '';
  }

  ratioLabel(palier: Palier): string {
    if (palier.typeratio === 'vitesse') return `÷${palier.ratio} vitesse`;
    if (palier.typeratio === 'ange') return `×${palier.ratio} bonus anges`;
    if (palier.idcible === 0) return `×${palier.ratio} tous les revenus`;
    return `×${palier.ratio} revenu`;
  }
}

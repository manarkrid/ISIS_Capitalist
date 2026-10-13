import { Component, computed, effect, inject, input, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../graphql/operations';
import { GameService } from '../game.service';
import { BigvaluePipe } from '../bigvalue.pipe';
import { SecondPipe } from '../second.pipe';

@Component({
  selector: 'app-produit', standalone: true,
  imports: [CommonModule, BigvaluePipe, SecondPipe],
  templateUrl: './produit.component.html', styleUrl: './produit.component.css',
})
export class ProduitComponent implements OnDestroy {
  readonly gameService = inject(GameService);
  readonly prod = input<Product>();
  readonly qtmulti = input(1);
  readonly timeleft = computed(() => this.prod()?.timeleft ?? 0);
  readonly vitesse = computed(() => this.prod()?.vitesse ?? 1);
  readonly progress = signal(0);
  private starttime = 0;
  private remainingAtStart = 0;
  private durationAtStart = 1;
  private animationFrame?: number;

  constructor() {
    effect(() => {
      // Chaque état reçu recale l'animation sur le temps restant du monde.
      const remaining = this.timeleft();
      const duration = this.vitesse();
      this.cancelAnimation();
      this.remainingAtStart = remaining;
      this.durationAtStart = duration;
      this.starttime = performance.now();
      this.progress.set(remaining > 0 ? this.progressPercent(remaining, duration) : 0);
      if (remaining > 0) this.animationFrame = requestAnimationFrame(this.animate);
    });
  }

  readonly animate = (currentTime: number): void => {
    this.animationFrame = undefined;
    const elapsed = Math.max(0, currentTime - this.starttime);
    const remaining = Math.max(0, this.remainingAtStart - elapsed);
    this.progress.set(this.progressPercent(remaining, this.durationAtStart));
    // L'animation ne crédite aucun revenu : calcScore et productionDone s'en chargent.
    if (remaining > 0) this.animationFrame = requestAnimationFrame(this.animate);
  };

  private progressPercent(remaining: number, duration: number): number {
    return Math.min(100, Math.max(0, 100 * (1 - remaining / Math.max(1, duration))));
  }

  private cancelAnimation(): void {
    if (this.animationFrame !== undefined) cancelAnimationFrame(this.animationFrame);
    this.animationFrame = undefined;
  }

  ngOnDestroy(): void { this.cancelAnimation(); }
  readonly maxCanBuy = computed(() => {
    const product = this.prod();
    return product ? this.gameService.maxCanBuy(product) : 0;
  });
  readonly numberToBuy = computed(() => this.qtmulti() === -1 ? this.maxCanBuy() : this.qtmulti());
  readonly costToBuy = computed(() => {
    const product = this.prod();
    return product ? this.gameService.productionCost(product, this.numberToBuy()) : 0;
  });
  readonly unavailable = computed(() => this.gameService.loading() || this.gameService.busy() || !!this.gameService.error());
  readonly canBuy = computed(() => !this.unavailable() && this.numberToBuy() > 0 && this.numberToBuy() <= this.maxCanBuy());
  readonly canProduce = computed(() => !this.unavailable() && (this.prod()?.quantite ?? 0) > 0 && this.timeleft() === 0 && !this.prod()?.managerUnlocked);
  readonly productionRevenue = computed(() => {
    const product = this.prod();
    return product ? this.gameService.productRevenue(product) : 0;
  });
  startFabrication(): void {
    const product = this.prod();
    if (product && this.canProduce()) void this.gameService.lancerProduction(product.id);
  }
  buy(): void {
    const product = this.prod();
    if (product && this.canBuy()) void this.gameService.buyProduct(this.numberToBuy(), product);
  }
  imageFallback(event: Event): void {
    const image = event.target as HTMLImageElement;
    if (!image.src.endsWith('/placeholder.svg')) image.src = 'placeholder.svg';
  }
}

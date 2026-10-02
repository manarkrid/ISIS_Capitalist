import { Component, computed, inject, input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../graphql/generated';
import { GameServiceService } from '../game-service.service';
import { BigvaluePipe } from '../bigvalue.pipe';
import { SecondPipe } from '../second.pipe';

@Component({
  selector: 'app-produit', standalone: true,
  imports: [CommonModule, BigvaluePipe, SecondPipe],
  templateUrl: './produit.component.html', styleUrl: './produit.component.css',
})
export class ProduitComponent {
  readonly gameService = inject(GameServiceService);
  readonly prod = input<Product>();
  readonly qtmulti = input(1);
  readonly timeleft = computed(() => this.prod()?.timeleft ?? 0);
  readonly vitesse = computed(() => this.prod()?.vitesse ?? 1);
  readonly progress = computed(() => this.timeleft() > 0
    ? Math.min(100, Math.max(0, 100 * (1 - this.timeleft() / this.vitesse()))) : 0);
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

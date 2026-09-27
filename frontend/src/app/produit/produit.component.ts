import {
  Component, input, inject, signal, computed, OnInit, effect, OnDestroy
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Product } from '../graphql/generated';
import { GameServiceService } from '../game-service.service';
import { BigvaluePipe } from '../bigvalue.pipe';
import { SecondPipe } from '../second.pipe';

@Component({
  selector: 'app-produit',
  standalone: true,
  imports: [CommonModule, BigvaluePipe, SecondPipe],
  templateUrl: './produit.component.html',
  styleUrl: './produit.component.css',
})
export class ProduitComponent implements OnInit, OnDestroy {
  gameService = inject(GameServiceService);

  prod     = input<Product | undefined>();
  qtmulti  = input<number>(1);  // 1, 10, 100, ou -1 (max)

  // ── Signaux locaux ─────────────────────────────────────────────────────────
  timeleft  = signal<number>(0);   // ms restant dans le cycle
  progress  = signal<number>(0);   // 0–100 %
  vitesse   = signal<number>(500); // durée d'un cycle en ms

  private starttime    = 0;
  private lastTick     = 0;
  private animFrameId  = 0;
  private intervalId   : ReturnType<typeof setInterval> | null = null;

  // ── Signaux dérivés ────────────────────────────────────────────────────────
  maxCanBuy = computed(() => {
    const p = this.prod();
    return p ? this.gameService.maxCanBuy(p) : 0;
  });

  numberToBuy = computed(() => {
    const qt = this.qtmulti();
    return qt === -1 ? this.maxCanBuy() : qt;
  });

  costToBuy = computed(() => {
    const p = this.prod();
    const n = this.numberToBuy();
    if (!p || n <= 0) return 0;
    if (n === 1) return p.cout;
    return p.cout * (Math.pow(p.croissance, n) - 1) / (p.croissance - 1);
  });

  canBuy = computed(() => {
    const money = this.gameService.world()?.money ?? 0;
    return money >= this.costToBuy() && this.numberToBuy() > 0;
  });

  constructor() {
    // Quand le produit change depuis le serveur, on sync la vitesse
    // et on lance automatiquement si manager débloqué
    effect(() => {
      const p = this.prod();
      if (!p) return;
      this.vitesse.set(p.vitesse);
      if (p.managerUnlocked && this.timeleft() === 0 && p.quantite > 0) {
        this.startProduction();
      }
    });
  }

  ngOnInit() {
    const p = this.prod();
    if (p) {
      this.vitesse.set(p.vitesse);
      if (p.timeleft > 0 && p.quantite > 0) {
        // Reprend une production en cours (vient du serveur)
        this.timeleft.set(p.timeleft);
        this.starttime = performance.now() - (p.vitesse - p.timeleft);
        this.lastTick  = performance.now();
        this.animFrameId = requestAnimationFrame(this.animate);
      } else if (p.managerUnlocked && p.quantite > 0) {
        this.startProduction();
      }
    }

    // Boucle principale 100 ms – met à jour timeleft local
    this.intervalId = setInterval(() => this.calcScore(), 100);
  }

  ngOnDestroy() {
    if (this.intervalId) clearInterval(this.intervalId);
    cancelAnimationFrame(this.animFrameId);
  }

  // ── Clic sur l'icône du produit ────────────────────────────────────────────
  startFabrication() {
    const p = this.prod();
    if (!p || p.quantite <= 0 || this.timeleft() > 0) return;
    this.startProduction();
    this.gameService.lancerProduction(p.id);
  }

  private startProduction() {
    this.timeleft.set(this.vitesse());
    this.starttime = performance.now();
    this.lastTick  = performance.now();
    cancelAnimationFrame(this.animFrameId);
    this.animFrameId = requestAnimationFrame(this.animate);
  }

  // ── Animation RAF (60 fps) ─────────────────────────────────────────────────
  animate = (currentTime: number) => {
    const elapsed = currentTime - this.starttime;
    const v       = this.vitesse();
    const pct     = Math.min((elapsed / v) * 100, 100);
    this.progress.set(pct);

    if (pct < 100) {
      this.animFrameId = requestAnimationFrame(this.animate);
    } else {
      // Production terminée
      this.progress.set(0);
      this.timeleft.set(0);
      const p = this.prod();
      if (p) this.gameService.productionDone(p, 1);
      // Manager : relance automatique
      if (p?.managerUnlocked) {
        this.startProduction();
      }
    }
  };

  // ── Boucle 100 ms : maintient timeleft en sync ────────────────────────────
  calcScore() {
    const p = this.prod();
    if (!p || p.quantite <= 0 || this.timeleft() <= 0) return;

    const now     = performance.now();
    const elapsed = now - this.lastTick;
    this.lastTick = now;

    const newTL = this.timeleft() - elapsed;
    this.timeleft.set(Math.max(0, newTL));
  }

  // ── Achat ──────────────────────────────────────────────────────────────────
  buy() {
    const p = this.prod();
    const n = this.numberToBuy();
    if (!p || !this.canBuy() || n <= 0) return;
    this.gameService.buyProduct(n, p);
  }
}

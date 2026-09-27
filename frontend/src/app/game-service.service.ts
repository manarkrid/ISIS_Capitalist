import { Injectable, signal, inject } from '@angular/core';
import {
  World, Product, Palier, RatioType,
  GetWorldGQL,
  AcheterQtProduitGQL,
  LancerProductionGQL,
  EngagerManagerGQL,
  AcheterCashUpgradeGQL,
  AcheterAngelUpgradeGQL,
  ResetWorldGQL,
} from './graphql/generated';

@Injectable({ providedIn: 'root' })
export class GameServiceService {

  private getWorldGQL     = inject(GetWorldGQL);
  private acheterQtGQL    = inject(AcheterQtProduitGQL);
  private lancerProdGQL   = inject(LancerProductionGQL);
  private engagerMgrGQL   = inject(EngagerManagerGQL);
  private cashUpgradeGQL  = inject(AcheterCashUpgradeGQL);
  private angelUpgradeGQL = inject(AcheterAngelUpgradeGQL);
  private resetWorldGQL   = inject(ResetWorldGQL);

  server       = signal<string>('http://localhost:3000');
  user         = signal<string>('');
  world        = signal<World | null>(null);
  snackmessage = signal<string>('');

  constructor() {
    let username = localStorage.getItem('username');
    if (!username || username === '') {
      username = 'Captain' + Math.floor(Math.random() * 10000);
    }
    this.user.set(username);
    this.readWorld();
  }

  // ── Lecture du monde ───────────────────────────────────────────────────────
  readWorld() {
    this.getWorldGQL.fetch({ variables: { user: this.user() }, fetchPolicy: 'no-cache' }).subscribe({
      next: (result: any) => {
        const data = result?.data ?? result;
        const w = data?.getWorld;
        if (w) {
          this.world.set(this.deepCopy(w));
        }
      },
      error: (err: any) => console.error('getWorld error:', err),
    });
  }

  refreshWorld() { this.readWorld(); }

  commitName(name: string) {
    localStorage.setItem('username', name);
    this.user.set(name);
    this.readWorld();
  }

  // ── Gain de production local ────────────────────────────────────────────────
  productionDone(prod: Product, qt: number) {
    const angelMultiplier = 1 + ((this.world()?.activeangels ?? 0) * (this.world()?.angelbonus ?? 2)) / 100;
    const gain = prod.revenu * prod.quantite * qt * angelMultiplier;
    this.world.update((w) => {
      if (!w) return w;
      return { ...w, money: w.money + gain, score: w.score + gain };
    });
  }

  // ── Achat produit ──────────────────────────────────────────────────────────
  buyProduct(qt: number, product: Product) {
    const world = this.world();
    if (!world) return;

    const cost = qt === 1
      ? product.cout
      : product.cout * (Math.pow(product.croissance, qt) - 1) / (product.croissance - 1);

    if (world.money < cost) return;

    const newWorld: World = this.deepCopy(world);
    const newProd = newWorld.products.find((p) => p.id === product.id)!;
    newProd.quantite += qt;
    newProd.cout      = product.cout * Math.pow(product.croissance, qt);
    newWorld.money   -= cost;

    this.applyPaliersForProduct(newWorld, newProd);
    this.applyAllUnlocks(newWorld);
    this.world.set(newWorld);

    this.acheterQtGQL.mutate({ variables: { user: this.user(), id: product.id, quantite: qt } }).subscribe({
      error: () => this.snackmessage.set('Erreur serveur achat produit'),
    });
  }

  // ── Lancer production ──────────────────────────────────────────────────────
  lancerProduction(productId: number) {
    this.lancerProdGQL.mutate({ variables: { user: this.user(), id: productId } }).subscribe({
      error: () => this.snackmessage.set('Erreur serveur lancer production'),
    });
  }

  // ── Engager manager ────────────────────────────────────────────────────────
  hireManager(manager: Palier) {
    const world = this.world();
    if (!world) return;
    if (world.money < manager.seuil) {
      this.snackmessage.set("Pas assez d'argent pour ce manager");
      return;
    }
    const newWorld: World = this.deepCopy(world);
    newWorld.money -= manager.seuil;
    const mgr = newWorld.managers.find((m) => m.name === manager.name);
    if (mgr) mgr.unlocked = true;
    const prod = newWorld.products.find((p) => p.id === manager.idcible);
    if (prod) {
      prod.managerUnlocked = true;
      if (prod.timeleft === 0) prod.timeleft = prod.vitesse;
    }
    this.world.set(newWorld);
    this.snackmessage.set(`Manager ${manager.name} engagé !`);

    this.engagerMgrGQL.mutate({ variables: { user: this.user(), name: manager.name } }).subscribe({
      error: () => this.snackmessage.set('Erreur serveur manager'),
    });
  }

  // ── Cash upgrade ───────────────────────────────────────────────────────────
  buyCashUpgrade(upgrade: Palier) {
    const world = this.world();
    if (!world || upgrade.unlocked || world.money < upgrade.seuil) {
      this.snackmessage.set("Pas assez d'argent");
      return;
    }
    const newWorld: World = this.deepCopy(world);
    newWorld.money -= upgrade.seuil;
    const u = newWorld.upgrades.find((x) => x.name === upgrade.name)!;
    u.unlocked = true;
    this.applyBonusToWorld(newWorld, u);
    this.world.set(newWorld);
    this.snackmessage.set(`Upgrade "${upgrade.name}" acheté !`);

    this.cashUpgradeGQL.mutate({ variables: { user: this.user(), name: upgrade.name } }).subscribe({
      error: () => this.snackmessage.set('Erreur serveur upgrade'),
    });
  }

  // ── Angel upgrade ──────────────────────────────────────────────────────────
  buyAngelUpgrade(upgrade: Palier) {
    const world = this.world();
    if (!world || upgrade.unlocked || world.activeangels < upgrade.seuil) {
      this.snackmessage.set("Pas assez d'anges actifs");
      return;
    }
    const newWorld: World = this.deepCopy(world);
    newWorld.activeangels -= upgrade.seuil;
    const u = newWorld.angelupgrades.find((x) => x.name === upgrade.name)!;
    u.unlocked = true;
    this.applyBonusToWorld(newWorld, u);
    this.world.set(newWorld);
    this.snackmessage.set(`Angel upgrade "${upgrade.name}" acheté !`);

    this.angelUpgradeGQL.mutate({ variables: { user: this.user(), name: upgrade.name } }).subscribe({
      error: () => this.snackmessage.set('Erreur serveur angel upgrade'),
    });
  }

  // ── Reset world ────────────────────────────────────────────────────────────
  resetWorld() {
    this.resetWorldGQL.mutate({ variables: { user: this.user() } }).subscribe({
      next: () => {
        this.snackmessage.set('Partie remise à zéro ! Anges récupérés.');
        this.readWorld();
      },
      error: () => this.snackmessage.set('Erreur serveur reset'),
    });
  }

  // ── Calcul anges gagnés ────────────────────────────────────────────────────
  computeNewAngels(): number {
    const w = this.world();
    if (!w) return 0;
    return Math.max(0, Math.floor(Math.sqrt(w.score / 1000)) - w.totalangels);
  }

  // ── maxCanBuy ──────────────────────────────────────────────────────────────
  maxCanBuy(product: Product): number {
    const money = this.world()?.money ?? 0;
    if (money < product.cout) return 0;
    const c = product.croissance;
    return Math.floor(Math.log(1 + money * (c - 1) / product.cout) / Math.log(c));
  }

  // ── Application des bonus ──────────────────────────────────────────────────
  applyPaliersForProduct(world: World, product: Product): void {
    for (const palier of product.paliers) {
      if (!palier.unlocked && product.quantite >= palier.seuil) {
        palier.unlocked = true;
        this.applyBonusToWorld(world, palier);
        this.snackmessage.set(`Unlock "${palier.name}" débloqué !`);
      }
    }
  }

  applyAllUnlocks(world: World): void {
    for (const palier of world.allunlocks) {
      if (!palier.unlocked && world.products.every((p) => p.quantite >= palier.seuil)) {
        palier.unlocked = true;
        this.applyBonusToWorld(world, palier);
        this.snackmessage.set(`All-unlock "${palier.name}" débloqué !`);
      }
    }
  }

  applyBonusToWorld(world: World, palier: Palier): void {
    if (palier.typeratio === RatioType.Vitesse) {
      const p = world.products.find((p) => p.id === palier.idcible);
      if (p) p.vitesse = Math.max(100, Math.floor(p.vitesse / palier.ratio));
    } else if (palier.typeratio === RatioType.Gain) {
      if (palier.idcible === 0) {
        world.products.forEach((p) => { p.revenu *= palier.ratio; });
      } else if (palier.idcible === -1) {
        world.angelbonus *= palier.ratio;
      } else {
        const p = world.products.find((p) => p.id === palier.idcible);
        if (p) p.revenu *= palier.ratio;
      }
    } else if (palier.typeratio === RatioType.Ange) {
      world.angelbonus *= palier.ratio;
    }
  }

  private deepCopy<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }
}

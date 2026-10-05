import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import {
  World, Product, Palier, RatioType, GetWorldGQL, AcheterQtProduitGQL,
  LancerProductionProduitGQL, EngagerManagerGQL, AcheterCashUpgradeGQL,
  AcheterAngelUpgradeGQL, ResetWorldGQL,
} from './graphql/generated';
import { GAME_SERVER_URL } from './game.config';

@Injectable({ providedIn: 'root' })
export class GameServiceService implements OnDestroy {
  private getWorldGQL = inject(GetWorldGQL);
  private acheterQtGQL = inject(AcheterQtProduitGQL);
  private lancerProdGQL = inject(LancerProductionProduitGQL);
  private engagerMgrGQL = inject(EngagerManagerGQL);
  private cashUpgradeGQL = inject(AcheterCashUpgradeGQL);
  private angelUpgradeGQL = inject(AcheterAngelUpgradeGQL);
  private resetWorldGQL = inject(ResetWorldGQL);

  readonly server = signal(GAME_SERVER_URL);
  readonly user = signal('');
  readonly world = signal<World | null>(null);
  readonly snackmessage = signal('');
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal<string | null>(null);

  private session = 0;
  private readSequence = 0;
  private lastTick = Date.now();
  private timer: ReturnType<typeof setInterval>;
  private onVisibilityChange = () => {
    if (document.visibilityState === 'visible') void this.refreshWorld();
  };

  constructor() {
    let username: string | null = null;
    try { username = localStorage.getItem('username')?.trim() ?? null; } catch { /* Stockage désactivé. */ }
    username ||= 'Chef' + Math.floor(Math.random() * 100000);
    this.user.set(username);
    this.persistUsername(username);
    void this.loadWorld();

    // Une seule horloge calcule les gains et la progression de tous les produits.
    // Date.now permet de rattraper les cycles d'un onglet en arrière-plan.
    this.timer = setInterval(() => this.advanceProductions(), 50);
    document.addEventListener('visibilitychange', this.onVisibilityChange);
  }

  ngOnDestroy(): void {
    clearInterval(this.timer);
    document.removeEventListener('visibilitychange', this.onVisibilityChange);
    this.session++;
  }

  imageUrl(logo: string | null | undefined): string {
    if (!logo) return 'placeholder.svg';
    if (/^https?:\/\//i.test(logo)) return logo;
    return `${this.server().replace(/\/+$/, '')}/${logo.replace(/^\/+/, '')}`;
  }

  async readWorld(): Promise<void> { await this.refreshWorld(); }

  async refreshWorld(): Promise<void> {
    if (this.busy() || this.loading()) return;
    await this.loadWorld();
  }

  commitName(name: string): void {
    const username = name.trim();
    if (!/^[\p{L}\p{N} _-]{1,40}$/u.test(username)) {
      this.snackmessage.set('Pseudo : 1 à 40 lettres, chiffres, espaces, tirets ou underscores.');
      return;
    }
    if (username === this.user()) { void this.refreshWorld(); return; }
    // Une réponse en vol de l'ancien joueur ne doit pas modifier le nouveau.
    this.session++;
    this.busy.set(false);
    this.world.set(null);
    this.user.set(username);
    this.persistUsername(username);
    void this.loadWorld();
  }

  private persistUsername(username: string): void {
    try { localStorage.setItem('username', username); } catch { /* Le jeu reste utilisable. */ }
  }

  private async loadWorld(): Promise<boolean> {
    const session = this.session;
    const sequence = ++this.readSequence;
    this.loading.set(true);
    this.error.set(null);
    try {
      const result = await firstValueFrom(this.getWorldGQL.fetch(
        { variables: { user: this.user() }, fetchPolicy: 'no-cache' },
      ).pipe(timeout(10000)));
      if (session !== this.session || sequence !== this.readSequence) return false;
      if (!result.data?.getWorld) throw new Error('Monde absent de la réponse');
      this.world.set(this.deepCopy(result.data.getWorld));
      this.lastTick = Date.now();
      return true;
    } catch {
      if (session === this.session && sequence === this.readSequence) {
        this.world.set(null);
        this.error.set('Connexion au serveur impossible. Vérifiez que le backend est démarré, puis réessayez.');
      }
      return false;
    } finally {
      if (session === this.session && sequence === this.readSequence) this.loading.set(false);
    }
  }

  private canAct(): boolean {
    return !!this.world() && !this.busy() && !this.loading();
  }

  private async performAction(
    request: () => Promise<boolean>, apply: (world: World) => void, message: string,
  ): Promise<boolean> {
    if (!this.canAct()) return false;
    const session = this.session;
    this.busy.set(true);
    try {
      if (!await request()) throw new Error('Action refusée');
      if (session !== this.session) return false;
      // Les changements sont affichés après confirmation du serveur.
      this.advanceProductions();
      const world = this.deepCopy(this.world()!);
      apply(world);
      this.world.set(world);
      if (message) this.snackmessage.set(message);
      // Le serveur reste la référence pour le temps écoulé pendant la requête.
      return await this.loadWorld();
    } catch {
      if (session === this.session) {
        await this.loadWorld();
        this.snackmessage.set('Action non confirmée. Vérifiez votre connexion et le solde disponible, puis réessayez.');
      }
      return false;
    } finally {
      if (session === this.session) this.busy.set(false);
    }
  }

  productRevenue(product: Product): number {
    const world = this.world();
    return product.revenu * product.quantite * (1 + (world?.activeangels ?? 0) * (world?.angelbonus ?? 2) / 100);
  }

  advanceProductions(now = Date.now()): void {
    const elapsed = Math.max(0, now - this.lastTick);
    this.lastTick = now;
    const world = this.world();
    if (!world || !elapsed) return;
    let gain = 0;
    let changed = false;
    const multiplier = 1 + world.activeangels * world.angelbonus / 100;
    const products = world.products.map((product) => {
      if (product.quantite <= 0 || (!product.managerUnlocked && product.timeleft <= 0)) return product;
      const duration = Math.max(1, product.vitesse);
      const remaining = product.timeleft > 0 ? product.timeleft : duration;
      let cycles = 0;
      let timeleft = remaining - elapsed;
      if (timeleft <= 0) {
        cycles = product.managerUnlocked ? 1 + Math.floor(-timeleft / duration) : 1;
        timeleft = product.managerUnlocked ? duration - (-timeleft % duration) : 0;
      }
      gain += cycles * product.revenu * product.quantite * multiplier;
      changed = true;
      return { ...product, timeleft };
    });
    if (changed) this.world.set({ ...world, products, money: world.money + gain, score: world.score + gain });
  }

  productionCost(product: Product, quantity: number): number {
    if (!Number.isInteger(quantity) || quantity <= 0) return 0;
    if (quantity === 1) return product.cout;
    if (product.croissance === 1) return product.cout * quantity;
    return product.cout * (Math.pow(product.croissance, quantity) - 1) / (product.croissance - 1);
  }

  maxCanBuy(product: Product): number {
    const money = this.world()?.money ?? 0;
    if (product.cout <= 0 || money < product.cout || product.croissance < 1) return 0;
    let quantity = product.croissance === 1
      ? Math.floor(money / product.cout)
      : Math.floor(Math.log1p(money * (product.croissance - 1) / product.cout) / Math.log(product.croissance));
    quantity = Math.min(2147483647 - product.quantite, Math.max(0, quantity));
    // Corrige les arrondis au voisinage d'une quantité entière.
    if (quantity > 0 && this.productionCost(product, quantity) > money) quantity--;
    if (quantity < 2147483647 - product.quantite && this.productionCost(product, quantity + 1) <= money) quantity++;
    return quantity;
  }

  async buyProduct(quantity: number, product: Product): Promise<boolean> {
    const current = this.world()?.products.find((p) => p.id === product.id);
    if (!current || !Number.isInteger(quantity) || quantity <= 0 || quantity > this.maxCanBuy(current)) return false;
    const cost = this.productionCost(current, quantity);
    return this.performAction(
      async () => !!(await firstValueFrom(this.acheterQtGQL.mutate({
        variables: { user: this.user(), id: current.id, quantite: quantity },
      }).pipe(timeout(10000)))).data?.acheterQtProduit,
      (world) => {
        const target = world.products.find((p) => p.id === current.id)!;
        world.money = Math.max(0, world.money - cost);
        target.quantite += quantity;
        target.cout *= Math.pow(target.croissance, quantity);
        this.applyPaliersForProduct(world, target);
        this.applyAllUnlocks(world);
      }, '',
    );
  }

  async lancerProduction(productId: number): Promise<boolean> {
    const product = this.world()?.products.find((p) => p.id === productId);
    if (!product || product.quantite <= 0 || product.timeleft > 0 || product.managerUnlocked) return false;
    return this.performAction(
      async () => !!(await firstValueFrom(this.lancerProdGQL.mutate({
        variables: { user: this.user(), id: productId },
      }).pipe(timeout(10000)))).data?.lancerProductionProduit,
      (world) => { const target = world.products.find((p) => p.id === productId)!; target.timeleft = target.vitesse; }, '',
    );
  }

  async hireManager(manager: Palier): Promise<boolean> {
    const current = this.world()?.managers.find((m) => m.name === manager.name);
    if (!current || current.unlocked || this.world()!.money < current.seuil) return false;
    return this.performAction(
      async () => !!(await firstValueFrom(this.engagerMgrGQL.mutate({
        variables: { user: this.user(), name: current.name },
      }).pipe(timeout(10000)))).data?.engagerManager,
      (world) => {
        world.money = Math.max(0, world.money - current.seuil);
        world.managers.find((m) => m.name === current.name)!.unlocked = true;
        const product = world.products.find((p) => p.id === current.idcible)!;
        product.managerUnlocked = true;
        if (product.timeleft <= 0 && product.quantite > 0) product.timeleft = product.vitesse;
      }, `Manager ${current.name} engagé !`,
    );
  }

  async buyCashUpgrade(upgrade: Palier): Promise<boolean> {
    const current = this.world()?.upgrades.find((u) => u.name === upgrade.name);
    if (!current || current.unlocked || this.world()!.money < current.seuil) return false;
    return this.performAction(
      async () => !!(await firstValueFrom(this.cashUpgradeGQL.mutate({
        variables: { user: this.user(), name: current.name },
      }).pipe(timeout(10000)))).data?.acheterCashUpgrade,
      (world) => {
        world.money = Math.max(0, world.money - current.seuil);
        const target = world.upgrades.find((u) => u.name === current.name)!;
        target.unlocked = true;
        this.applyBonusToWorld(world, target);
      }, `Amélioration « ${current.name} » achetée !`,
    );
  }

  async buyAngelUpgrade(upgrade: Palier): Promise<boolean> {
    const current = this.world()?.angelupgrades.find((u) => u.name === upgrade.name);
    if (!current || current.unlocked || this.world()!.activeangels < current.seuil) return false;
    return this.performAction(
      async () => !!(await firstValueFrom(this.angelUpgradeGQL.mutate({
        variables: { user: this.user(), name: current.name },
      }).pipe(timeout(10000)))).data?.acheterAngelUpgrade,
      (world) => {
        world.activeangels -= current.seuil;
        const target = world.angelupgrades.find((u) => u.name === current.name)!;
        target.unlocked = true;
        this.applyBonusToWorld(world, target);
      }, `Amélioration angélique « ${current.name} » achetée !`,
    );
  }

  async resetWorld(): Promise<boolean> {
    return this.performAction(
      async () => !!(await firstValueFrom(this.resetWorldGQL.mutate({
        variables: { user: this.user() },
      }).pipe(timeout(10000)))).data?.resetWorld,
      () => {}, 'Partie remise à zéro ! Les nouveaux anges sont actifs.',
    );
  }

  computeNewAngels(): number {
    const world = this.world();
    return world ? Math.max(0, Math.floor(150 * Math.sqrt(world.score / 1e15)) - world.totalangels) : 0;
  }

  applyPaliersForProduct(world: World, product: Product): void {
    for (const palier of product.paliers) {
      if (!palier.unlocked && product.quantite >= palier.seuil) {
        palier.unlocked = true;
        this.applyBonusToWorld(world, palier);
        this.snackmessage.set(`Palier « ${palier.name} » débloqué !`);
      }
    }
  }

  applyAllUnlocks(world: World): void {
    for (const palier of world.allunlocks) {
      if (!palier.unlocked && world.products.length > 0 && world.products.every((p) => p.quantite >= palier.seuil)) {
        palier.unlocked = true;
        this.applyBonusToWorld(world, palier);
        this.snackmessage.set(`Palier global « ${palier.name} » débloqué !`);
      }
    }
  }

  applyBonusToWorld(world: World, palier: Palier): void {
    if (palier.typeratio === RatioType.Ange) {
      world.angelbonus += palier.ratio;
      return;
    }
    for (const product of world.products) {
      if (palier.idcible !== 0 && product.id !== palier.idcible) continue;
      if (palier.typeratio === RatioType.Gain) product.revenu *= palier.ratio;
      if (palier.typeratio === RatioType.Vitesse) {
        const previousDuration = product.vitesse;
        product.vitesse = Math.max(1, Math.floor(previousDuration / palier.ratio));
        if (product.timeleft > 0) {
          product.timeleft = Math.max(1, Math.ceil(product.timeleft * product.vitesse / previousDuration));
        }
      }
    }
  }

  private deepCopy<T>(object: T): T { return JSON.parse(JSON.stringify(object)); }
}
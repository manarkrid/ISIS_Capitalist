import { Injectable, OnDestroy, inject, signal } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import {
  World,
  Product,
  Palier,
  RatioType,
  GetWorldGQL,
  AcheterQtProduitGQL,
  LancerProductionProduitGQL,
  EngagerManagerGQL,
  AcheterCashUpgradeGQL,
  AcheterAngelUpgradeGQL,
  ResetWorldGQL,
} from './graphql/operations';
import {
  getServerUrl,
  normalizeServerUrl,
  SERVER_STORAGE_KEY,
} from './game.config';

@Injectable({ providedIn: 'root' })
export class GameService implements OnDestroy {
  private getWorldGQL = inject(GetWorldGQL);
  private acheterQtGQL = inject(AcheterQtProduitGQL);
  private lancerProdGQL = inject(LancerProductionProduitGQL);
  private engagerMgrGQL = inject(EngagerManagerGQL);
  private cashUpgradeGQL = inject(AcheterCashUpgradeGQL);
  private angelUpgradeGQL = inject(AcheterAngelUpgradeGQL);
  private resetWorldGQL = inject(ResetWorldGQL);

  readonly server = signal(getServerUrl());
  readonly user = signal('');
  readonly world = signal<World | null>(null);
  readonly snackmessage = signal('', { equal: () => false });
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
    try {
      username = localStorage.getItem('username')?.trim() ?? null;
    } catch {
      /* Stockage désactivé. */
    }
    username ||= 'Chef' + Math.floor(Math.random() * 100000);
    this.user.set(username);
    this.persistUsername(username);
    void this.loadWorld();

    // Une seule horloge calcule les gains et la progression de tous les produits.
    // Date.now permet de rattraper les cycles d'un onglet en arrière-plan.
    this.timer = setInterval(() => this.calcScore(), 50);
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

  changeServer(address: string): void {
    if (this.loading() || this.busy()) return;
    try {
      const normalized = normalizeServerUrl(address);
      localStorage.setItem(SERVER_STORAGE_KEY, normalized);
      this.session++;
      this.server.set(normalized);
      this.world.set(null);
      this.snackmessage.set('Adresse du serveur mise à jour.');
      void this.loadWorld();
    } catch {
      this.snackmessage.set(
        'Saisissez une adresse HTTP ou HTTPS valide. Le stockage du navigateur doit être accessible.',
      );
    }
  }

  async readWorld(): Promise<void> {
    await this.refreshWorld();
  }

  async refreshWorld(): Promise<void> {
    if (this.busy() || this.loading()) return;
    await this.loadWorld();
  }

  commitName(name: string): void {
    const username = name.trim();
    if (!/^[\p{L}\p{N} _-]{1,40}$/u.test(username)) {
      this.snackmessage.set(
        'Pseudo : 1 à 40 lettres, chiffres, espaces, tirets ou underscores.',
      );
      return;
    }
    if (username === this.user()) {
      void this.refreshWorld();
      return;
    }
    // Une réponse en vol de l'ancien joueur ne doit pas modifier le nouveau.
    this.session++;
    this.busy.set(false);
    this.world.set(null);
    this.user.set(username);
    this.persistUsername(username);
    void this.loadWorld();
  }

  private persistUsername(username: string): void {
    try {
      localStorage.setItem('username', username);
    } catch {
      /* Le jeu reste utilisable. */
    }
  }

  private async loadWorld(): Promise<boolean> {
    const session = this.session;
    const sequence = ++this.readSequence;
    this.loading.set(true);
    this.error.set(null);
    try {
      const result = await firstValueFrom(
        this.getWorldGQL
          .fetch({ user: this.user() }, { fetchPolicy: 'no-cache' })
          .pipe(timeout(10000)),
      );
      if (session !== this.session || sequence !== this.readSequence)
        return false;
      if (!result.data?.getWorld) throw new Error('Monde absent de la réponse');
      this.world.set(this.deepCopy(result.data.getWorld));
      this.lastTick = Date.now();
      return true;
    } catch {
      if (session === this.session && sequence === this.readSequence) {
        this.world.set(null);
        this.error.set(
          'Connexion au serveur impossible. Vérifiez que le backend est démarré, puis réessayez.',
        );
        this.snackmessage.set(
          'Connexion au serveur impossible. Vérifiez son adresse et réessayez.',
        );
      }
      return false;
    } finally {
      if (session === this.session && sequence === this.readSequence)
        this.loading.set(false);
    }
  }

  private canAct(): boolean {
    return !!this.world() && !this.busy() && !this.loading();
  }

  private async performAction(
    request: () => Promise<boolean>,
    apply: (world: World) => World,
    message: string,
  ): Promise<boolean> {
    if (!this.canAct()) return false;
    const session = this.session;
    this.busy.set(true);
    try {
      if (!(await request())) throw new Error('Action refusée');
      if (session !== this.session) return false;
      // Les changements sont affichés après confirmation du serveur.
      this.calcScore();
      const previous = this.world()!;
      const world = apply(previous);
      this.world.set(world);
      const unlockMessages = this.unlockedMessages(previous, world);
      if (message || unlockMessages.length) {
        this.snackmessage.set(
          [message, ...unlockMessages].filter(Boolean).join(' '),
        );
      }
      // Le serveur reste la référence pour le temps écoulé pendant la requête.
      return await this.loadWorld();
    } catch {
      if (session === this.session) {
        await this.loadWorld();
        this.snackmessage.set(
          'Action non confirmée. Vérifiez votre connexion et le solde disponible, puis réessayez.',
        );
      }
      return false;
    } finally {
      if (session === this.session) this.busy.set(false);
    }
  }

  productRevenue(product: Product): number {
    const world = this.world();
    return (
      product.revenu *
      product.quantite *
      (1 + ((world?.activeangels ?? 0) * (world?.angelbonus ?? 2)) / 100)
    );
  }

  calcScore(now = Date.now()): void {
    const elapsed = Math.max(0, now - this.lastTick);
    this.lastTick = now;
    const world = this.world();
    if (!world || !elapsed) return;
    const completed: { product: Product; cycles: number }[] = [];
    let changed = false;
    const products = world.products.map((product) => {
      if (
        product.quantite <= 0 ||
        (!product.managerUnlocked && product.timeleft <= 0)
      )
        return product;
      const duration = Math.max(1, product.vitesse);
      const remaining = product.timeleft > 0 ? product.timeleft : duration;
      let cycles = 0;
      let timeleft = remaining - elapsed;
      if (timeleft <= 0) {
        cycles = product.managerUnlocked
          ? 1 + Math.floor(-timeleft / duration)
          : 1;
        timeleft = product.managerUnlocked
          ? duration - (-timeleft % duration)
          : 0;
      }
      if (cycles > 0) completed.push({ product, cycles });
      changed = true;
      return { ...product, timeleft };
    });
    if (changed) {
      this.world.set({ ...world, products });
      for (const { product, cycles } of completed)
        this.productionDone(product, cycles);
    }
  }

  /** qt compte les cycles terminés, un seul pour une production manuelle. */
  productionDone(prod: Product, qt: number): void {
    const gain = this.productRevenue(prod) * qt;
    this.world.update((world) =>
      world
        ? {
            ...world,
            money: world.money + gain,
            score: world.score + gain,
          }
        : world,
    );
  }

  productionCost(product: Product, quantity: number): number {
    if (!Number.isInteger(quantity) || quantity <= 0) return 0;
    if (quantity === 1) return product.cout;
    if (product.croissance === 1) return product.cout * quantity;
    return (
      (product.cout * (Math.pow(product.croissance, quantity) - 1)) /
      (product.croissance - 1)
    );
  }

  maxCanBuy(product: Product): number {
    const money = this.world()?.money ?? 0;
    if (product.cout <= 0 || money < product.cout || product.croissance < 1)
      return 0;
    let quantity =
      product.croissance === 1
        ? Math.floor(money / product.cout)
        : Math.floor(
            Math.log1p((money * (product.croissance - 1)) / product.cout) /
              Math.log(product.croissance),
          );
    quantity = Math.min(2147483647 - product.quantite, Math.max(0, quantity));
    // Corrige les arrondis au voisinage d'une quantité entière.
    if (quantity > 0 && this.productionCost(product, quantity) > money)
      quantity--;
    if (
      quantity < 2147483647 - product.quantite &&
      this.productionCost(product, quantity + 1) <= money
    )
      quantity++;
    return quantity;
  }

  async buyProduct(quantity: number, product: Product): Promise<boolean> {
    const current = this.world()?.products.find((p) => p.id === product.id);
    if (
      !current ||
      !Number.isInteger(quantity) ||
      quantity <= 0 ||
      quantity > this.maxCanBuy(current)
    )
      return false;
    const cost = this.productionCost(current, quantity);
    return this.performAction(
      async () =>
        !!(
          await firstValueFrom(
            this.acheterQtGQL
              .mutate({
                user: this.user(),
                id: current.id,
                quantite: quantity,
              })
              .pipe(timeout(10000)),
          )
        ).data?.acheterQtProduit,
      (world) => {
        const products = world.products.map((p) =>
          p.id === current.id
            ? {
                ...p,
                quantite: p.quantite + quantity,
                cout: p.cout * Math.pow(p.croissance, quantity),
              }
            : p,
        );
        const purchased = {
          ...world,
          products,
          money: Math.max(0, world.money - cost),
        };
        return this.applyAllUnlocks(
          this.applyPaliersForProduct(purchased, current.id),
        );
      },
      `Achat confirmé : ${quantity} × ${current.name}.`,
    );
  }

  async lancerProduction(productId: number): Promise<boolean> {
    const product = this.world()?.products.find((p) => p.id === productId);
    if (
      !product ||
      product.quantite <= 0 ||
      product.timeleft > 0 ||
      product.managerUnlocked
    )
      return false;
    return this.performAction(
      async () =>
        !!(
          await firstValueFrom(
            this.lancerProdGQL
              .mutate({
                user: this.user(),
                id: productId,
              })
              .pipe(timeout(10000)),
          )
        ).data?.lancerProductionProduit,
      (world) => ({
        ...world,
        products: world.products.map((p) =>
          p.id === productId ? { ...p, timeleft: p.vitesse } : p,
        ),
      }),
      '',
    );
  }

  async hireManager(manager: Palier): Promise<boolean> {
    const current = this.world()?.managers.find((m) => m.name === manager.name);
    if (!current || current.unlocked || this.world()!.money < current.seuil)
      return false;
    return this.performAction(
      async () =>
        !!(
          await firstValueFrom(
            this.engagerMgrGQL
              .mutate({
                user: this.user(),
                name: current.name,
              })
              .pipe(timeout(10000)),
          )
        ).data?.engagerManager,
      (world) => ({
        ...world,
        money: Math.max(0, world.money - current.seuil),
        managers: world.managers.map((m) =>
          m.name === current.name ? { ...m, unlocked: true } : m,
        ),
        products: world.products.map((p) =>
          p.id === current.idcible
            ? {
                ...p,
                managerUnlocked: true,
                timeleft:
                  p.timeleft > 0 || p.quantite === 0 ? p.timeleft : p.vitesse,
              }
            : p,
        ),
      }),
      `Manager ${current.name} engagé !`,
    );
  }

  async buyCashUpgrade(upgrade: Palier): Promise<boolean> {
    const current = this.world()?.upgrades.find((u) => u.name === upgrade.name);
    if (!current || current.unlocked || this.world()!.money < current.seuil)
      return false;
    return this.performAction(
      async () =>
        !!(
          await firstValueFrom(
            this.cashUpgradeGQL
              .mutate({
                user: this.user(),
                name: current.name,
              })
              .pipe(timeout(10000)),
          )
        ).data?.acheterCashUpgrade,
      (world) =>
        this.applyBonusToWorld(
          {
            ...world,
            money: Math.max(0, world.money - current.seuil),
            upgrades: world.upgrades.map((u) =>
              u.name === current.name ? { ...u, unlocked: true } : u,
            ),
          },
          current,
        ),
      `Amélioration « ${current.name} » achetée !`,
    );
  }

  async buyAngelUpgrade(upgrade: Palier): Promise<boolean> {
    const current = this.world()?.angelupgrades.find(
      (u) => u.name === upgrade.name,
    );
    if (
      !current ||
      current.unlocked ||
      this.world()!.activeangels < current.seuil
    )
      return false;
    return this.performAction(
      async () =>
        !!(
          await firstValueFrom(
            this.angelUpgradeGQL
              .mutate({
                user: this.user(),
                name: current.name,
              })
              .pipe(timeout(10000)),
          )
        ).data?.acheterAngelUpgrade,
      (world) =>
        this.applyBonusToWorld(
          {
            ...world,
            activeangels: world.activeangels - current.seuil,
            angelupgrades: world.angelupgrades.map((u) =>
              u.name === current.name ? { ...u, unlocked: true } : u,
            ),
          },
          current,
        ),
      `Amélioration angélique « ${current.name} » achetée !`,
    );
  }

  async resetWorld(): Promise<boolean> {
    return this.performAction(
      async () =>
        !!(
          await firstValueFrom(
            this.resetWorldGQL
              .mutate({
                user: this.user(),
              })
              .pipe(timeout(10000)),
          )
        ).data?.resetWorld,
      (world) => world,
      'Partie remise à zéro ! Les nouveaux anges sont actifs.',
    );
  }

  computeNewAngels(): number {
    const world = this.world();
    return world
      ? Math.max(
          0,
          Math.floor(150 * Math.sqrt(world.score / 1e15)) - world.totalangels,
        )
      : 0;
  }

  /** Les transformations retournent une copie : aucun objet du signal n'est modifié en place. */
  applyPaliersForProduct(world: World, productId: number): World {
    const product = world.products.find((p) => p.id === productId);
    if (!product) return world;
    let result = world;
    for (const palier of product.paliers) {
      if (!palier.unlocked && product.quantite >= palier.seuil) {
        result = this.applyBonusToWorld(result, palier);
        result = {
          ...result,
          products: result.products.map((p) =>
            p.id === productId
              ? {
                  ...p,
                  paliers: p.paliers.map((item) =>
                    item.name === palier.name
                      ? { ...item, unlocked: true }
                      : item,
                  ),
                }
              : p,
          ),
        };
      }
    }
    return result;
  }

  applyAllUnlocks(world: World): World {
    let result = world;
    for (const palier of world.allunlocks) {
      if (
        !palier.unlocked &&
        world.products.length > 0 &&
        world.products.every((p) => p.quantite >= palier.seuil)
      ) {
        result = this.applyBonusToWorld(result, palier);
        result = {
          ...result,
          allunlocks: result.allunlocks.map((item) =>
            item.name === palier.name ? { ...item, unlocked: true } : item,
          ),
        };
      }
    }
    return result;
  }

  applyBonusToWorld(world: World, palier: Palier): World {
    if (palier.typeratio === RatioType.Ange)
      return { ...world, angelbonus: world.angelbonus + palier.ratio };
    return {
      ...world,
      products: world.products.map((product) => {
        if (palier.idcible !== 0 && product.id !== palier.idcible)
          return product;
        if (palier.typeratio === RatioType.Gain)
          return { ...product, revenu: product.revenu * palier.ratio };
        if (palier.typeratio === RatioType.Vitesse) {
          const vitesse = Math.max(
            1,
            Math.floor(product.vitesse / palier.ratio),
          );
          return {
            ...product,
            vitesse,
            timeleft: Math.ceil((product.timeleft * vitesse) / product.vitesse),
          };
        }
        return product;
      }),
    };
  }

  private unlockedMessages(previous: World, next: World): string[] {
    const messages: string[] = [];
    for (const product of next.products) {
      const old = previous.products.find((p) => p.id === product.id);
      for (const palier of product.paliers) {
        if (
          palier.unlocked &&
          old?.paliers.some((p) => p.name === palier.name && !p.unlocked)
        ) {
          messages.push(`Palier « ${palier.name} » débloqué !`);
        }
      }
    }
    for (const palier of next.allunlocks) {
      if (
        palier.unlocked &&
        previous.allunlocks.some((p) => p.name === palier.name && !p.unlocked)
      ) {
        messages.push(`Palier global « ${palier.name} » débloqué !`);
      }
    }
    return messages;
  }

  private deepCopy<T>(object: T): T {
    return JSON.parse(JSON.stringify(object));
  }
}

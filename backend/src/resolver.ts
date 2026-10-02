import { Inject } from '@nestjs/common';
import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AppService } from './app.service.js';
import { Palier, Product, World } from './graphql.js';

@Resolver('World')
export class GraphQlResolver {
  constructor(@Inject(AppService) private readonly service: AppService) {}

  @Query()
  getWorld(@Args('user') user: string): World {
    const world = this.loadWorld(user);
    this.service.saveWorld(user, world);
    return world;
  }

  private loadWorld(user: string): World {
    return this.service.updateWorld(this.service.readUserWorld(user));
  }

  @Mutation()
  acheterQtProduit(
    @Args('user') user: string,
    @Args('id') id: number,
    @Args('quantite') quantite: number,
  ): Product {
    const world = this.loadWorld(user);
    const product = this.service.product(world, id);
    const cost = this.service.purchaseCost(product, quantite);
    if (world.money < cost) {
      throw new Error("Pas assez d'argent pour acheter cette quantité.");
    }
    world.money -= cost;
    product.quantite += quantite;
    product.cout *= Math.pow(product.croissance, quantite);
    if (product.managerUnlocked && product.timeleft === 0) {
      product.timeleft = product.vitesse;
    }
    this.service.checkProductPaliers(world, product);
    this.service.checkAllUnlocks(world);
    this.service.saveWorld(user, world);
    return product;
  }

  @Mutation()
  lancerProductionProduit(
    @Args('user') user: string,
    @Args('id') id: number,
  ): Product {
    const world = this.loadWorld(user);
    const product = this.service.product(world, id);
    if (product.quantite === 0) {
      throw new Error('Achetez au moins un exemplaire avant de produire.');
    }
    if (product.timeleft > 0) {
      throw new Error('La production est déjà en cours.');
    }
    product.timeleft = product.vitesse;
    this.service.saveWorld(user, world);
    return product;
  }

  @Mutation()
  engagerManager(
    @Args('user') user: string,
    @Args('name') name: string,
  ): Palier {
    const world = this.loadWorld(user);
    const manager = this.availablePalier(world.managers, name);
    const product = this.service.product(world, manager.idcible);
    if (world.money < manager.seuil) {
      throw new Error("Pas assez d'argent pour engager ce manager.");
    }
    world.money -= manager.seuil;
    product.managerUnlocked = true;
    if (product.quantite > 0 && product.timeleft === 0) {
      product.timeleft = product.vitesse;
    }
    manager.unlocked = true;
    this.service.saveWorld(user, world);
    return manager;
  }

  private availablePalier(paliers: Palier[], name: string): Palier {
    const palier = paliers.find((item) => item.name === name);
    if (!palier) throw new Error(`Le bonus ou manager « ${name} » n'existe pas.`);
    if (palier.unlocked) throw new Error(`« ${name} » est déjà débloqué.`);
    return palier;
  }

  @Mutation()
  acheterCashUpgrade(
    @Args('user') user: string,
    @Args('name') name: string,
  ): Palier {
    const world = this.loadWorld(user);
    const upgrade = this.availablePalier(world.upgrades, name);
    if (world.money < upgrade.seuil) {
      throw new Error("Pas assez d'argent pour acheter cette amélioration.");
    }
    world.money -= upgrade.seuil;
    this.service.applyPalierBonus(world, upgrade);
    upgrade.unlocked = true;
    this.service.saveWorld(user, world);
    return upgrade;
  }

  @Mutation()
  acheterAngelUpgrade(
    @Args('user') user: string,
    @Args('name') name: string,
  ): Palier {
    const world = this.loadWorld(user);
    const upgrade = this.availablePalier(world.angelupgrades, name);
    if (world.activeangels < upgrade.seuil) {
      throw new Error("Pas assez d'anges actifs pour acheter cette amélioration.");
    }
    world.activeangels -= upgrade.seuil;
    this.service.applyPalierBonus(world, upgrade);
    upgrade.unlocked = true;
    this.service.saveWorld(user, world);
    return upgrade;
  }

  @Mutation()
  resetWorld(@Args('user') user: string): World {
    const world = this.loadWorld(user);
    const newAngels = Math.max(
      0,
      this.service.calculateAngels(world.score) - world.totalangels,
    );
    const fresh = this.service.createWorld();
    fresh.score = world.score;
    fresh.totalangels = world.totalangels + newAngels;
    fresh.activeangels = world.activeangels + newAngels;
    this.service.saveWorld(user, fresh);
    return fresh;
  }
}

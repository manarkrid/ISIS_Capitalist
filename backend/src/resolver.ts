import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { AppService } from './app.service.js';
import { origworld } from './origworld.js';

@Resolver('World')
export class GraphQlResolver {
  constructor(private service: AppService) {}

  @Query()
  async getWorld(@Args('user') user: string) {
    const world = this.service.readUserWorld(user);
    const updated = this.service.updateWorld(world);
    this.service.saveWorld(user, updated);
    return updated;
  }

  @Mutation()
  async acheterQtProduit(
    @Args('user') user: string,
    @Args('id') id: number,
    @Args('quantite') quantite: number,
  ) {
    const world = this.service.readUserWorld(user);
    this.service.updateWorld(world);

    const product = world.products.find((p: any) => p.id === id);
    if (!product) {
      throw new Error(`Le produit avec l'id ${id} n'existe pas`);
    }

    // Calcul du coût total pour acheter `quantite` unités
    // cout courant = cout * croissance^quantite_actuelle ... mais on simplifie :
    // coût de n unités = cout * (croissance^n - 1) / (croissance - 1)
    let totalCost = 0;
    for (let i = 0; i < quantite; i++) {
      totalCost +=
        product.cout * Math.pow(product.croissance, product.quantite + i);
    }
    // On utilise le cout stocké qui représente le prochain achat
    // cout stocké = cout_base * croissance^quantite
    // Pour n achats : sum = cout_stocke * (croissance^n - 1) / (croissance - 1)
    const coutActuel = product.cout;
    let coutTotal: number;
    if (quantite === 1) {
      coutTotal = coutActuel;
    } else {
      coutTotal =
        (coutActuel * (Math.pow(product.croissance, quantite) - 1)) /
        (product.croissance - 1);
    }

    world.money -= coutTotal;

    product.quantite += quantite;

    // Mise à jour du cout pour le prochain achat
    product.cout = coutActuel * Math.pow(product.croissance, quantite);

    // Vérification des paliers produit
    this.service.checkProductPaliers(world, product);

    // Vérification des allunlocks
    this.service.checkAllUnlocks(world);

    this.service.saveWorld(user, world);
    return product;
  }

  @Mutation()
  async lancerProductionProduit(
    @Args('user') user: string,
    @Args('id') id: number,
  ) {
    const world = this.service.readUserWorld(user);
    this.service.updateWorld(world);

    const product = world.products.find((p: any) => p.id === id);
    if (!product) {
      throw new Error(`Le produit avec l'id ${id} n'existe pas`);
    }

    product.timeleft = product.vitesse;

    this.service.saveWorld(user, world);
    return product;
  }

  @Mutation()
  async engagerManager(
    @Args('user') user: string,
    @Args('name') name: string,
  ) {
    const world = this.service.readUserWorld(user);
    this.service.updateWorld(world);

    const manager = world.managers.find((m: any) => m.name === name);
    if (!manager) {
      throw new Error(`Le manager "${name}" n'existe pas`);
    }

    if (world.money < manager.seuil) {
      throw new Error(`Pas assez d'argent pour engager ce manager`);
    }

    world.money -= manager.seuil;

    const product = world.products.find((p: any) => p.id === manager.idcible);
    if (product) {
      product.managerUnlocked = true;
      if (product.timeleft === 0) {
        product.timeleft = product.vitesse;
      }
    }
    manager.unlocked = true;

    this.service.saveWorld(user, world);
    return manager;
  }

  @Mutation()
  async acheterCashUpgrade(
    @Args('user') user: string,
    @Args('name') name: string,
  ) {
    const world = this.service.readUserWorld(user);
    this.service.updateWorld(world);

    const upgrade = world.upgrades.find((u: any) => u.name === name);
    if (!upgrade) {
      throw new Error(`L'upgrade "${name}" n'existe pas`);
    }
    if (upgrade.unlocked) {
      throw new Error(`L'upgrade "${name}" est déjà débloquée`);
    }
    if (world.money < upgrade.seuil) {
      throw new Error(`Pas assez d'argent pour acheter cet upgrade`);
    }

    world.money -= upgrade.seuil;
    upgrade.unlocked = true;
    this.service.applyPalierBonus(world, upgrade);

    this.service.saveWorld(user, world);
    return upgrade;
  }

  @Mutation()
  async acheterAngelUpgrade(
    @Args('user') user: string,
    @Args('name') name: string,
  ) {
    const world = this.service.readUserWorld(user);
    this.service.updateWorld(world);

    const upgrade = world.angelupgrades.find((u: any) => u.name === name);
    if (!upgrade) {
      throw new Error(`L'angel upgrade "${name}" n'existe pas`);
    }
    if (upgrade.unlocked) {
      throw new Error(`L'angel upgrade "${name}" est déjà débloquée`);
    }
    if (world.activeangels < upgrade.seuil) {
      throw new Error(`Pas assez d'anges actifs pour acheter cet upgrade`);
    }

    world.activeangels -= upgrade.seuil;
    upgrade.unlocked = true;
    this.service.applyPalierBonus(world, upgrade);

    this.service.saveWorld(user, world);
    return upgrade;
  }

  @Mutation()
  async resetWorld(@Args('user') user: string) {
    const world = this.service.readUserWorld(user);
    this.service.updateWorld(world);

    // Calcul des anges gagnés cette partie
    const newAngels = this.service.calculateAngels(world.score);

    // Repart du monde original
    const fresh = JSON.parse(JSON.stringify(origworld));

    // Conserve le score et cumule les anges
    fresh.score = world.score;
    fresh.totalangels = world.totalangels + newAngels;
    fresh.activeangels = world.activeangels + newAngels;

    this.service.saveWorld(user, fresh);
    return fresh;
  }
}

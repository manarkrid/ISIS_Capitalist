import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { Palier, Product, RatioType, World } from './graphql.js';
import { origworld } from './origworld.js';

const GRAPHQL_INT_MAX = 2_147_483_647;

@Injectable()
export class AppService {
  private readonly worldsDirectory =
    process.env.USERWORLDS_DIR ?? path.join(process.cwd(), 'userworlds');

  private worldFile(user: string): string {
    const name = user.trim();
    if (!/^[\p{L}\p{N}_ -]{1,40}$/u.test(name)) {
      throw new Error(
        'Le pseudo doit contenir 1 à 40 lettres, chiffres, espaces, tirets ou underscores.',
      );
    }
    return path.join(this.worldsDirectory, `${name}-world.json`);
  }

  createWorld(): World {
    const world: World = structuredClone(origworld);
    world.lastupdate = new Date().toISOString();
    return world;
  }

  readUserWorld(user: string): World {
    const filename = this.worldFile(user);
    let data: string;
    try {
      data = fs.readFileSync(filename, 'utf8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return this.createWorld();
      }
      throw new Error('Impossible de lire la sauvegarde de ce joueur.', {
        cause: error,
      });
    }

    try {
      const world: unknown = JSON.parse(data);
      this.validateWorld(world);
      return world;
    } catch (error) {
      // Une sauvegarde abîmée doit rester disponible pour être réparée.
      throw new Error('La sauvegarde est invalide ; elle a été conservée.', {
        cause: error,
      });
    }
  }

  saveWorld(user: string, world: World): void {
    const filename = this.worldFile(user);
    this.validateWorld(world);
    const temporary = `${filename}.${randomUUID()}.tmp`;
    try {
      fs.mkdirSync(this.worldsDirectory, { recursive: true });
      fs.writeFileSync(temporary, JSON.stringify(world), 'utf8');
      // Le renommage remplace le fichier d'un seul coup, après écriture complète.
      fs.renameSync(temporary, filename);
    } catch (error) {
      throw new Error('Impossible de sauvegarder la partie.', { cause: error });
    } finally {
      if (fs.existsSync(temporary)) fs.unlinkSync(temporary);
    }
  }

  /** Accepte aussi les timestamps numériques des anciennes sauvegardes. */
  private timestamp(value: unknown): number {
    if (typeof value === 'number') return value;
    if (typeof value !== 'string') return NaN;
    return /^\d+$/.test(value) ? Number(value) : Date.parse(value);
  }

  private validateWorld(value: unknown): asserts value is World {
    const record = (item: unknown): item is Record<string, unknown> =>
      typeof item === 'object' && item !== null;
    const number = (item: unknown): item is number =>
      typeof item === 'number' && Number.isFinite(item) && item >= 0;
    const integer = (item: unknown): item is number =>
      number(item) && Number.isInteger(item) && item <= GRAPHQL_INT_MAX;
    const palier = (item: unknown): boolean =>
      record(item) &&
      typeof item.name === 'string' &&
      typeof item.logo === 'string' &&
      number(item.seuil) &&
      Number.isInteger(item.idcible) &&
      integer(item.ratio) &&
      Object.values(RatioType).includes(item.typeratio as RatioType) &&
      typeof item.unlocked === 'boolean';
    const paliers = (items: unknown): boolean =>
      Array.isArray(items) && items.every(palier);
    const product = (item: unknown): boolean =>
      record(item) &&
      integer(item.id) &&
      typeof item.name === 'string' &&
      typeof item.logo === 'string' &&
      number(item.cout) &&
      number(item.croissance) &&
      item.croissance >= 1 &&
      number(item.revenu) &&
      integer(item.vitesse) &&
      item.vitesse > 0 &&
      integer(item.quantite) &&
      integer(item.timeleft) &&
      item.timeleft <= item.vitesse &&
      typeof item.managerUnlocked === 'boolean' &&
      paliers(item.paliers);

    if (
      !record(value) ||
      typeof value.name !== 'string' ||
      typeof value.logo !== 'string' ||
      !number(value.money) ||
      !number(value.score) ||
      !integer(value.totalangels) ||
      !integer(value.activeangels) ||
      value.activeangels > value.totalangels ||
      !integer(value.angelbonus) ||
      !Number.isFinite(this.timestamp(value.lastupdate)) ||
      !Array.isArray(value.products) ||
      value.products.length === 0 ||
      !value.products.every(product) ||
      !paliers(value.allunlocks) ||
      !paliers(value.upgrades) ||
      !paliers(value.angelupgrades) ||
      !paliers(value.managers)
    ) {
      throw new Error('Le monde contient des valeurs invalides.');
    }
  }

  /** Les gains restent identiques après plusieurs rafraîchissements ou une absence. */
  updateWorld(world: World): World {
    const now = Date.now();
    const previous = this.timestamp(world.lastupdate);
    const elapsed = previous > 0 ? Math.max(0, now - previous) : 0;
    world.lastupdate = new Date(Math.max(now, previous || now)).toISOString();
    const angelMultiplier = 1 + (world.activeangels * world.angelbonus) / 100;

    for (const product of world.products) {
      if (product.quantite === 0) {
        product.timeleft = 0;
        continue;
      }

      let cycles = 0;
      if (product.managerUnlocked) {
        const remaining = product.timeleft || product.vitesse;
        if (elapsed < remaining) {
          product.timeleft = remaining - elapsed;
        } else {
          const afterFirstCycle = elapsed - remaining;
          cycles = 1 + Math.floor(afterFirstCycle / product.vitesse);
          product.timeleft =
            product.vitesse - (afterFirstCycle % product.vitesse);
        }
      } else if (product.timeleft > 0) {
        if (elapsed >= product.timeleft) cycles = 1;
        product.timeleft = Math.max(0, product.timeleft - elapsed);
      }

      const gain = cycles * product.revenu * product.quantite * angelMultiplier;
      world.money += gain;
      world.score += gain;
    }
    return world;
  }

  product(world: World, id: number): Product {
    const product = world.products.find((item) => item.id === id);
    if (!product) throw new Error(`Le produit avec l'id ${id} n'existe pas.`);
    return product;
  }

  purchaseCost(product: Product, quantity: number): number {
    if (
      !Number.isInteger(quantity) ||
      quantity < 1 ||
      quantity > GRAPHQL_INT_MAX - product.quantite
    ) {
      throw new Error('La quantité achetée doit être un entier positif valide.');
    }
    if (quantity === 1) return product.cout;
    const cost =
      product.croissance === 1
        ? product.cout * quantity
        : (product.cout * (Math.pow(product.croissance, quantity) - 1)) /
          (product.croissance - 1);
    if (!Number.isFinite(cost)) {
      throw new Error('La quantité demandée est trop élevée.');
    }
    return cost;
  }

  checkProductPaliers(world: World, product: Product): void {
    for (const palier of product.paliers) {
      if (!palier.unlocked && product.quantite >= palier.seuil) {
        this.applyPalierBonus(world, palier);
        palier.unlocked = true;
      }
    }
  }

  checkAllUnlocks(world: World): void {
    for (const palier of world.allunlocks) {
      if (
        !palier.unlocked &&
        world.products.every((product) => product.quantite >= palier.seuil)
      ) {
        this.applyPalierBonus(world, palier);
        palier.unlocked = true;
      }
    }
  }

  applyPalierBonus(world: World, palier: Palier): void {
    if (palier.typeratio === RatioType.ange) {
      world.angelbonus += palier.ratio;
      return;
    }
    if (palier.ratio <= 0) throw new Error('Ce bonus est invalide.');
    const products =
      palier.idcible === 0
        ? world.products
        : [this.product(world, palier.idcible)];
    for (const product of products) {
      if (palier.typeratio === RatioType.gain) {
        product.revenu *= palier.ratio;
      } else if (palier.typeratio === RatioType.vitesse) {
        const oldSpeed = product.vitesse;
        product.vitesse = Math.max(1, Math.floor(oldSpeed / palier.ratio));
        product.timeleft = Math.ceil(
          (product.timeleft * product.vitesse) / oldSpeed,
        );
      }
    }
  }

  calculateAngels(score: number): number {
    return Math.floor(150 * Math.sqrt(score / 1e15));
  }
}

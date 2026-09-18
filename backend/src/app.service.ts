import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import { origworld } from './origworld.js';

@Injectable()
export class AppService {

  readUserWorld(user: string): any {
    try {
      const data = fs.readFileSync(
        path.join(process.cwd(), 'userworlds/', user + '-world.json'),
      );
      return JSON.parse(data.toString());
    } catch (e: unknown) {
      console.log((e as Error).message);
      return JSON.parse(JSON.stringify(origworld));
    }
  }

  saveWorld(user: string, world: any): void {
    fs.writeFile(
      path.join(process.cwd(), 'userworlds/', user + '-world.json'),
      JSON.stringify(world),
      (err) => {
        if (err) {
          console.error(err);
          throw new Error(`Erreur d'écriture du monde coté serveur`);
        }
      },
    );
  }

  /**
   * Calcule l'évolution du monde en fonction du temps écoulé depuis lastupdate.
   * Pour chaque produit, calcule les revenus générés et met à jour timeleft.
   */
  updateWorld(world: any): any {
    const now = Date.now();
    const elapsed = world.lastupdate === 0 ? 0 : now - world.lastupdate;
    world.lastupdate = now;

    if (elapsed <= 0) return world;

    // Calcul du bonus ange : activeangels * angelbonus %
    const angelMultiplier = 1 + (world.activeangels * world.angelbonus) / 100;

    for (const product of world.products) {
      if (product.quantite <= 0) continue;

      const revenuTotal = product.revenu * product.quantite * angelMultiplier;

      if (product.managerUnlocked) {
        // Avec manager : calcule combien de cycles complets se sont écoulés
        const cycles = Math.floor(elapsed / product.vitesse);
        if (cycles > 0) {
          const gain = revenuTotal * cycles;
          world.money += gain;
          world.score += gain;
        }
        // Mise à jour timeleft : reste du cycle en cours
        const remainder = elapsed % product.vitesse;
        if (product.timeleft > 0) {
          product.timeleft = Math.max(0, product.timeleft - elapsed);
          if (product.timeleft === 0) {
            // relance auto
            product.timeleft = product.vitesse - remainder;
          }
        } else {
          // Manager relance automatiquement
          product.timeleft = product.vitesse - remainder;
        }
      } else {
        // Sans manager : un seul cycle si timeleft a expiré
        if (product.timeleft > 0) {
          if (product.timeleft <= elapsed) {
            world.money += revenuTotal;
            world.score += revenuTotal;
            product.timeleft = 0;
          } else {
            product.timeleft -= elapsed;
          }
        }
      }
    }

    return world;
  }

  /**
   * Vérifie et débloque les paliers d'un produit selon sa quantité.
   * Applique les bonus correspondants.
   */
  checkProductPaliers(world: any, product: any): void {
    for (const palier of product.paliers) {
      if (!palier.unlocked && product.quantite >= palier.seuil) {
        palier.unlocked = true;
        this.applyPalierBonus(world, palier);
      }
    }
  }

  /**
   * Vérifie les allunlocks : se débloquent quand TOUS les produits
   * ont une quantité >= seuil.
   */
  checkAllUnlocks(world: any): void {
    for (const palier of world.allunlocks) {
      if (!palier.unlocked) {
        const allAbove = world.products.every(
          (p: any) => p.quantite >= palier.seuil,
        );
        if (allAbove) {
          palier.unlocked = true;
          this.applyPalierBonus(world, palier);
        }
      }
    }
  }

  /**
   * Applique le bonus d'un palier selon son type.
   */
  applyPalierBonus(world: any, palier: any): void {
    if (palier.typeratio === 'vitesse') {
      // Réduit la vitesse (temps de production) du produit cible
      const product = world.products.find((p: any) => p.id === palier.idcible);
      if (product) {
        product.vitesse = Math.floor(product.vitesse / palier.ratio);
      }
    } else if (palier.typeratio === 'gain') {
      if (palier.idcible === 0) {
        // Bonus sur tous les produits
        for (const p of world.products) {
          p.revenu *= palier.ratio;
        }
      } else if (palier.idcible === -1) {
        // Bonus sur angelbonus
        world.angelbonus *= palier.ratio;
      } else {
        // Bonus sur un produit spécifique
        const product = world.products.find(
          (p: any) => p.id === palier.idcible,
        );
        if (product) {
          product.revenu *= palier.ratio;
        }
      }
    } else if (palier.typeratio === 'ange') {
      // Bonus sur angelbonus
      world.angelbonus *= palier.ratio;
    }
  }

  /**
   * Calcule le nombre d'anges gagnés en fonction du score.
   * Formule classique : floor(sqrt(score / 1000))
   */
  calculateAngels(score: number): number {
    return Math.floor(Math.sqrt(score / 1000));
  }
}

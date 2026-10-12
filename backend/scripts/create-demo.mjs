import 'reflect-metadata';
import { AppService } from '../dist/app.service.js';

// Ce pseudo est réservé à la démonstration : relancer la commande remet sa partie à zéro.
const username = 'Soutenance';
const service = new AppService();
const world = service.createWorld();

// Valeurs de départ modifiables pour préparer la présentation.
world.money = 1_000_000_000;
world.score = 4_000_000_000_000_000;
world.totalangels = 150;
world.activeangels = 150;

for (const product of world.products) {
  // Un achat suffit pour montrer le premier palier des Cookies.
  // Un exemplaire de chaque autre produit déclenche le premier palier global.
  const quantity = product.id === 1 ? 24 : 9;
  product.cout *= Math.pow(product.croissance, quantity - product.quantite);
  product.quantite = quantity;
}

service.saveWorld(username, world);
console.log(`Partie « ${username} » prête pour la démonstration.`);
console.log(`Argent : ${world.money.toLocaleString('fr-FR')} DT ; anges actifs : ${world.activeangels}.`);
console.log(`Nouveaux anges disponibles au reset : ${service.calculateAngels(world.score) - world.totalangels}.`);
console.log('Dans le jeu, saisir Soutenance comme pseudo et valider (ou actualiser cette partie).');

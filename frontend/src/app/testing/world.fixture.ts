import { World } from '../graphql/operations';

export function testWorld(): World {
  return {
    name: 'Tunisian Capitalist', logo: '', money: 100, score: 0,
    activeangels: 0, totalangels: 0, angelbonus: 2, lastupdate: new Date().toISOString(),
    allunlocks: [], upgrades: [], angelupgrades: [], managers: [],
    products: [{ id: 1, name: 'Cookies', logo: '', quantite: 1, cout: 10, croissance: 1.07,
      revenu: 1, vitesse: 1000, timeleft: 0, managerUnlocked: false, paliers: [] }],
  };
}


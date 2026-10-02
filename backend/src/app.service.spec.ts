import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { AppService } from './app.service.js';
import { Palier, RatioType, World } from './graphql.js';
import { GraphQlResolver } from './resolver.js';

describe('Règles du jeu et sauvegarde', () => {
  let directory: string;
  let service: AppService;
  let resolver: GraphQlResolver;
  const now = new Date('2026-09-30T12:00:00Z');

  beforeEach(() => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'capitalist-test-'));
    vi.stubEnv('USERWORLDS_DIR', directory);
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(now);
    service = new AppService();
    resolver = new GraphQlResolver(service);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllEnvs();
    fs.rmSync(directory, { recursive: true, force: true });
  });

  function world(): World {
    const result = service.createWorld();
    result.money = 0;
    result.products[0].quantite = 2;
    result.products[0].revenu = 10;
    result.products[0].vitesse = 1000;
    result.products[0].timeleft = 250;
    return result;
  }

  function advance(milliseconds: number): void {
    vi.setSystemTime(Date.now() + milliseconds);
  }

  function bonus(type: RatioType, target = 0, ratio = 2): Palier {
    return {
      name: 'Bonus de test', logo: '', seuil: 1,
      typeratio: type, idcible: target, ratio, unlocked: false,
    };
  }

  it('termine exactement une production manuelle pendant une absence', () => {
    const current = world();
    advance(10_000);
    service.updateWorld(current);
    expect(current.money).toBe(20);
    expect(current.score).toBe(20);
    expect(current.products[0].timeleft).toBe(0);
    advance(10_000);
    service.updateWorld(current);
    expect(current.money).toBe(20);
  });

  it('conserve le temps restant lors des rafraîchissements partiels', () => {
    const current = world();
    advance(200);
    service.updateWorld(current);
    expect(current.money).toBe(0);
    expect(current.products[0].timeleft).toBe(50);
    advance(50);
    service.updateWorld(current);
    expect(current.money).toBe(20);
    expect(current.products[0].timeleft).toBe(0);
  });

  it('compte le cycle entamé du manager avant les cycles complets', () => {
    const current = world();
    current.products[0].managerUnlocked = true;
    advance(2250);
    service.updateWorld(current);
    expect(current.money).toBe(60);
    expect(current.products[0].timeleft).toBe(1000);
  });

  it('donne les mêmes gains avec 100 rafraîchissements ou une seule absence', () => {
    const offline = world();
    offline.products[0].managerUnlocked = true;
    const refreshed = structuredClone(offline);
    for (let i = 0; i < 100; i++) {
      advance(37);
      service.updateWorld(refreshed);
    }
    service.updateWorld(offline);
    expect(refreshed).toEqual(offline);
    expect(offline.money).toBe(80);
    expect(offline.products[0].timeleft).toBe(550);
  });

  it('un manager ne produit rien sans exemplaire et démarre à son premier achat', () => {
    const current = world();
    const product = current.products[1];
    product.managerUnlocked = true;
    current.money = 1e6;
    service.saveWorld('Joueur', current);
    advance(10_000);
    const loaded = resolver.getWorld('Joueur');
    expect(loaded.products[1].timeleft).toBe(0);
    const purchased = resolver.acheterQtProduit('Joueur', product.id, 1);
    expect(purchased.timeleft).toBe(product.vitesse);
  });

  it('applique le pourcentage des anges actifs aux revenus et au score', () => {
    const current = world();
    current.activeangels = 10;
    current.totalangels = 10;
    current.angelbonus = 3;
    advance(250);
    service.updateWorld(current);
    expect(current.money).toBe(26);
    expect(current.score).toBe(26);
  });

  it('accepte les anciennes dates numériques sans accorder de revenu depuis 1970', () => {
    const current = world();
    current.products[0].managerUnlocked = true;
    const saved = { ...current, lastupdate: 0 };
    fs.writeFileSync(path.join(directory, 'Ancien-world.json'), JSON.stringify(saved));
    expect(resolver.getWorld('Ancien').score).toBe(0);
    saved.lastupdate = now.getTime() - 250;
    fs.writeFileSync(path.join(directory, 'Ancien-world.json'), JSON.stringify(saved));
    expect(resolver.getWorld('Ancien').score).toBe(20);
  });

  it('les boosts de vitesse touchent tous les produits et leur production en cours', () => {
    const current = world();
    const previous = current.products.map((product) => ({ ...product }));
    service.applyPalierBonus(current, bonus(RatioType.vitesse));
    current.products.forEach((product, index) => {
      expect(product.vitesse).toBe(Math.floor(previous[index].vitesse / 2));
    });
    expect(current.products[0].timeleft).toBe(125);
    current.products[0].vitesse = 1;
    current.products[0].timeleft = 1;
    service.applyPalierBonus(current, bonus(RatioType.vitesse, 1, 10));
    expect(current.products[0].vitesse).toBe(1);
    expect(current.products[0].timeleft).toBe(1);
  });

  it('ajoute le bonus ange au pourcentage existant', () => {
    const current = world();
    service.applyPalierBonus(current, bonus(RatioType.ange, -1, 3));
    expect(current.angelbonus).toBe(5);
  });

  it('applique chaque palier une seule fois et attend tous les produits pour un palier global', () => {
    const current = world();
    const product = current.products[0];
    product.paliers = [bonus(RatioType.gain, 1, 3)];
    current.allunlocks = [bonus(RatioType.gain)];
    service.checkProductPaliers(current, product);
    service.checkProductPaliers(current, product);
    expect(product.revenu).toBe(30);
    service.checkAllUnlocks(current);
    expect(current.allunlocks[0].unlocked).toBe(false);
    current.products.forEach((item) => { item.quantite = 1; });
    service.checkAllUnlocks(current);
    service.checkAllUnlocks(current);
    expect(product.revenu).toBe(60);
  });

  it('calcule le prix depuis le coût du prochain exemplaire et sauvegarde immédiatement', () => {
    const current = world();
    current.money = 1000;
    const product = current.products[0];
    product.timeleft = 0;
    product.cout = 10;
    product.croissance = 2;
    service.saveWorld('Joueur', current);
    const purchased = resolver.acheterQtProduit('Joueur', 1, 3);
    expect(purchased.quantite).toBe(5);
    expect(purchased.cout).toBe(80);
    expect(service.readUserWorld('Joueur').money).toBe(930);
    expect(fs.readdirSync(directory)).toEqual(['Joueur-world.json']);
  });

  it('calcule aussi un achat à croissance constante', () => {
    const product = world().products[0];
    product.cout = 10;
    product.croissance = 1;
    expect(service.purchaseCost(product, 100)).toBe(1000);
  });

  it.each([0, -1, 1.5, NaN, Infinity, 2_147_483_647])(
    'refuse la quantité invalide %s sans modifier la sauvegarde',
    (quantity) => {
      const current = world();
      service.saveWorld('Joueur', current);
      expect(() => resolver.acheterQtProduit('Joueur', 1, quantity)).toThrow(/quantité/);
      expect(service.readUserWorld('Joueur')).toEqual(current);
    },
  );

  it('refuse les achats sans argent, les produits inexistants et les productions impossibles', () => {
    const current = world();
    service.saveWorld('Joueur', current);
    expect(() => resolver.acheterQtProduit('Joueur', 1, 1)).toThrow(/argent/);
    expect(() => resolver.acheterQtProduit('Joueur', 99, 1)).toThrow(/existe pas/);
    expect(() => resolver.lancerProductionProduit('Joueur', 2)).toThrow(/exemplaire/);
    expect(() => resolver.lancerProductionProduit('Joueur', 1)).toThrow(/déjà en cours/);
    expect(service.readUserWorld('Joueur')).toEqual(current);
  });

  it('déduit le manager une seule fois et démarre sa production', () => {
    const current = world();
    current.money = 1e9;
    current.products[0].timeleft = 0;
    const manager = current.managers[0];
    service.saveWorld('Joueur', current);
    resolver.engagerManager('Joueur', manager.name);
    const purchased = service.readUserWorld('Joueur');
    expect(purchased.money).toBe(current.money - manager.seuil);
    expect(purchased.products[0].managerUnlocked).toBe(true);
    expect(purchased.products[0].timeleft).toBe(purchased.products[0].vitesse);
    expect(() => resolver.engagerManager('Joueur', manager.name)).toThrow(/déjà/);
    expect(service.readUserWorld('Joueur')).toEqual(purchased);
  });

  it('refuse un deuxième achat du même cash upgrade ou angel upgrade', () => {
    const current = world();
    current.money = 1e15;
    current.totalangels = 1000;
    current.activeangels = 1000;
    service.saveWorld('Joueur', current);
    resolver.acheterCashUpgrade('Joueur', current.upgrades[0].name);
    resolver.acheterAngelUpgrade('Joueur', current.angelupgrades[0].name);
    const purchased = service.readUserWorld('Joueur');
    expect(purchased.money).toBe(current.money - current.upgrades[0].seuil);
    expect(purchased.activeangels).toBe(1000 - current.angelupgrades[0].seuil);
    expect(() => resolver.acheterCashUpgrade('Joueur', current.upgrades[0].name)).toThrow(/déjà/);
    expect(() => resolver.acheterAngelUpgrade('Joueur', current.angelupgrades[0].name)).toThrow(/déjà/);
    expect(service.readUserWorld('Joueur')).toEqual(purchased);
  });

  it('le reset conserve score et anges dépensés, sans recréer des anges au reset suivant', () => {
    const current = world();
    current.products[0].timeleft = 0;
    current.score = 1e15;
    current.totalangels = 100;
    current.activeangels = 60;
    service.saveWorld('Joueur', current);
    advance(1000);
    const fresh = resolver.resetWorld('Joueur');
    expect(fresh.score).toBe(1e15);
    expect(fresh.totalangels).toBe(150);
    expect(fresh.activeangels).toBe(110);
    expect(fresh.lastupdate).toBe(new Date().toISOString());
    expect(fresh.products).toEqual(service.createWorld().products);
    expect(resolver.resetWorld('Joueur')).toEqual(fresh);
  });

  it('isole les joueurs et retourne une nouvelle copie du monde initial', () => {
    const first = resolver.getWorld('  Amine  ');
    first.money = 12345;
    service.saveWorld('Amine', first);
    const second = resolver.getWorld('Inès');
    expect(second.money).toBe(service.createWorld().money);
    expect(service.readUserWorld('Amine').money).toBe(12345);
    expect(fs.readdirSync(directory).sort()).toEqual(['Amine-world.json', 'Inès-world.json']);
  });

  it.each(['', '   ', '../ailleurs', 'a/b', 'a\\b', 'a'.repeat(41)])(
    'refuse le pseudo dangereux ou vide %s',
    (username) => {
      expect(() => resolver.getWorld(username)).toThrow(/pseudo/);
      expect(fs.readdirSync(directory)).toEqual([]);
    },
  );

  it.each(['{ incomplet', '{}', '{"money":null}'])(
    'conserve la sauvegarde corrompue au lieu de la remplacer',
    (data) => {
      const filename = path.join(directory, 'Joueur-world.json');
      fs.writeFileSync(filename, data);
      expect(() => resolver.getWorld('Joueur')).toThrow(/conservée/);
      expect(fs.readFileSync(filename, 'utf8')).toBe(data);
    },
  );

  it('propose le contenu demandé et des images présentes pour chaque élément', () => {
    const current = service.createWorld();
    expect(current.products).toHaveLength(6);
    expect(current.managers).toHaveLength(6);
    expect(current.allunlocks.length).toBeGreaterThanOrEqual(3);
    expect(current.upgrades.length).toBeGreaterThanOrEqual(10);
    expect(current.angelupgrades.length).toBeGreaterThanOrEqual(3);
    current.products.forEach((product) => {
      expect(product.paliers.length).toBeGreaterThanOrEqual(3);
      expect(current.managers.some((manager) => manager.idcible === product.id)).toBe(true);
    });
    const illustrated = [
      current, ...current.products, ...current.managers,
      ...current.allunlocks, ...current.upgrades, ...current.angelupgrades,
      ...current.products.flatMap((product) => product.paliers),
    ];
    illustrated.forEach((item) => {
      expect(fs.existsSync(path.join(process.cwd(), 'public', item.logo)), item.logo).toBe(true);
    });
  });
});

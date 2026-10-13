import { fakeAsync, flushMicrotasks, TestBed, tick } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { GameService } from './game.service';
import { World, Product, RatioType, GetWorldGQL, AcheterQtProduitGQL, LancerProductionProduitGQL, EngagerManagerGQL, AcheterCashUpgradeGQL, AcheterAngelUpgradeGQL, ResetWorldGQL } from './graphql/operations';

import { testWorld } from './testing/world.fixture';

describe('Synchronisation et règles client', () => {
  let service: GameService;
  let read: jasmine.Spy;
  let buy: jasmine.Spy;
  beforeEach(() => {
    read = jasmine.createSpy('fetch').and.callFake(() => of({ data: { getWorld: testWorld() } }));
    buy = jasmine.createSpy('mutate').and.returnValue(of({ data: { acheterQtProduit: { id: 1 } } }));
    const providers = [LancerProductionProduitGQL, EngagerManagerGQL, AcheterCashUpgradeGQL, AcheterAngelUpgradeGQL, ResetWorldGQL]
      .map(provide => ({ provide, useValue: { mutate: jasmine.createSpy('mutate').and.returnValue(of({ data: {} })) } }));
    TestBed.configureTestingModule({ providers: [
      GameService, { provide: GetWorldGQL, useValue: { fetch: read } },
      { provide: AcheterQtProduitGQL, useValue: { mutate: buy } }, ...providers,
    ] });
  });
  afterEach(() => { localStorage.removeItem('gameServerUrl'); TestBed.resetTestingModule(); });
  function init() { service = TestBed.inject(GameService); flushMicrotasks(); }

  it('crédite une seule fois une production manuelle, même après une longue attente', fakeAsync(() => {
    init(); service.world()!.products[0].timeleft = 250;
    tick(10000);
    expect(service.world()!.money).toBe(101);
    expect(service.world()!.products[0].timeleft).toBe(0);
    tick(10000); expect(service.world()!.money).toBe(101);
    service.ngOnDestroy();
  }));
  it('compte le cycle commencé et les cycles automatiques suivants avec le bonus ange', fakeAsync(() => {
    init(); const world = testWorld();
    world.activeangels = 50; world.totalangels = 50;
    world.products[0].managerUnlocked = true; world.products[0].timeleft = 250;
    service.world.set(world); tick(2250);
    expect(service.world()!.money).toBe(106);
    expect(service.world()!.products[0].timeleft).toBe(1000);
    service.ngOnDestroy();
  }));
  it('ne crédite aucun achat refusé et recharge la sauvegarde', fakeAsync(() => {
    init(); buy.and.returnValue(throwError(() => new Error('refus')));
    void service.buyProduct(2, service.world()!.products[0]); flushMicrotasks();
    expect(service.world()!.money).toBe(100);
    expect(service.world()!.products[0].quantite).toBe(1);
    expect(read).toHaveBeenCalledTimes(2);
    expect(service.busy()).toBeFalse();
    expect(service.snackmessage()).toContain('non confirmée');
    service.ngOnDestroy();
  }));
  it('attend la confirmation et ignore les achats simultanés', fakeAsync(() => {
    init(); const pending = new Subject<unknown>(); buy.and.returnValue(pending);
    void service.buyProduct(1, service.world()!.products[0]);
    void service.buyProduct(1, service.world()!.products[0]);
    expect(buy).toHaveBeenCalledTimes(1);
    expect(service.world()!.money).toBe(100);
    pending.next({ data: { acheterQtProduit: { id: 1 } } }); flushMicrotasks();
    expect(service.busy()).toBeFalse();
    service.ngOnDestroy();
  }));
  it('ignore une ancienne réponse après changement de joueur', fakeAsync(() => {
    const old = new Subject<unknown>(); read.and.returnValue(old);
    service = TestBed.inject(GameService);
    const next = testWorld(); next.money = 432;
    read.and.returnValue(of({ data: { getWorld: next } }));
    service.commitName('Nouveau joueur'); flushMicrotasks();
    old.next({ data: { getWorld: testWorld() } }); flushMicrotasks();
    expect(service.user()).toBe('Nouveau joueur');
    expect(service.world()!.money).toBe(432);
    expect(localStorage.getItem('username')).toBe('Nouveau joueur');
    service.ngOnDestroy();
  }));
  it('permet de réessayer après une erreur de chargement', fakeAsync(() => {
    read.and.returnValue(throwError(() => new Error('offline'))); init();
    expect(service.error()).toBeTruthy(); expect(service.world()).toBeNull();
    read.and.returnValue(of({ data: { getWorld: testWorld() } }));
    void service.refreshWorld(); flushMicrotasks();
    expect(service.error()).toBeNull(); expect(service.world()).toBeTruthy();
    service.ngOnDestroy();
  }));
  it('change le serveur pour les requêtes et les images sans accepter une URL invalide', fakeAsync(() => {
    init();
    service.changeServer('https://example.com/game/graphql/'); flushMicrotasks();
    expect(service.server()).toBe('https://example.com/game');
    expect(localStorage.getItem('gameServerUrl')).toBe('https://example.com/game');
    expect(service.imageUrl('icones/cookies.jpg')).toBe('https://example.com/game/icones/cookies.jpg');
    expect(read).toHaveBeenCalledTimes(2);
    service.changeServer('javascript:alert(1)'); flushMicrotasks();
    expect(service.server()).toBe('https://example.com/game');
    expect(read).toHaveBeenCalledTimes(2);
    service.ngOnDestroy();
  }));

  it('confirme un achat de produit sans palier', fakeAsync(() => {
    init(); void service.buyProduct(1, service.world()!.products[0]); flushMicrotasks();
    expect(service.snackmessage()).toContain('Achat confirmé');
    service.ngOnDestroy();
  }));

  it('applique les paliers individuels et globaux sans modifier le monde précédent', fakeAsync(() => {
    init(); const world = testWorld();
    const palier = { name: 'Palier', logo: '', idcible: 1, typeratio: RatioType.Gain, seuil: 1, ratio: 2, unlocked: false };
    world.products[0].paliers = [palier];
    world.allunlocks = [{ ...palier, name: 'Global', idcible: 0 }];
    function freeze(value: unknown): void {
      if (value && typeof value === 'object') { Object.values(value).forEach(freeze); Object.freeze(value); }
    }
    freeze(world);
    const next = service.applyAllUnlocks(service.applyPaliersForProduct(world, 1));
    expect(next.products[0].revenu).toBe(4);
    expect(next.products[0].paliers[0].unlocked).toBeTrue();
    expect(next.allunlocks[0].unlocked).toBeTrue();
    expect(world.products[0].revenu).toBe(1);
    expect(world.products[0].paliers[0].unlocked).toBeFalse();
    expect(service.applyAllUnlocks(service.applyPaliersForProduct(next, 1)).products[0].revenu).toBe(4);
    service.ngOnDestroy();
  }));

  it('calcule le maximum achetable et les anges selon les formules du sujet', fakeAsync(() => {
    init(); const product: Product = { ...service.world()!.products[0], croissance: 2 };
    service.world.update(w => ({ ...w!, money: 70, score: 1e15, totalangels: 100 }));
    expect(service.maxCanBuy(product)).toBe(3);
    expect(service.productionCost(product, 3)).toBe(70);
    expect(service.computeNewAngels()).toBe(50);
    const world = service.world()!;
    const boosted = service.applyBonusToWorld(world, { name: 'ange', logo: '', idcible: -1, typeratio: RatioType.Ange, seuil: 1, ratio: 3, unlocked: false });
    expect(boosted.angelbonus).toBe(5);
    expect(world.angelbonus).toBe(2);
    service.ngOnDestroy();
  }));
});

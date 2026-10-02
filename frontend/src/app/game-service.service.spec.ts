import { fakeAsync, flushMicrotasks, TestBed, tick } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import { GameServiceService } from './game-service.service';
import { World, Product, RatioType, GetWorldGQL, AcheterQtProduitGQL, LancerProductionProduitGQL, EngagerManagerGQL, AcheterCashUpgradeGQL, AcheterAngelUpgradeGQL, ResetWorldGQL } from './graphql/generated';

export function testWorld(): World {
  return {
    name: 'Tunisian Capitalist', logo: '', money: 100, score: 0,
    activeangels: 0, totalangels: 0, angelbonus: 2, lastupdate: new Date().toISOString(),
    allunlocks: [], upgrades: [], angelupgrades: [], managers: [],
    products: [{ id: 1, name: 'Cookies', logo: '', quantite: 1, cout: 10, croissance: 1.07,
      revenu: 1, vitesse: 1000, timeleft: 0, managerUnlocked: false, paliers: [] }],
  };
}

describe('Synchronisation et règles client', () => {
  let service: GameServiceService;
  let read: jasmine.Spy;
  let buy: jasmine.Spy;
  beforeEach(() => {
    read = jasmine.createSpy('fetch').and.callFake(() => of({ data: { getWorld: testWorld() } }));
    buy = jasmine.createSpy('mutate').and.returnValue(of({ data: { acheterQtProduit: { id: 1 } } }));
    const providers = [LancerProductionProduitGQL, EngagerManagerGQL, AcheterCashUpgradeGQL, AcheterAngelUpgradeGQL, ResetWorldGQL]
      .map(provide => ({ provide, useValue: { mutate: jasmine.createSpy('mutate').and.returnValue(of({ data: {} })) } }));
    TestBed.configureTestingModule({ providers: [
      GameServiceService, { provide: GetWorldGQL, useValue: { fetch: read } },
      { provide: AcheterQtProduitGQL, useValue: { mutate: buy } }, ...providers,
    ] });
  });
  afterEach(() => { TestBed.resetTestingModule(); });
  function init() { service = TestBed.inject(GameServiceService); flushMicrotasks(); }

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
    service = TestBed.inject(GameServiceService);
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
  it('calcule le maximum achetable et les anges selon les formules du sujet', fakeAsync(() => {
    init(); const product: Product = { ...service.world()!.products[0], croissance: 2 };
    service.world.update(w => ({ ...w!, money: 70, score: 1e15, totalangels: 100 }));
    expect(service.maxCanBuy(product)).toBe(3);
    expect(service.productionCost(product, 3)).toBe(70);
    expect(service.computeNewAngels()).toBe(50);
    const world = service.world()!;
    service.applyBonusToWorld(world, { name: 'ange', logo: '', idcible: -1, typeratio: RatioType.Ange, seuil: 1, ratio: 3, unlocked: false });
    expect(world.angelbonus).toBe(5);
    service.ngOnDestroy();
  }));
});

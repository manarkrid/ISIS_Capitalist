import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AppComponent } from './app.component';
import { GameServiceService } from './game-service.service';
import { RatioType, World } from './graphql/generated';

describe('AppComponent', () => {
  let fixture: ComponentFixture<AppComponent>;
  let app: AppComponent;
  let service: {
    world: ReturnType<typeof signal<World | null>>;
    user: ReturnType<typeof signal<string>>;
    loading: ReturnType<typeof signal<boolean>>;
    busy: ReturnType<typeof signal<boolean>>;
    error: ReturnType<typeof signal<string | null>>;
    snackmessage: ReturnType<typeof signal<string>>;
    computeNewAngels: jasmine.Spy;
    imageUrl: jasmine.Spy;
    refreshWorld: jasmine.Spy;
    resetWorld: jasmine.Spy;
    commitName: jasmine.Spy;
  };

  beforeEach(async () => {
    service = {
      world: signal<World | null>({
        name: 'Tunisian Capitalist', logo: 'icones/tunisie.png', money: 1000, score: 2000,
        activeangels: 2, totalangels: 2, angelbonus: 2, lastupdate: String(Date.now()),
        products: [], allunlocks: [], upgrades: [], angelupgrades: [],
        managers: [
          { name: 'Ammar', logo: '', seuil: 100, idcible: 1, ratio: 1, typeratio: RatioType.Gain, unlocked: false },
          { name: 'Déjà engagé', logo: '', seuil: 10, idcible: 2, ratio: 1, typeratio: RatioType.Gain, unlocked: true },
        ],
      }),
      user: signal('JoueurTest'), loading: signal(false), busy: signal(false),
      error: signal<string | null>(null), snackmessage: signal(''),
      computeNewAngels: jasmine.createSpy().and.returnValue(5),
      imageUrl: jasmine.createSpy().and.returnValue('placeholder.svg'),
      refreshWorld: jasmine.createSpy(), commitName: jasmine.createSpy(),
      resetWorld: jasmine.createSpy().and.resolveTo(true),
    };
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [{ provide: GameServiceService, useValue: service }],
    }).compileComponents();
    fixture = TestBed.createComponent(AppComponent);
    app = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => fixture.destroy());

  it('affiche le monde chargé et masque les managers déjà engagés', () => {
    app.openModal('managers');
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('h1')?.textContent).toContain('Tunisian Capitalist');
    expect(page.querySelector('dialog')?.textContent).toContain('Ammar');
    expect(page.querySelector('dialog')?.textContent).not.toContain('Déjà engagé');
    expect(app.badgeManagers()).toBe(1);
  });

  it('propose de réessayer quand la connexion échoue', () => {
    service.error.set('Serveur indisponible');
    fixture.detectChanges();
    const retry = fixture.nativeElement.querySelector('.error-panel button') as HTMLButtonElement;
    expect(retry.textContent).toContain('Réessayer');
    retry.click();
    expect(service.refreshWorld).toHaveBeenCalled();
  });

  it('exige une confirmation explicite avant de réinitialiser', async () => {
    app.openModal('angels');
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.reset-btn') as HTMLButtonElement).click();
    fixture.detectChanges();
    expect(service.resetWorld).not.toHaveBeenCalled();
    expect(fixture.nativeElement.querySelector('.reset-confirmation').textContent).toContain('remis à zéro');
    expect(fixture.nativeElement.querySelector('.reset-confirmation').textContent).toContain('5 anges supplémentaires');
    await app.doReset();
    expect(service.resetWorld).toHaveBeenCalledTimes(1);
    expect(app.activeModal()).toBeNull();
    expect(fixture.nativeElement.querySelector('dialog').open).toBeFalse();
  });

  it('conserve la confirmation ouverte si le serveur refuse la réinitialisation', async () => {
    service.resetWorld.and.resolveTo(false);
    app.openModal('angels');
    app.resetConfirmation.set(true);
    await app.doReset();
    expect(app.activeModal()).toBe('angels');
    expect(fixture.nativeElement.querySelector('dialog').open).toBeTrue();
  });

  it('annule la confirmation lorsque la fenêtre est fermée', async () => {
    app.openModal('angels');
    app.resetConfirmation.set(true);
    app.closeModal();
    await app.doReset();
    expect(service.resetWorld).not.toHaveBeenCalled();
    expect(app.resetConfirmation()).toBeFalse();
  });
});

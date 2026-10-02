import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ProduitComponent } from './produit.component';
import { GameServiceService } from '../game-service.service';
import { Product } from '../graphql/generated';

describe('ProduitComponent', () => {
  it('désactive la production pendant un cycle et affiche le gain avec anges', () => {
    const product: Product = { id: 1, name: 'Cookies', logo: '', cout: 10, croissance: 1.07, quantite: 2, revenu: 1, vitesse: 1000, timeleft: 500, managerUnlocked: false, paliers: [] };
    const start = jasmine.createSpy('lancerProduction');
    const service = { loading: signal(false), busy: signal(false), error: signal(null),
      maxCanBuy: () => 3, productionCost: () => 10, productRevenue: () => 4,
      imageUrl: () => 'placeholder.svg', lancerProduction: start };
    TestBed.configureTestingModule({ imports: [ProduitComponent], providers: [{ provide: GameServiceService, useValue: service }] });
    const fixture = TestBed.createComponent(ProduitComponent);
    fixture.componentRef.setInput('prod', product); fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component.progress()).toBe(50);
    expect(component.productionRevenue()).toBe(4);
    component.startFabrication(); expect(start).not.toHaveBeenCalled();
    fixture.componentRef.setInput('prod', { ...product, timeleft: 0 }); fixture.detectChanges();
    component.startFabrication(); expect(start).toHaveBeenCalledOnceWith(1);
    fixture.destroy();
  });
});

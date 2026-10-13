import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ProduitComponent } from './produit.component';
import { GameService } from '../game.service';
import { Product } from '../graphql/operations';

describe('ProduitComponent', () => {
  it('anime un cycle, se recale sur les bonus et arrête les frames sans créditer de gain', () => {
    spyOn(performance, 'now').and.returnValue(1000);
    spyOn(window, 'requestAnimationFrame').and.returnValue(42);
    const cancelFrame = spyOn(window, 'cancelAnimationFrame');
    const product: Product = { id: 1, name: 'Cookies', logo: '', cout: 10, croissance: 1.07, quantite: 2, revenu: 1, vitesse: 1000, timeleft: 500, managerUnlocked: false, paliers: [] };
    const start = jasmine.createSpy('lancerProduction');
    const service = { loading: signal(false), busy: signal(false), error: signal(null),
      maxCanBuy: () => 3, productionCost: () => 10, productRevenue: () => 4,
      imageUrl: () => 'placeholder.svg', lancerProduction: start };
    TestBed.configureTestingModule({ imports: [ProduitComponent], providers: [{ provide: GameService, useValue: service }] });
    const fixture = TestBed.createComponent(ProduitComponent);
    fixture.componentRef.setInput('prod', product); fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(component.progress()).toBe(50);
    expect(component.productionRevenue()).toBe(4);
    component.animate(1250); expect(component.progress()).toBe(75);
    component.animate(1500); expect(component.progress()).toBe(100);
    fixture.componentRef.setInput('prod', { ...product, vitesse: 500, timeleft: 250 }); fixture.detectChanges();
    expect(component.progress()).toBe(50);
    component.animate(1125); expect(component.progress()).toBe(75);
    component.startFabrication(); expect(start).not.toHaveBeenCalled();
    fixture.componentRef.setInput('prod', { ...product, timeleft: 0 }); fixture.detectChanges();
    expect(component.progress()).toBe(0);
    expect(cancelFrame).toHaveBeenCalledWith(42);
    component.startFabrication(); expect(start).toHaveBeenCalledOnceWith(1);
    fixture.componentRef.setInput('prod', product); fixture.detectChanges();
    cancelFrame.calls.reset();
    fixture.destroy();
    expect(cancelFrame).toHaveBeenCalledWith(42);
  });
});

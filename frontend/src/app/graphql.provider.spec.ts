import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { GetWorldGQL } from './graphql/operations';
import { graphqlProvider } from './graphql.provider';
import { SERVER_STORAGE_KEY } from './game.config';
import { testWorld } from './testing/world.fixture';

describe('Adresse du transport GraphQL', () => {
  afterEach(() => { localStorage.removeItem(SERVER_STORAGE_KEY); TestBed.resetTestingModule(); });

  it('envoie les requêtes suivantes au nouveau backend sans recharger la page', () => {
    localStorage.removeItem(SERVER_STORAGE_KEY);
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), graphqlProvider] });
    const query = TestBed.inject(GetWorldGQL);
    const http = TestBed.inject(HttpTestingController);
    query.fetch({ user: 'Joueur' }, { fetchPolicy: 'no-cache' }).subscribe();
    const first = http.expectOne('http://localhost:3000/graphql');
    expect(first.request.body.variables.user).toBe('Joueur');
    first.flush({ data: { getWorld: testWorld() } });
    localStorage.setItem(SERVER_STORAGE_KEY, 'https://example.com/monde');
    query.fetch({ user: 'Autre' }, { fetchPolicy: 'no-cache' }).subscribe();
    const next = http.expectOne('https://example.com/monde/graphql');
    expect(next.request.body.variables.user).toBe('Autre');
    next.flush({ data: { getWorld: testWorld() } });
    http.verify();
  });
});

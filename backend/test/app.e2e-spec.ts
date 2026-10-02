import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { AppModule } from '../src/app.module.js';
import { AppService } from '../src/app.service.js';

const worldQuery = `query($user: String!) { getWorld(user: $user) {
  money score totalangels activeangels lastupdate
  products { id quantite revenu cout managerUnlocked timeleft }
}}`;

describe('API GraphQL', () => {
  let app: INestApplication;
  let directory: string;
  let service: AppService;
  beforeAll(async () => {
    directory = fs.mkdtempSync(path.join(os.tmpdir(), 'capitalist-api-'));
    vi.stubEnv('USERWORLDS_DIR', directory);
    // Comme au démarrage réel, l'adaptateur HTTP existe avant ServeStaticModule.
    app = await NestFactory.create(AppModule, { logger: false });
    await app.init();
    service = app.get(AppService);
  });
  afterAll(async () => {
    await app?.close();
    vi.unstubAllEnvs();
    fs.rmSync(directory, { recursive: true, force: true });
  });
  function graphql(query: string, variables: Record<string, unknown>) {
    return request(app.getHttpServer()).post('/graphql').send({ query, variables });
  }
  it('crée une partie, achète et recharge son état sans toucher aux autres joueurs', async () => {
    const initial = await graphql(worldQuery, { user: 'API-Achat' });
    expect(initial.body.errors).toBeUndefined();
    expect(initial.body.data.getWorld.products).toHaveLength(6);
    const bought = await graphql(`mutation($user: String!) {
      acheterQtProduit(user:$user, id:1, quantite:2) { quantite cout }
    }`, { user: 'API-Achat' });
    expect(bought.body.errors).toBeUndefined();
    expect(bought.body.data.acheterQtProduit.quantite).toBe(3);
    const saved = await graphql(worldQuery, { user: 'API-Achat' });
    expect(saved.body.data.getWorld.money).toBeCloseTo(79.3);
    const other = await graphql(worldQuery, { user: 'API-Autre' });
    expect(other.body.data.getWorld.money).toBe(100);
    expect(other.body.data.getWorld.products[0].quantite).toBe(1);
  });
  it('refuse un achat invalide et un chemin utilisé comme pseudo', async () => {
    const invalid = await graphql(`mutation { acheterQtProduit(user:"API-Invalide", id:1, quantite:-2) { id } }`, {});
    expect(invalid.body.errors[0].message).toContain('quantité');
    const unsafe = await graphql(worldQuery, { user: '../sortie' });
    expect(unsafe.body.errors[0].message).toContain('pseudo');
  });
  it('reprend les gains hors ligne et ne redonne pas les mêmes anges au second reset', async () => {
    const world = service.createWorld();
    world.score = 1e15;
    world.totalangels = 100;
    world.activeangels = 60;
    world.products[0].managerUnlocked = true;
    world.products[0].timeleft = 1000;
    world.lastupdate = new Date(Date.now() - 5000).toISOString();
    service.saveWorld('API-Reset', world);
    const offline = await graphql(worldQuery, { user: 'API-Reset' });
    expect(offline.body.errors).toBeUndefined();
    expect(offline.body.data.getWorld.money).toBeGreaterThanOrEqual(111);
    const resetQuery = `mutation { resetWorld(user:"API-Reset") { totalangels activeangels products { quantite managerUnlocked } } }`;
    const reset = await graphql(resetQuery, {});
    expect(reset.body.errors).toBeUndefined();
    expect(reset.body.data.resetWorld.activeangels).toBe(110);
    expect(reset.body.data.resetWorld.products[0].managerUnlocked).toBe(false);
    const again = await graphql(resetQuery, {});
    expect(again.body.data.resetWorld).toEqual(reset.body.data.resetWorld);
  });
  it('sert les images du monde', async () => {
    await request(app.getHttpServer()).get('/icones/tunisie.png').expect(200).expect('Content-Type', /image\/png/);
  });
});

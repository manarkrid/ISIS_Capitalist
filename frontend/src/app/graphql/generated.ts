import { gql } from 'apollo-angular';
import { Injectable } from '@angular/core';
import * as Apollo from 'apollo-angular';

export type Maybe<T> = T | null;

export enum RatioType {
  Ange = 'ange',
  Gain = 'gain',
  Vitesse = 'vitesse'
}

export type Palier = {
  __typename?: 'Palier';
  name: string;
  logo: string;
  seuil: number;
  idcible: number;
  ratio: number;
  typeratio: RatioType;
  unlocked: boolean;
};

export type Product = {
  __typename?: 'Product';
  id: number;
  name: string;
  logo: string;
  cout: number;
  croissance: number;
  revenu: number;
  vitesse: number;
  quantite: number;
  timeleft: number;
  managerUnlocked: boolean;
  paliers: Palier[];
};

export type World = {
  __typename?: 'World';
  name: string;
  logo: string;
  money: number;
  score: number;
  totalangels: number;
  activeangels: number;
  angelbonus: number;
  lastupdate: number;
  products: Product[];
  allunlocks: Palier[];
  upgrades: Palier[];
  angelupgrades: Palier[];
  managers: Palier[];
};

// ─── GetWorld ────────────────────────────────────────────────────────────────

export const GetWorldDocument = gql`
  query getWorld($user: String!) {
    getWorld(user: $user) {
      name logo money score totalangels activeangels angelbonus lastupdate
      products {
        id name logo cout croissance revenu vitesse quantite timeleft managerUnlocked
        paliers { name logo seuil idcible ratio typeratio unlocked }
      }
      allunlocks { name logo seuil idcible ratio typeratio unlocked }
      upgrades { name logo seuil idcible ratio typeratio unlocked }
      angelupgrades { name logo seuil idcible ratio typeratio unlocked }
      managers { name logo seuil idcible ratio typeratio unlocked }
    }
  }
`;

@Injectable({ providedIn: 'root' })
export class GetWorldGQL extends Apollo.Query<{ getWorld: World | null }, { user: string }> {
  document = GetWorldDocument;
  constructor(apollo: Apollo.Apollo) { super(apollo); }
}

// ─── AcheterQtProduit ────────────────────────────────────────────────────────

export const AcheterQtProduitDocument = gql`
  mutation acheterQtProduit($user: String!, $id: Int!, $quantite: Int!) {
    acheterQtProduit(user: $user, id: $id, quantite: $quantite) { id }
  }
`;

@Injectable({ providedIn: 'root' })
export class AcheterQtProduitGQL extends Apollo.Mutation<
  { acheterQtProduit: { id: number } | null },
  { user: string; id: number; quantite: number }
> {
  document = AcheterQtProduitDocument;
  constructor(apollo: Apollo.Apollo) { super(apollo); }
}

// ─── LancerProductionProduit ──────────────────────────────────────────────────

export const LancerProductionDocument = gql`
  mutation lancerProductionProduit($user: String!, $id: Int!) {
    lancerProductionProduit(user: $user, id: $id) { id }
  }
`;

@Injectable({ providedIn: 'root' })
export class LancerProductionGQL extends Apollo.Mutation<
  { lancerProductionProduit: { id: number } | null },
  { user: string; id: number }
> {
  document = LancerProductionDocument;
  constructor(apollo: Apollo.Apollo) { super(apollo); }
}

// ─── EngagerManager ───────────────────────────────────────────────────────────

export const EngagerManagerDocument = gql`
  mutation EngagerManager($user: String!, $name: String!) {
    engagerManager(user: $user, name: $name) { name }
  }
`;

@Injectable({ providedIn: 'root' })
export class EngagerManagerGQL extends Apollo.Mutation<
  { engagerManager: { name: string } | null },
  { user: string; name: string }
> {
  document = EngagerManagerDocument;
  constructor(apollo: Apollo.Apollo) { super(apollo); }
}

// ─── AcheterCashUpgrade ───────────────────────────────────────────────────────

export const AcheterCashUpgradeDocument = gql`
  mutation AcheterCashUpgrade($user: String!, $name: String!) {
    acheterCashUpgrade(user: $user, name: $name) { name }
  }
`;

@Injectable({ providedIn: 'root' })
export class AcheterCashUpgradeGQL extends Apollo.Mutation<
  { acheterCashUpgrade: { name: string } | null },
  { user: string; name: string }
> {
  document = AcheterCashUpgradeDocument;
  constructor(apollo: Apollo.Apollo) { super(apollo); }
}

// ─── AcheterAngelUpgrade ──────────────────────────────────────────────────────

export const AcheterAngelUpgradeDocument = gql`
  mutation AcheterAngelUpgrade($user: String!, $name: String!) {
    acheterAngelUpgrade(user: $user, name: $name) { name }
  }
`;

@Injectable({ providedIn: 'root' })
export class AcheterAngelUpgradeGQL extends Apollo.Mutation<
  { acheterAngelUpgrade: { name: string } | null },
  { user: string; name: string }
> {
  document = AcheterAngelUpgradeDocument;
  constructor(apollo: Apollo.Apollo) { super(apollo); }
}

// ─── ResetWorld ───────────────────────────────────────────────────────────────

export const ResetWorldDocument = gql`
  mutation ResetWorld($user: String!) {
    resetWorld(user: $user) { name }
  }
`;

@Injectable({ providedIn: 'root' })
export class ResetWorldGQL extends Apollo.Mutation<
  { resetWorld: { name: string } | null },
  { user: string }
> {
  document = ResetWorldDocument;
  constructor(apollo: Apollo.Apollo) { super(apollo); }
}

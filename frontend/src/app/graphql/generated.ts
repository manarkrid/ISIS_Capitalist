import { gql } from 'apollo-angular';
import { Injectable } from '@angular/core';
import * as Apollo from 'apollo-angular';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
};

export type Mutation = {
  __typename?: 'Mutation';
  acheterAngelUpgrade?: Maybe<Palier>;
  acheterCashUpgrade?: Maybe<Palier>;
  acheterQtProduit?: Maybe<Product>;
  engagerManager?: Maybe<Palier>;
  lancerProductionProduit?: Maybe<Product>;
  resetWorld?: Maybe<World>;
};


export type MutationAcheterAngelUpgradeArgs = {
  name: Scalars['String']['input'];
  user: Scalars['String']['input'];
};


export type MutationAcheterCashUpgradeArgs = {
  name: Scalars['String']['input'];
  user: Scalars['String']['input'];
};


export type MutationAcheterQtProduitArgs = {
  id: Scalars['Int']['input'];
  quantite: Scalars['Int']['input'];
  user: Scalars['String']['input'];
};


export type MutationEngagerManagerArgs = {
  name: Scalars['String']['input'];
  user: Scalars['String']['input'];
};


export type MutationLancerProductionProduitArgs = {
  id: Scalars['Int']['input'];
  user: Scalars['String']['input'];
};


export type MutationResetWorldArgs = {
  user: Scalars['String']['input'];
};

export type Palier = {
  __typename?: 'Palier';
  idcible: Scalars['Int']['output'];
  logo: Scalars['String']['output'];
  name: Scalars['String']['output'];
  ratio: Scalars['Int']['output'];
  seuil: Scalars['Float']['output'];
  typeratio: RatioType;
  unlocked: Scalars['Boolean']['output'];
};

export type Product = {
  __typename?: 'Product';
  cout: Scalars['Float']['output'];
  croissance: Scalars['Float']['output'];
  id: Scalars['Int']['output'];
  logo: Scalars['String']['output'];
  managerUnlocked: Scalars['Boolean']['output'];
  name: Scalars['String']['output'];
  paliers: Array<Palier>;
  quantite: Scalars['Int']['output'];
  revenu: Scalars['Float']['output'];
  timeleft: Scalars['Int']['output'];
  vitesse: Scalars['Int']['output'];
};

export type Query = {
  __typename?: 'Query';
  getWorld?: Maybe<World>;
};


export type QueryGetWorldArgs = {
  user: Scalars['String']['input'];
};

export enum RatioType {
  Ange = 'ange',
  Gain = 'gain',
  Vitesse = 'vitesse'
}

export type World = {
  __typename?: 'World';
  activeangels: Scalars['Int']['output'];
  allunlocks: Array<Palier>;
  angelbonus: Scalars['Int']['output'];
  angelupgrades: Array<Palier>;
  lastupdate: Scalars['String']['output'];
  logo: Scalars['String']['output'];
  managers: Array<Palier>;
  money: Scalars['Float']['output'];
  name: Scalars['String']['output'];
  products: Array<Product>;
  score: Scalars['Float']['output'];
  totalangels: Scalars['Int']['output'];
  upgrades: Array<Palier>;
};

export type GetWorldQueryVariables = Exact<{
  user: Scalars['String']['input'];
}>;


export type GetWorldQuery = { __typename?: 'Query', getWorld?: { __typename?: 'World', name: string, logo: string, money: number, score: number, totalangels: number, activeangels: number, angelbonus: number, lastupdate: string, products: Array<{ __typename?: 'Product', id: number, name: string, logo: string, cout: number, croissance: number, revenu: number, vitesse: number, quantite: number, timeleft: number, managerUnlocked: boolean, paliers: Array<{ __typename?: 'Palier', name: string, logo: string, seuil: number, idcible: number, ratio: number, typeratio: RatioType, unlocked: boolean }> }>, allunlocks: Array<{ __typename?: 'Palier', name: string, logo: string, seuil: number, idcible: number, ratio: number, typeratio: RatioType, unlocked: boolean }>, upgrades: Array<{ __typename?: 'Palier', name: string, logo: string, seuil: number, idcible: number, ratio: number, typeratio: RatioType, unlocked: boolean }>, angelupgrades: Array<{ __typename?: 'Palier', name: string, logo: string, seuil: number, idcible: number, ratio: number, typeratio: RatioType, unlocked: boolean }>, managers: Array<{ __typename?: 'Palier', name: string, logo: string, seuil: number, idcible: number, ratio: number, typeratio: RatioType, unlocked: boolean }> } | null };

export type AcheterQtProduitMutationVariables = Exact<{
  user: Scalars['String']['input'];
  id: Scalars['Int']['input'];
  quantite: Scalars['Int']['input'];
}>;


export type AcheterQtProduitMutation = { __typename?: 'Mutation', acheterQtProduit?: { __typename?: 'Product', id: number } | null };

export type LancerProductionProduitMutationVariables = Exact<{
  user: Scalars['String']['input'];
  id: Scalars['Int']['input'];
}>;


export type LancerProductionProduitMutation = { __typename?: 'Mutation', lancerProductionProduit?: { __typename?: 'Product', id: number } | null };

export type EngagerManagerMutationVariables = Exact<{
  user: Scalars['String']['input'];
  name: Scalars['String']['input'];
}>;


export type EngagerManagerMutation = { __typename?: 'Mutation', engagerManager?: { __typename?: 'Palier', name: string } | null };

export type AcheterCashUpgradeMutationVariables = Exact<{
  user: Scalars['String']['input'];
  name: Scalars['String']['input'];
}>;


export type AcheterCashUpgradeMutation = { __typename?: 'Mutation', acheterCashUpgrade?: { __typename?: 'Palier', name: string } | null };

export type AcheterAngelUpgradeMutationVariables = Exact<{
  user: Scalars['String']['input'];
  name: Scalars['String']['input'];
}>;


export type AcheterAngelUpgradeMutation = { __typename?: 'Mutation', acheterAngelUpgrade?: { __typename?: 'Palier', name: string } | null };

export type ResetWorldMutationVariables = Exact<{
  user: Scalars['String']['input'];
}>;


export type ResetWorldMutation = { __typename?: 'Mutation', resetWorld?: { __typename?: 'World', name: string } | null };

export const GetWorldDocument = gql`
    query getWorld($user: String!) {
  getWorld(user: $user) {
    name
    logo
    money
    score
    totalangels
    activeangels
    angelbonus
    lastupdate
    products {
      id
      name
      logo
      cout
      croissance
      revenu
      vitesse
      quantite
      timeleft
      managerUnlocked
      paliers {
        name
        logo
        seuil
        idcible
        ratio
        typeratio
        unlocked
      }
    }
    allunlocks {
      name
      logo
      seuil
      idcible
      ratio
      typeratio
      unlocked
    }
    upgrades {
      name
      logo
      seuil
      idcible
      ratio
      typeratio
      unlocked
    }
    angelupgrades {
      name
      logo
      seuil
      idcible
      ratio
      typeratio
      unlocked
    }
    managers {
      name
      logo
      seuil
      idcible
      ratio
      typeratio
      unlocked
    }
  }
}
    `;

  @Injectable({
    providedIn: 'root'
  })
  export class GetWorldGQL extends Apollo.Query<GetWorldQuery, GetWorldQueryVariables> {
    document = GetWorldDocument;

    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const AcheterQtProduitDocument = gql`
    mutation acheterQtProduit($user: String!, $id: Int!, $quantite: Int!) {
  acheterQtProduit(user: $user, id: $id, quantite: $quantite) {
    id
  }
}
    `;

  @Injectable({
    providedIn: 'root'
  })
  export class AcheterQtProduitGQL extends Apollo.Mutation<AcheterQtProduitMutation, AcheterQtProduitMutationVariables> {
    document = AcheterQtProduitDocument;

    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const LancerProductionProduitDocument = gql`
    mutation lancerProductionProduit($user: String!, $id: Int!) {
  lancerProductionProduit(user: $user, id: $id) {
    id
  }
}
    `;

  @Injectable({
    providedIn: 'root'
  })
  export class LancerProductionProduitGQL extends Apollo.Mutation<LancerProductionProduitMutation, LancerProductionProduitMutationVariables> {
    document = LancerProductionProduitDocument;

    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const EngagerManagerDocument = gql`
    mutation EngagerManager($user: String!, $name: String!) {
  engagerManager(user: $user, name: $name) {
    name
  }
}
    `;

  @Injectable({
    providedIn: 'root'
  })
  export class EngagerManagerGQL extends Apollo.Mutation<EngagerManagerMutation, EngagerManagerMutationVariables> {
    document = EngagerManagerDocument;

    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const AcheterCashUpgradeDocument = gql`
    mutation AcheterCashUpgrade($user: String!, $name: String!) {
  acheterCashUpgrade(user: $user, name: $name) {
    name
  }
}
    `;

  @Injectable({
    providedIn: 'root'
  })
  export class AcheterCashUpgradeGQL extends Apollo.Mutation<AcheterCashUpgradeMutation, AcheterCashUpgradeMutationVariables> {
    document = AcheterCashUpgradeDocument;

    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const AcheterAngelUpgradeDocument = gql`
    mutation AcheterAngelUpgrade($user: String!, $name: String!) {
  acheterAngelUpgrade(user: $user, name: $name) {
    name
  }
}
    `;

  @Injectable({
    providedIn: 'root'
  })
  export class AcheterAngelUpgradeGQL extends Apollo.Mutation<AcheterAngelUpgradeMutation, AcheterAngelUpgradeMutationVariables> {
    document = AcheterAngelUpgradeDocument;

    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }
export const ResetWorldDocument = gql`
    mutation ResetWorld($user: String!) {
  resetWorld(user: $user) {
    name
  }
}
    `;

  @Injectable({
    providedIn: 'root'
  })
  export class ResetWorldGQL extends Apollo.Mutation<ResetWorldMutation, ResetWorldMutationVariables> {
    document = ResetWorldDocument;

    constructor(apollo: Apollo.Apollo) {
      super(apollo);
    }
  }

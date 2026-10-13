import { inject } from '@angular/core';
import { provideApollo } from 'apollo-angular';
import { HttpLink } from 'apollo-angular/http';
import { InMemoryCache } from '@apollo/client/core';
import { getServerUrl } from './game.config';

// Une adresse commune pour le transport GraphQL et les images du monde.
export const graphqlProvider = provideApollo(() => {
  const httpLink = inject(HttpLink);
  return {
    cache: new InMemoryCache(),
    link: httpLink.create({ uri: () => `${getServerUrl()}/graphql` }),
    defaultOptions: {
      query: { fetchPolicy: 'no-cache' },
      watchQuery: { fetchPolicy: 'no-cache' },
    },
  };
});

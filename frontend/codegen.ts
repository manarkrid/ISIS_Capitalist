import type { CodegenConfig } from '@graphql-codegen/cli';

const config: CodegenConfig = {
  schema: '../backend/src/schema.graphql',
  documents: 'src/**/*.graphql',
  generates: {
    'src/app/graphql/generated.ts': {
      plugins: [
        'typescript',
        'typescript-operations',
        'typescript-apollo-angular'
      ],
      config: { apolloAngularVersion: 2 }
    }
  }
};

export default config;

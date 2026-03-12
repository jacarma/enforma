// @ts-check
// apps/docs/eslint.config.js
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-plugin-prettier';

// Uses `recommended` (not `strictTypeChecked`) intentionally — Astro component
// types are difficult to check through ESLint's type-aware rules.
export default tseslint.config(
  { ignores: ['dist/', '.astro/'] },
  ...tseslint.configs.recommended,
  {
    plugins: {
      'react-hooks': reactHooks,
      prettier,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'prettier/prettier': 'error',
    },
  },
);

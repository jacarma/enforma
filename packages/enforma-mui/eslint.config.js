// @ts-check
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-plugin-prettier';

export default tseslint.config(
  {
    ignores: ['dist', 'coverage'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [...tseslint.configs.strictTypeChecked, ...tseslint.configs.stylisticTypeChecked],
    plugins: {
      'react-hooks': reactHooks,
      prettier,
    },
    languageOptions: {
      parserOptions: {
        project: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/consistent-type-definitions': ['error', 'type'],
      'prettier/prettier': 'error',
    },
  },
);

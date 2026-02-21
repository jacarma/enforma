// @ts-check
import tseslint from 'typescript-eslint';
import reactHooks from 'eslint-plugin-react-hooks';
import prettier from 'eslint-plugin-prettier';

export default tseslint.config(
  { ignores: ['dist'] },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [...tseslint.configs.strictTypeChecked],
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
      'prettier/prettier': 'error',
    },
  },
);

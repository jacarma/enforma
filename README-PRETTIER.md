# Prettier & ESLint Integration

This monorepo uses Prettier for code formatting and ESLint for code quality. Formatting and linting are enforced in all packages and the demo app.

## Usage

### Format all files

```
pnpm prettier --write .
```

### Check formatting (CI/lint)

```
pnpm prettier --check .
```

### Lint (includes Prettier errors)

```
pnpm lint
```

### Editor setup

- Enable "Format on Save" in your editor.
- Use the Prettier extension (recommended: esbenp.prettier-vscode).
- The workspace `.vscode/settings.json` enforces Prettier as the default formatter.

## Customizing Prettier

Edit `.prettierrc` in the repo root to change formatting rules.

## Ignored files

See `.prettierignore` for files/folders excluded from formatting.

# Enforma Docs

## Dark mode

Every demo that renders MUI components must be wrapped in `MuiThemeWrapper` (from `src/components/Preview.tsx`) to adapt to Starlight's dark mode.

- Use `<Preview>` for simple demos — it includes `MuiThemeWrapper` automatically.
- For demos with state outside the form (e.g. displaying submitted values), wrap the entire return in `<MuiThemeWrapper>` explicitly and use `<div className="preview-card not-content">` inside it.

Never render MUI components in a raw `<div className="preview-card not-content">` without a `MuiThemeWrapper` ancestor.

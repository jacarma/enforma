# TODO

## DataSources

- Improve filter semantics in DataSources beyond simple equality. Support richer predicates (range, contains, `$gt`, `$lt`, etc.) so static array filtering and query filtering share a common, expressive filter language.

## Core library

- Move `List.Item` slot definition into the core library (`packages/enforma`) so all adapter implementations are bound by the same contract. Currently `ListItemSlot` lives only in `enforma-mui`.
- Likewise, `Select.Option` (item label/value mapping for DataSource-backed selects) should be defined in core, not per-adapter.

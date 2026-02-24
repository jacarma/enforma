# TODO

## Core library

- Move `List.Item` slot definition into the core library (`packages/enforma`) so all adapter implementations are bound by the same contract. Currently `ListItemSlot` lives only in `enforma-mui`.
- Likewise, `Select.Option` (item label/value mapping for DataSource-backed selects) should be defined in core, not per-adapter.

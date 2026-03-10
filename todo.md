# Enforma — Component Roadmap

## Already implemented

- [x] TextInput (with mask support)
- [x] Textarea
- [x] Select (single, with datasource)
- [x] Fieldset
- [x] List (repeating items with modal)

## Repeating data

- [ ] Table — repeating items rendered as a data table (columns defined via props/children); same data model as List but tabular layout with inline or modal editing

---

## Boolean / toggle

- [x] Checkbox — boolean check
- [x] Switch — styled boolean toggle, same value shape as Checkbox

## Single selection

- [x] RadioList — radio button group bound to a single value
- [x] Autocomplete — combobox with type-ahead filter; single selection; supports datasource
- [x] ExclusiveToggle — segmented control / button group for single selection from a small fixed set

## Multiple selection

- [ ] MultiSelect — dropdown that produces an array of values; supports datasource
- [ ] CheckboxList — group of checkboxes that produces an array of selected values; supports datasource
- [ ] TagsInput — free-form entry of multiple string values displayed as chips/tags

## Open-ended selection

- [x] OpenChoice — `openChoice` boolean prop on Select, RadioGroup, and ExclusiveToggle; appends an "Other" option that reveals a text input below the component; typed value stored directly as the field value; if form loads with a value not in the options list, "Other" is auto-selected and text input shows the value

## Numeric

- [x] NumberInput — numeric-only text input with min/max/step; no spinner arrows
- [ ] Spinner — numeric input with increment/decrement buttons (stepper)
- [ ] Slider — single-handle range slider bound to a number
- [ ] RangeSlider — dual-handle slider bound to `[min, max]` tuple

## Date / time

- [x] DatePicker — calendar-based date selection
- [x] TimePicker — clock/scroll-based time selection
- [x] DateTimePicker — combined date + time

## File

- [ ] FileUpload — single or multiple file attachment; value is `File[]` or URL strings after upload

## Text (enhanced)

- [ ] RichText — WYSIWYG / markdown editor for formatted content fields

## Display / static content

- [x] Output — read-only inline element that renders a text no bound value; used for instructions, section notes, or computed text shown via a reactive `value` prop - <h3>Hello, <Output as="span" value={({name})=>name}/></h3> "as" is optional and defaults to span

## Utility / misc

- [ ] Hidden — renders nothing; stores a value in form state programmatically
- [ ] Rating — star or score selector (e.g., 1–5); common in surveys and reviews
- [ ] ColorPicker — hex/rgb color selection
- [ ] OtpInput — fixed-length code entry (PIN, verification code); alternative to masked TextInput
- [ ] TransferList — move items between "available" and "selected" pools; produces an array

---

---

## Validation helpers

Built-in validators

- [x] **required** — fails if value is `null`, `undefined`, or empty string; works for all field types
- [x] **minLength / maxLength** — string length bounds; intended for TextInput and Textarea
- [x] **minItems / maxItems** — array length bounds; intended for List and multi-select fields; number min/max already exists on NumberInput at the field level

---

## Notes / investigations

- [ ] **messages prop**: `messages` is defined on all field components but currently unused. Implement support to allow overriding built-in UI strings (e.g., the "Other" label added by `openChoice`, future validation messages). Design before implementing.

- [ ] **StarRating demo**: Checkbox is now implemented — update `docs/custom-components.md` and the demo to replace the placeholder `TextInput` with a Checkbox that controls the `disabled` reactive prop on the star rating field.

- [ ] **Validator performance**: the `onChange(values, { valid })` architecture runs all validators (type + user) on every value change. Measure whether this is a bottleneck for forms with many fields or expensive validators. If so, consider debouncing validator execution (e.g. 100–200 ms) while keeping the last known `valid` state stable between runs.

- [ ] **Mask Input and floating label**: After adding a value to a masked input or numeric input, if you change bwtween mui otline and mui classic, the label is rendered over the value and only stays on top after editing the value.

- [ ] **List title**: List component should allow users to add a title or label

- [x] **Calculated expression**: docs/PHQ-9 vs Enforma — Gap Analysis.md

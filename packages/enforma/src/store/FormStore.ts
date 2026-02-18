// packages/enforma/src/store/FormStore.ts
type Subscriber = () => void
export type FormValues = Record<string, unknown>

function getByPath(obj: FormValues, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => {
    if (acc !== null && typeof acc === 'object' && key in acc) {
      return (acc as FormValues)[key]
    }
    return undefined
  }, obj)
}

function setByPath(obj: FormValues, path: string, value: unknown): FormValues {
  const dotIndex = path.indexOf('.')
  if (dotIndex === -1) {
    return { ...obj, [path]: value }
  }
  const key = path.slice(0, dotIndex)
  const rest = path.slice(dotIndex + 1)
  const existing = obj[key]
  const nested: FormValues =
    existing !== null && typeof existing === 'object'
      ? { ...(existing as FormValues) }
      : {}
  return { ...obj, [key]: setByPath(nested, rest, value) }
}

export class FormStore {
  private _values: FormValues
  private readonly _subscribers = new Set<Subscriber>()

  constructor(initialValues: FormValues) {
    this._values = { ...initialValues }
  }

  getSnapshot(): FormValues {
    return this._values
  }

  subscribe(callback: Subscriber): () => void {
    this._subscribers.add(callback)
    return () => {
      this._subscribers.delete(callback)
    }
  }

  getField(path: string): unknown {
    return getByPath(this._values, path)
  }

  setField(path: string, value: unknown): void {
    this._values = setByPath(this._values, path, value)
    for (const cb of this._subscribers) {
      cb()
    }
  }
}

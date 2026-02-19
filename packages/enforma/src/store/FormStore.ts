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
  private readonly _touched = new Set<string>()
  private _submitted = false
  private readonly _errors = new Map<string, string | null>()
  private readonly _validators = new Map<string, () => string | null>()

  constructor(initialValues: FormValues) {
    this._values = { ...initialValues }
  }

  private notifySubscribers(): void {
    for (const cb of this._subscribers) {
      cb()
    }
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
    this.runAllValidators()
    this.notifySubscribers()
  }

  registerValidator(path: string, fn: () => string | null): () => void {
    this._validators.set(path, fn)
    this._errors.set(path, fn())
    this.notifySubscribers()
    return () => {
      this._validators.delete(path)
      this._errors.delete(path)
    }
  }

  runAllValidators(): void {
    for (const [path, fn] of this._validators) {
      this._errors.set(path, fn())
    }
  }

  touchField(path: string): void {
    this._touched.add(path)
    this.notifySubscribers()
  }

  setSubmitted(): void {
    this._submitted = true
    this.runAllValidators()
    this.notifySubscribers()
  }

  getError(path: string): string | null {
    return this._errors.get(path) ?? null
  }

  getErrors(): Record<string, string | null> {
    return Object.fromEntries(this._errors)
  }

  isTouched(path: string): boolean {
    return this._touched.has(path)
  }

  isSubmitted(): boolean {
    return this._submitted
  }

  isValid(): boolean {
    for (const error of this._errors.values()) {
      if (error !== null) return false
    }
    return true
  }
}

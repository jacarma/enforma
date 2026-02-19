// packages/enforma/src/index.ts
import { Form } from './components/Form'
import { TextInput } from './components/TextInput'
import { Scope } from './components/Scope'

const Enforma = { Form, TextInput, Scope } as const

export default Enforma
export type { FormValues } from './store/FormStore'
export type { Reactive } from './context/ScopeContext'

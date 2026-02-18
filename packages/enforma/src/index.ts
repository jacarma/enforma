// packages/enforma/src/index.ts
import { Form } from './components/Form'
import { TextInput } from './components/TextInput'

const Enforma = { Form, TextInput } as const

export default Enforma
export type { FormValues } from './store/FormStore'

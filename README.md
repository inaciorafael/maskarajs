# maskarajs

Declarative input mask engine for JavaScript. Framework-agnostic, zero dependencies, and small enough to live close to your form fields.

## Syntax

| Token | Accepts |
|---|---|
| `#` | any digit (`0-9`) |
| `@` | any letter (`a-z`, `A-Z`, accented letters) |
| `*` | any character |
| `[text]` | fixed literal text, inserted and removed automatically |
| `{expr}` | free slot: tests one character against an expression |

### `{expr}` modifier

```txt
{4}         -> only the char "4"
{0-4}       -> range: ch >= "0" && ch <= "4"
{013}       -> set: "0", "1" or "3"
{[0-9a-f]}  -> regex: any hexadecimal char
{\d}        -> regex: any digit
{[^aeiou]}  -> regex: any consonant
```

## Install

```bash
npm install maskarajs
```

```js
import maskara from 'maskarajs'
```

## API

```js
maskara(pattern, value)                // apply mask -> formatted string
maskara.raw(pattern, value)            // clean value / transform result
maskara.is(pattern, value)             // complete pattern? -> boolean
maskara.hint(pattern)                  // readable placeholder -> string
maskara.format(pattern, value)         // semantic alias for maskara()
maskara.rawLength(pattern, value)      // filled input chars -> number
maskara.patternLength(pattern)         // full formatted length -> number
maskara.define(name, definition)       // register a named mask
maskara.undefine(name)                 // remove a named mask
maskara.names()                        // list registered names -> string[]
maskara.defineSlot(symbol, definition) // create or override an input token
maskara.undefineSlot(symbol)           // remove a custom token
maskara.slots()                        // list available input tokens
maskara.on(input, pattern, options)    // bind to a DOM input -> cleanup()
maskara.create(presets)                // isolated instance with its own registry
```

## React adapter

The React adapter is optional and lives in `maskarajs/react`. Use `useMaskara` directly for small forms, or wrap your app with `MaskaraProvider` when you have an isolated engine created with `maskara.create()`.

```tsx
import maskara from 'maskarajs'
import { MaskaraProvider, useMaskara } from 'maskarajs/react'

const appMaskara = maskara.create({
  cpf: { pattern: '###[.]###[.]###[-]##' },
  phone: { pattern: ['[(]##[)] ####[-]####', '[(]##[)] #####[-]####'] },
})

function CPFInput() {
  const cpf = useMaskara('cpf')

  return (
    <input
      {...cpf.inputProps({ inputMode: 'numeric' })}
      aria-label="CPF"
    />
  )
}

export function App() {
  return (
    <MaskaraProvider engine={appMaskara}>
      <CPFInput />
    </MaskaraProvider>
  )
}
```

`useMaskara` still accepts an `engine` option when a single field needs a specific instance:

```tsx
const cpf = useMaskara('cpf', { engine: appMaskara })
```

The hook stores field state. The engine stores mask configuration.

## Examples

```js
// Single pattern
maskara('###[.]###[.]###[-]##', '12345678909')
// -> '123.456.789-09'

// Dynamic pattern array: chooses by input size
maskara(['[(]##[)] ####[-]####', '[(]##[)] #####[-]####'], '11987654321')
// -> '(11) 98765-4321'

// Restricted slot
maskara('{4}### #### #### ####', '4111111111111111')
// -> '4111 1111 1111 1111'

// Regex slot
maskara('{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}', '1a2b3c')
// -> '1a2b3c'
```

### Common cases

```js
// Brazilian ZIP code
maskara('#####[-]###', '01310930')
// -> '01310-930'

// CNPJ
maskara('##[.]###[.]###[/]####[-]##', '11222333000181')
// -> '11.222.333/0001-81'

// Visa card
maskara('{4}### #### #### ####', '5111111111111111')
// -> ''  (the first char did not pass)

// Hex color with dirty paste
maskara('{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}', '1z2b3c')
// -> '12b3c'
```

## `maskara.define` with `transform`

```js
maskara.define('date', {
  pattern: '##[/]##[/]####',
  validate: (raw, masked, complete) => {
    if (raw.length < 4) return true
    const month = Number(raw.slice(2, 4))
    return month >= 1 && month <= 12
  },
  transform: (raw, masked, complete) => {
    if (!complete) return null
    const dt = new Date(`${raw.slice(4,8)}-${raw.slice(2,4)}-${raw.slice(0,2)}`)
    return isNaN(dt) ? null : dt
  },
})

maskara('date', '01012025')          // -> '01/01/2025'
maskara.raw('date', '01/01/2025')    // -> Date(2025-01-01)
maskara.raw('date', '01/01')         // -> null
maskara.is('date', '01/01/2025')     // -> true
maskara.hint('date')                 // -> '00/00/0000'
maskara.rawLength('date', '01/01')   // -> 4
maskara.patternLength('date')        // -> 10
```

## `validate`: incremental validation

Use `validate` on named masks when the rule depends on what has already been typed. This covers cases where character-by-character syntax is not enough, such as accepting only months from `01` to `12`.

```js
maskara.define('month', {
  pattern: '{0-1}#',
  validate: (raw, masked, complete) => {
    if (!complete) return true
    const month = Number(raw)
    return month >= 1 && month <= 12
  },
})

maskara('month', '12') // -> '12'
maskara('month', '19') // -> '1'
maskara.is('month', '12') // -> true
maskara.is('month', '19') // -> false
```

## Conditional masks

Use `patterns` + `select` on a named mask when the mask must change because of the typed value, not only because of length. Arrays of strings keep the old behavior and still choose the smallest pattern that fits the input. Conditional masks live inside `define` or `create`, where product rules already belong.

`select(raw, value)` receives the value without literals from all possible patterns and returns a key from `patterns`.

```js
const cpf = '###[.]###[.]###[-]##'
const cnpj = '##[.]###[.]###[/]####[-]##'

maskara.define('smartDocument', {
  patterns: { cpf, cnpj },
  select: raw => raw.includes('123') ? 'cnpj' : 'cpf',
})

maskara('smartDocument', '98765432100')
// -> '987.654.321-00'

maskara('smartDocument', '12345678000199')
// -> '12.345.678/0001-99'
```

It also works with isolated instances:

```js
const forms = maskara.create({
  smartDocument: {
    patterns: { cpf, cnpj },
    select: raw => raw.startsWith('9') ? 'cpf' : 'cnpj',
  },
})
```

Prefer conditional masks for rules that depend on the value itself: prefixes, country codes, card BINs, product codes or any domain rule. Prefer a simple string array when the only difference is input size, such as phone numbers with 10 or 11 digits.

## Custom slots: create your own pattern language

Besides `#`, `@`, `*` and `{expr}`, you can create symbols that make sense for your team. This is useful when a project needs a shorter, more expressive language aligned with its product domain.

```js
maskara.defineSlot('N', {
  test: ch => /\d/.test(ch),
  hint: '0',
})

maskara('NNN[-]NN', '12345') // -> '123-45'
maskara.hint('NNN[-]NN')     // -> '000-00'
maskara.slots()              // -> ['#', '@', '*', 'N']
```

You can also pass a `RegExp` or a function directly:

```js
maskara.defineSlot('H', /[0-9a-f]/i)
maskara.defineSlot('V', ch => 'AEIOUaeiou'.includes(ch))

maskara('HHHHHH', '1a2b3c') // -> '1a2b3c'
maskara('VVV', 'mask')      // -> 'a'
```

Global slots affect the global engine. For libraries, design systems or products with their own rules, prefer an isolated instance:

```js
const forge = maskara.create()

forge.defineSlot('N', { test: ch => /\d/.test(ch), hint: '0' })
forge.defineSlot('#', { test: ch => /[1-9]/.test(ch), hint: '1' })

forge('NNN[-]NN', '12345') // -> '123-45'
forge('#', '0')            // -> ''
maskara('#', '0')             // -> '0'  (global stays unchanged)
```

If a registered symbol must appear as fixed text, escape it with brackets:

```js
maskara.defineSlot('N', /\d/)

maskara('[N]##', '45') // -> 'N45'
maskara('N##', '145')  // -> '145'
```

## `maskara.on`: any framework

```js
// Vanilla JS
const off = maskara.on(inputEl, 'cpf', {
  onValue: raw => setState(raw),
  onMaskara: masked => setLabel(masked),
})
off()

// React
useEffect(() => {
  return maskara.on(ref.current, 'date', {
    onValue: date => setValue(date), // Date | null
  })
}, [])

// Vue
onMounted(() => {
  maskara.on(inputRef.value, 'phone', {
    onValue: value => emit('update:modelValue', value),
  })
})

// Svelte action
function maskAction(node, pattern) {
  const off = maskara.on(node, pattern)
  return { destroy: off }
}
```

## `maskara.create`: isolated instances

```js
export const maskaraBR = maskara.create({
  cpf:   { pattern: '###[.]###[.]###[-]##' },
  cnpj:  { pattern: '##[.]###[.]###[/]####[-]##' },
  phone: { pattern: ['[(]##[)] ####[-]####', '[(]##[)] #####[-]####'] },
  cep:   { pattern: '#####[-]###', transform: (r, m, c) => c ? r : null },
  date:  {
    pattern: '##[/]##[/]####',
    transform: (raw, masked, complete) => {
      if (!complete) return null
      const dt = new Date(`${raw.slice(4,8)}-${raw.slice(2,4)}-${raw.slice(0,2)}`)
      return isNaN(dt) ? null : dt
    },
  },
})

export const maskaraUS = maskara.create({
  ssn:   { pattern: '###[-]##[-]####' },
  zip:   { pattern: '#####[-]####' },
  phone: { pattern: '[(]###[)] ###[-]####' },
})

maskaraBR('cpf', '12345678909')     // -> '123.456.789-09'
maskaraBR.raw('date', '01/01/2025') // -> Date
maskaraBR.names()                   // -> ['cpf', 'cnpj', 'phone', 'cep', 'date']
maskaraUS.names()                   // -> ['ssn', 'zip', 'phone']
```

## Official Brazilian presets

If you want common Brazilian masks ready to use, import `maskarajs/presets/br` and create an isolated engine from it.

```ts
import maskara from 'maskarajs'
import { br, type BrazilPresetRegistry } from 'maskarajs/presets/br'

const maskaraBR = maskara.create<BrazilPresetRegistry>(br)

maskaraBR('cpf', '12345678909')      // -> '123.456.789-09'
maskaraBR('cnpj', '11222333000181')  // -> '11.222.333/0001-81'
maskaraBR('phone', '11987654321')    // -> '(11) 98765-4321'
maskaraBR.raw('cep', '01310-930')    // -> '01310930'
maskaraBR.raw('date', '01/12/2025')  // -> Date
maskaraBR.raw('money', '1299,90')    // -> 1299.9
```

The preset includes:

| Name | Pattern / behavior |
|---|---|
| `cpf` | `000.000.000-00` |
| `cnpj` | `00.000.000/0000-00` |
| `cep` | `00000-000`, returns `null` until complete |
| `phone` | landline or mobile phone |
| `date` | `DD/MM/YYYY`, rejects invalid months and returns `Date \| null` |
| `month` | accepts only `01` to `12` |
| `money` | decimal money value from cents |

## `rawLength` and `patternLength`

```js
const filled = maskara.rawLength('cpf', value)
const total = maskara.patternLength('cpf')

const pct = maskara('cpf', value).length / total * 100
const ready = maskara.is('cpf', value)
const label = `${filled} raw chars`
```

`patternLength` counts the final formatted length, including literals:

```js
maskara.patternLength('##[/]##[/]####')       // -> 10
maskara.patternLength('###[.]###[.]###[-]##') // -> 14
maskara.patternLength('{4}### #### #### ####') // -> 19
```

## Visual showcase

The `maskforge-showcase` project demonstrates the library with:

- a playground that applies the mask while the user types;
- a visual pattern map with slot, literal and expression blocks;
- examples for React, Vue and Vanilla JavaScript;
- interactive recipes for `validate`, `define`, `defineSlot` and `create`;
- local benchmark notes.

```bash
cd maskforge-showcase
npm install
npm run dev
```

## Local benchmark

Simple benchmark executed in Node/WSL with 200,000 iterations per case after warmup. Numbers vary by machine, but they help set expectations for input-level usage.

| Case | Result |
|---|---:|
| CPF format | 39,705 ops/s |
| Phone dynamic | 32,455 ops/s |
| Date validate | 64,572 ops/s |
| Raw extraction | 44,729 ops/s |

```js
const iterations = 200000
for (let i = 0; i < iterations; i++) {
  maskara('###[.]###[.]###[-]##', '12345678909')
}
```

## `transform` contract

```js
// transform(raw, masked, complete) => T
// validate(raw, masked, complete) => boolean
//
// raw      -> input chars without literals
// masked   -> formatted string
// complete -> true when every slot is filled
//
// Without transform -> maskara.raw() always returns the raw string
// With transform    -> maskara.raw() always returns whatever transform returns
```

## License

MIT

## React hook

`maskarajs/react` exports a small `useMaskara` hook. It lives in a separate entrypoint, so the core package stays framework-agnostic for users who do not use React.

```tsx
import { useMaskara } from 'maskarajs/react'

export function CPFField() {
  const cpf = useMaskara('###[.]###[.]###[-]##')

  return <input {...cpf.inputProps({ inputMode: 'numeric' })} />
}
```

### React Hook Form

Use `onValue` to send the raw value to React Hook Form while the input keeps the masked value on screen.

```tsx
import { Controller, useForm } from 'react-hook-form'
import { useMaskara } from 'maskarajs/react'

type FormValues = {
  cpf: string
}

function CPFController({ field }) {
  const cpf = useMaskara('###[.]###[.]###[-]##', {
    value: field.value,
    onValue: field.onChange,
  })

  return (
    <input
      {...cpf.inputProps({
        name: field.name,
        onBlur: field.onBlur,
        ref: field.ref,
        inputMode: 'numeric',
      })}
    />
  )
}

export function Form() {
  const { control, handleSubmit } = useForm<FormValues>({
    defaultValues: { cpf: '' },
  })

  return (
    <form onSubmit={handleSubmit(console.log)}>
      <Controller
        name="cpf"
        control={control}
        render={({ field }) => <CPFController field={field} />}
      />
    </form>
  )
}
```

### Zod

Keep the form value raw and validate it normally.

```ts
import { z } from 'zod'

export const schema = z.object({
  cpf: z.string().length(11, 'CPF must contain 11 digits'),
})
```

### Yup

```ts
import * as yup from 'yup'

export const schema = yup.object({
  cpf: yup.string().length(11, 'CPF must contain 11 digits').required(),
})
```

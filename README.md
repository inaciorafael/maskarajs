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
maskara.apply(pattern, value)          // rich result with masked/raw/complete/hint
maskara.raw(pattern, value)            // clean value / transform result
maskara.unmask(pattern, value)         // semantic alias for raw()
maskara.field(pattern, value)          // lightweight form state helper
maskara.check(pattern, value)          // explain complete/empty/invalid/incomplete
maskara.is(pattern, value)             // complete pattern? -> boolean
maskara.hint(pattern)                  // readable placeholder -> string
maskara.format(pattern, value)         // semantic alias for maskara()
maskara.rawLength(pattern, value)      // filled input chars -> number
maskara.patternLength(pattern)         // full formatted length -> number
maskara.explain(pattern)               // pattern tokens, variants and lengths
maskara.transforms                     // small reusable transform helpers
maskara.define(name, definition)       // register a named mask
maskara.undefine(name)                 // remove a named mask
maskara.names()                        // list registered names -> string[]
maskara.defineSlot(symbol, definition) // create or override an input token
maskara.undefineSlot(symbol)           // remove a custom token
maskara.slots()                        // list available input tokens
maskara.on(input, pattern, options)    // bind to a DOM input -> cleanup()
maskara.create(presets, options)       // isolated instance with its own registry
```

Need the compact runtime explicitly? Import `maskarajs/min`.

```js
import maskara from 'maskarajs/min'
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

## `apply`: rich result for forms

Use `apply()` when a form, adapter or debug panel needs more than the masked string. It is a convenience API over `maskara()`, `raw()`, `is()`, `hint()`, `rawLength()` and `patternLength()`.

```js
const result = maskara.apply('###[.]###[.]###[-]##', '12345678909')

result.masked        // '123.456.789-09'
result.value         // '123.456.789-09'
result.raw           // '12345678909'
result.complete      // true
result.hint          // '000.000.000-00'
result.placeholder   // '000.000.000-00'
result.rawLength     // 11
result.patternLength // 14
```

It also respects named masks, `validate`, `transform`, custom slots and isolated instances:

```js
maskara.define('money', {
  pattern: '########[,]##',
  transform: raw => Number.parseInt(raw || '0', 10) / 100,
})

maskara.apply('money', '129990').raw
// 1299.9
```

With typed instances, `apply().raw` follows the registry type:

```ts
const masks = maskara.create<{ money: number }>({
  money: {
    pattern: '########[,]##',
    transform: raw => Number.parseInt(raw || '0', 10) / 100,
  },
})

const result = masks.apply('money', '129990')

result.raw
// number
```

In UI code, `apply()` keeps input state and metadata close together:

```ts
const cpfPattern = '###[.]###[.]###[-]##'
const field = maskara.apply(cpfPattern, value)

input.value = field.value
input.placeholder = field.placeholder
submit.disabled = !field.complete
```

## `unmask`: semantic alias for `raw`

`raw()` remains the source of truth, but `unmask()` reads nicely when the code is preparing a value for persistence, API calls or comparison.

```ts
const cpf = '###[.]###[.]###[-]##'

maskara.raw(cpf, '123.456.789-09')
// '12345678909'

maskara.unmask(cpf, '123.456.789-09')
// '12345678909'
```

It also works on isolated instances and respects `transform` exactly like `raw()`.

## `field`: lightweight form state

Use `field()` when you want a tiny framework-agnostic state helper without reaching for a React hook, Vue directive or form library.

```ts
const cpf = maskara.field('###[.]###[.]###[-]##')

cpf.set('12345678909')

cpf.value       // '123.456.789-09'
cpf.raw         // '12345678909'
cpf.complete    // true
cpf.placeholder // '000.000.000-00'

input.addEventListener('input', cpf.onInput)
```

`field()` also accepts input-like events and writes the masked value back to `event.target.value`, which makes it useful for simple DOM integrations.

## `check`: readable state for forms and debug

`check()` returns everything from `apply()` plus a small explanation layer.

```ts
const state = maskara.check('###[.]###[.]###[-]##', '123')

state.valid    // false
state.reason   // 'incomplete'
state.message  // 'Value does not complete the mask yet.'
state.missing  // chars missing in the formatted value
```

Reasons are intentionally small and stable:

- `empty`: no value yet
- `incomplete`: value is accepted, but not complete
- `invalid`: the mask rejected characters or a sequence
- `complete`: value fills the mask

This is designed for field feedback. Domain validation such as CPF checksum, credit card verification or business rules should still live in your validation layer.

## `explain`: inspect the pattern language

`explain()` returns the parsed shape of a pattern. It is useful for playgrounds, documentation, visual editors and debugging custom slots.

```ts
const info = maskara.explain('###[.]##{0-9}')

info.hint          // '000.000'
info.rawLength     // 6
info.patternLength // 7
info.variants[0].tokens
// [
//   { type: 'slot', value: '#', hint: '0', length: 1 },
//   { type: 'literal', value: '.', length: 1 },
//   { type: 'expression', value: '{0-9}', hint: '0', constraint: '0-9', length: 1 },
// ]
```

For dynamic arrays and named masks, `variants` contains each possible pattern after flattening.

## `transforms`: small helpers for named masks

Use `maskara.transforms` when a common transform should stay boring and repeatable.

```ts
maskara.define('money', {
  pattern: '########[,]##',
  transform: maskara.transforms.cents,
})

maskara.raw('money', '1299,90')
// 1299.9
```

Available helpers:

| Helper | Returns |
|---|---|
| `transforms.number` | `number \| null` from the raw digits |
| `transforms.cents` | decimal number from cents |
| `transforms.dateBR` | `Date \| null` for complete `DD/MM/YYYY` values |
| `transforms.parts(schema)` | `{ raw, masked, complete, ...parts }` using raw slices |

```ts
maskara.define('dateParts', {
  pattern: '##[/]##[/]####',
  transform: maskara.transforms.parts({
    day: [0, 2],
    month: [2, 4],
    year: [4, 8],
  }),
})

maskara.raw('dateParts', '31/12/2026')
// { raw: '31122026', masked: '31/12/2026', complete: true, day: '31', month: '12', year: '2026' }
```

## Strict instances

By default, maskarajs is tolerant: invalid pasted characters are skipped when possible. For flows that need to stop at the first invalid character, create an isolated strict engine.

```ts
const loose = maskara.create()
const strict = maskara.create({}, { strict: true })

loose('###', '1a2')
// '12'

strict('###', '1a2')
// '1'

strict.check('###', '1a2').reason
// 'invalid'
```

## Vue 3 adapter

The Vue adapter is optional and lives in `maskarajs/vue`. Its default export is a Vue 3 directive ready for `v-maskara`. Use it locally in a component or register it once as a plugin.

### Local directive

```vue
<script setup lang="ts">
import { maskaraDirective as vMaskara } from 'maskarajs/vue'

const pattern = '###[.]###[.]###[-]##'
</script>

<template>
  <input v-maskara="pattern" inputmode="numeric" />
</template>
```

### With `v-model` and raw value callback

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { maskaraDirective as vMaskara } from 'maskarajs/vue'

const document = ref('')
const rawDocument = ref('')
</script>

<template>
  <input
    v-model="document"
    v-maskara="{
      pattern: '###[.]###[.]###[-]##',
      onValue: value => rawDocument = value
    }"
    inputmode="numeric"
  />
</template>
```

The directive listens during the capture phase, so Vue's `v-model` receives the masked value during the same input event.

### Register globally

```ts
import { createApp } from 'vue'
import { createMaskaraPlugin } from 'maskarajs/vue'
import App from './App.vue'

createApp(App)
  .use(createMaskaraPlugin())
  .mount('#app')
```

Then use it anywhere:

```vue
<input v-maskara="'#####[-]###'" />
```

### Use an isolated engine

```ts
import maskara from 'maskarajs'
import { createMaskaraPlugin } from 'maskarajs/vue'

const br = maskara.create({
  cpf: { pattern: '###[.]###[.]###[-]##' },
  phone: { pattern: ['[(]##[)] ####[-]####', '[(]##[)] #####[-]####'] },
})

app.use(createMaskaraPlugin({ engine: br }))
```

You can also create a directive instance manually:

```ts
import { createMaskaraDirective } from 'maskarajs/vue'

const vMaskara = createMaskaraDirective({ engine: br })
```

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
  validate: ({ ctx }) => {
    return ctx.between({ from: 2, to: 4, min: 1, max: 12 })
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
  validate: ({ ctx }) => {
    return ctx.between({ from: 0, to: 2, min: 1, max: 12 })
  },
})

maskara('month', '12') // -> '12'
maskara('month', '19') // -> '1'
maskara.is('month', '12') // -> true
maskara.is('month', '19') // -> false
```

`validate` receives a single payload, so TypeScript can autocomplete the destructured fields:

```js
validate: ({ raw, masked, complete, ctx }) => boolean
```

Boolean helpers such as `between`, `is`, `oneOf`, `startsWith` and `endsWith` are progressive. If the target character/range is not filled yet, they return `true` and keep typing fluid. They only block once there is enough raw input to evaluate the rule.

`ctx.when` is the escape hatch for custom validation. It waits until the requested character or range is filled before running your predicate:

```js
maskara.define('customMonth', {
  pattern: '##[/]##[/]####',
  validate: ({ ctx }) => {
    return ctx.when({ from: 2, to: 4 }, ({ value, number }) => {
      return value !== '00' && number >= 1 && number <= 12
    })
  },
})
```

`ctx` reads from the current raw value being tested.

| Helper | Purpose |
|---|---|
| `ctx.char(at)` or `ctx.char({ at })` | Returns one raw character |
| `ctx.has(at)` or `ctx.has({ at })` | Checks whether a raw position has been typed |
| `ctx.slice({ from, to })` | Reads a raw range. `to` is exclusive |
| `ctx.toNumber({ from, to })` | Reads a raw range as a number |
| `ctx.when({ at }, fn)` or `ctx.when({ from, to }, fn)` | Runs a custom rule only when that raw position/range is filled |
| `ctx.is({ at, value })` | Progressively checks one raw character against one value |
| `ctx.oneOf({ at, values })` | Progressively checks one raw character against many values |
| `ctx.between({ from, to, min, max })` | Progressively checks whether a numeric raw range is inside a range |
| `ctx.length()` | Current raw length |
| `ctx.isEmpty()` | Whether no raw character has been typed |
| `ctx.startsWith(value)` or `ctx.startsWith({ value })` | Progressive raw prefix check |
| `ctx.endsWith(value)` or `ctx.endsWith({ value })` | Progressive raw suffix check |

```js
maskara.define('code', {
  pattern: '###',
  validate: ({ complete, ctx }) => {
    if (!ctx.startsWith('5')) return false
    return !complete || ctx.endsWith('9')
  },
})

maskara('code', '529') // -> '529'
maskara('code', '528') // -> '52'
maskara('code', '129') // -> ''
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
maskaraBR('document', '11222333000181') // -> '11.222.333/0001-81'
maskaraBR('phone', '11987654321')    // -> '(11) 98765-4321'
maskaraBR('plate', 'ABC1D23')         // -> 'ABC1D23'
maskaraBR.raw('cep', '01310-930')    // -> '01310930'
maskaraBR.raw('date', '01/12/2025')  // -> Date
maskaraBR.raw('money', '1299,90')    // -> 1299.9
```

The preset includes:

| Name | Pattern / behavior |
|---|---|
| `cpf` | `000.000.000-00` |
| `cnpj` | `00.000.000/0000-00` |
| `document` / `cpfCnpj` | CPF or CNPJ by typed length |
| `cep` | `00000-000`, returns `null` until complete |
| `phone` | landline or mobile phone |
| `mobile` | Brazilian mobile phone |
| `landline` | Brazilian landline phone |
| `plate` | old Brazilian plate or Mercosul plate |
| `date` | `DD/MM/YYYY`, rejects invalid months and returns `Date \| null` |
| `month` | accepts only `01` to `12` |
| `money` | decimal money value from cents |
| `currency` | alias for decimal money value from cents |
| `percent` | decimal percent-like value from cents |

## Other official presets

Presets are optional imports. They are plain mask definition objects, so they only affect the isolated engine where you pass them.

```ts
import maskara from 'maskarajs'
import { payment, type PaymentPresetRegistry } from 'maskarajs/presets/payment'
import { date, type DatePresetRegistry } from 'maskarajs/presets/date'

const pay = maskara.create<PaymentPresetRegistry>(payment)
const dates = maskara.create<DatePresetRegistry>(date)

pay('card', '4111111111111111')       // -> '4111 1111 1111 1111'
pay('card', '371449635398431')        // -> '3714 496353 98431'
pay.raw('expiry', '12/29').complete   // -> true

dates('date', '31122026')             // -> '31/12/2026'
dates.raw('date', '31/12/2026')       // -> Date | null
dates('time', '2359')                 // -> '23:59'
```

Available focused presets:

| Import | Includes |
|---|---|
| `maskarajs/presets/br` | `cpf`, `cnpj`, `document`, `cpfCnpj`, `cep`, `phone`, `mobile`, `landline`, `plate`, `date`, `month`, `money`, `currency`, `percent` |
| `maskarajs/presets/payment` | `card`, `card16`, `amex`, `expiry`, `cvv` |
| `maskarajs/presets/date` | `date`, `dayMonth`, `month`, `year`, `time` |

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
// validate({ raw, masked, complete, ctx }) => boolean
//
// raw      -> input chars without literals
// masked   -> formatted string
// complete -> true when every slot is filled
// ctx      -> raw-position helpers for incremental validation
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

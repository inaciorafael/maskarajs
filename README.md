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
import mask from 'maskarajs'
```

## API

```js
mask(pattern, value)                // apply mask -> formatted string
mask.raw(pattern, value)            // clean value / transform result
mask.is(pattern, value)             // complete pattern? -> boolean
mask.hint(pattern)                  // readable placeholder -> string
mask.format(pattern, value)         // semantic alias for mask()
mask.rawLength(pattern, value)      // filled input chars -> number
mask.patternLength(pattern)         // full formatted length -> number
mask.define(name, definition)       // register a named mask
mask.undefine(name)                 // remove a named mask
mask.names()                        // list registered names -> string[]
mask.defineSlot(symbol, definition) // create or override an input token
mask.undefineSlot(symbol)           // remove a custom token
mask.slots()                        // list available input tokens
mask.on(input, pattern, options)    // bind to a DOM input -> cleanup()
mask.create(presets)                // isolated instance with its own registry
```

## Examples

```js
// Single pattern
mask('###[.]###[.]###[-]##', '12345678909')
// -> '123.456.789-09'

// Dynamic pattern array: chooses by input size
mask(['[(]##[)] ####[-]####', '[(]##[)] #####[-]####'], '11987654321')
// -> '(11) 98765-4321'

// Restricted slot
mask('{4}### #### #### ####', '4111111111111111')
// -> '4111 1111 1111 1111'

// Regex slot
mask('{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}', '1a2b3c')
// -> '1a2b3c'
```

### Common cases

```js
// Brazilian ZIP code
mask('#####[-]###', '01310930')
// -> '01310-930'

// CNPJ
mask('##[.]###[.]###[/]####[-]##', '11222333000181')
// -> '11.222.333/0001-81'

// Visa card
mask('{4}### #### #### ####', '5111111111111111')
// -> ''  (the first char did not pass)

// Hex color with dirty paste
mask('{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}', '1z2b3c')
// -> '12b3c'
```

## `mask.define` with `transform`

```js
mask.define('date', {
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

mask('date', '01012025')          // -> '01/01/2025'
mask.raw('date', '01/01/2025')    // -> Date(2025-01-01)
mask.raw('date', '01/01')         // -> null
mask.is('date', '01/01/2025')     // -> true
mask.hint('date')                 // -> '00/00/0000'
mask.rawLength('date', '01/01')   // -> 4
mask.patternLength('date')        // -> 10
```

## `validate`: incremental validation

Use `validate` on named masks when the rule depends on what has already been typed. This covers cases where character-by-character syntax is not enough, such as accepting only months from `01` to `12`.

```js
mask.define('month', {
  pattern: '{0-1}#',
  validate: (raw, masked, complete) => {
    if (!complete) return true
    const month = Number(raw)
    return month >= 1 && month <= 12
  },
})

mask('month', '12') // -> '12'
mask('month', '19') // -> '1'
mask.is('month', '12') // -> true
mask.is('month', '19') // -> false
```

## Custom slots: create your own pattern language

Besides `#`, `@`, `*` and `{expr}`, you can create symbols that make sense for your team. This is useful when a project needs a shorter, more expressive language aligned with its product domain.

```js
mask.defineSlot('N', {
  test: ch => /\d/.test(ch),
  hint: '0',
})

mask('NNN[-]NN', '12345') // -> '123-45'
mask.hint('NNN[-]NN')     // -> '000-00'
mask.slots()              // -> ['#', '@', '*', 'N']
```

You can also pass a `RegExp` or a function directly:

```js
mask.defineSlot('H', /[0-9a-f]/i)
mask.defineSlot('V', ch => 'AEIOUaeiou'.includes(ch))

mask('HHHHHH', '1a2b3c') // -> '1a2b3c'
mask('VVV', 'mask')      // -> 'a'
```

Global slots affect the global engine. For libraries, design systems or products with their own rules, prefer an isolated instance:

```js
const forge = mask.create()

forge.defineSlot('N', { test: ch => /\d/.test(ch), hint: '0' })
forge.defineSlot('#', { test: ch => /[1-9]/.test(ch), hint: '1' })

forge('NNN[-]NN', '12345') // -> '123-45'
forge('#', '0')            // -> ''
mask('#', '0')             // -> '0'  (global stays unchanged)
```

If a registered symbol must appear as fixed text, escape it with brackets:

```js
mask.defineSlot('N', /\d/)

mask('[N]##', '45') // -> 'N45'
mask('N##', '145')  // -> '145'
```

## `mask.on`: any framework

```js
// Vanilla JS
const off = mask.on(inputEl, 'cpf', {
  onValue: raw => setState(raw),
  onMasked: masked => setLabel(masked),
})
off()

// React
useEffect(() => {
  return mask.on(ref.current, 'date', {
    onValue: date => setValue(date), // Date | null
  })
}, [])

// Vue
onMounted(() => {
  mask.on(inputRef.value, 'phone', {
    onValue: value => emit('update:modelValue', value),
  })
})

// Svelte action
function maskAction(node, pattern) {
  const off = mask.on(node, pattern)
  return { destroy: off }
}
```

## `mask.create`: isolated instances

```js
export const maskBR = mask.create({
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

export const maskUS = mask.create({
  ssn:   { pattern: '###[-]##[-]####' },
  zip:   { pattern: '#####[-]####' },
  phone: { pattern: '[(]###[)] ###[-]####' },
})

maskBR('cpf', '12345678909')     // -> '123.456.789-09'
maskBR.raw('date', '01/01/2025') // -> Date
maskBR.names()                   // -> ['cpf', 'cnpj', 'phone', 'cep', 'date']
maskUS.names()                   // -> ['ssn', 'zip', 'phone']
```

## `rawLength` and `patternLength`

```js
const filled = mask.rawLength('cpf', value)
const total = mask.patternLength('cpf')

const pct = mask('cpf', value).length / total * 100
const ready = mask.is('cpf', value)
const label = `${filled} raw chars`
```

`patternLength` counts the final formatted length, including literals:

```js
mask.patternLength('##[/]##[/]####')       // -> 10
mask.patternLength('###[.]###[.]###[-]##') // -> 14
mask.patternLength('{4}### #### #### ####') // -> 19
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
  mask('###[.]###[.]###[-]##', '12345678909')
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
// Without transform -> mask.raw() always returns the raw string
// With transform    -> mask.raw() always returns whatever transform returns
```

## License

MIT

# mask.js

Engine de máscaras declarativo para JavaScript — framework-agnostic, zero dependências, ~4kb.

## Sintaxe

| Token | Aceita |
|---|---|
| `#` | qualquer dígito (0–9) |
| `@` | qualquer letra (a–z, A–Z, acentuados) |
| `*` | qualquer caractere |
| `[texto]` | literal fixo (inserido/removido automaticamente) |
| `{expr}` | slot livre — testa um char contra a expressão |

### Modificador `{expr}`

```
{4}         → só o char '4'
{0-4}       → intervalo: ch >= '0' && ch <= '4'
{013}       → conjunto: '0', '1' ou '3'
{[0-9a-f]}  → regex: qualquer char hex
{\d}        → regex: qualquer dígito
{[^aeiou]}  → regex: consoante
```

## API

```js
import mask from './mask.js'

mask(pattern, value)               // aplica máscara → string formatada
mask.raw(pattern, value)           // valor limpo / resultado do transform
mask.is(pattern, value)            // padrão completo? → boolean
mask.hint(pattern)                 // placeholder → string
mask.format(pattern, value)        // alias semântico de mask()
mask.rawLength(pattern, value)     // chars de input preenchidos → number
mask.patternLength(pattern)        // tamanho mascarado completo → number
mask.define(name, definition)      // registra máscara nomeada
mask.undefine(name)                // remove do registry
mask.names()                       // lista nomes registrados → string[]
mask.defineSlot(symbol, definition)// cria/sobrescreve token de input
mask.undefineSlot(symbol)          // remove token customizado
mask.slots()                       // lista tokens de input disponíveis
mask.on(input, pattern, options)   // vincula a input DOM → cleanup()
mask.create(presets)               // instância isolada com registry próprio
```

## Exemplos

```js
// Padrão único
mask('###[.]###[.]###[-]##', '12345678909')
// → '123.456.789-09'

// Padrão dinâmico (array) — escolhe pelo tamanho do input
mask(['[(]##[)] ####[-]####', '[(]##[)] #####[-]####'], '11987654321')
// → '(11) 98765-4321'

// Slot com restrição
mask('{4}### #### #### ####', '4111111111111111')
// → '4111 1111 1111 1111'  (só aceita Visa — começa com 4)

// Slot com regex
mask('{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}', '1a2b3c')
// → '1a2b3c'
```

### Mais casos comuns

```js
// CEP
mask('#####[-]###', '01310930')
// → '01310-930'

// CNPJ
mask('##[.]###[.]###[/]####[-]##', '11222333000181')
// → '11.222.333/0001-81'

// Cartão Visa
mask('{4}### #### #### ####', '5111111111111111')
// → ''  (primeiro char não passou)

// Hex color com paste sujo
mask('{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}', '1z2b3c')
// → '12b3c'
```

## mask.define — com transform

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

mask('date', '01012025')          // → '01/01/2025'
mask.raw('date', '01/01/2025')    // → Date(2025-01-01)
mask.raw('date', '01/01')         // → null  (incompleto — transform decidiu)
mask.is('date', '01/01/2025')     // → true
mask.hint('date')                 // → '00/00/0000'
mask.rawLength('date', '01/01')   // → 4
mask.patternLength('date')        // → 10
```

## validate — validação incremental

Use `validate` em máscaras nomeadas quando a regra depende do que já foi digitado.
Isso resolve casos onde a sintaxe caractere a caractere não é suficiente, como mês
entre `01` e `12`.

```js
mask.define('month', {
  pattern: '{0-1}#',
  validate: (raw, masked, complete) => {
    if (!complete) return true
    const month = Number(raw)
    return month >= 1 && month <= 12
  },
})

mask('month', '12') // → '12'
mask('month', '19') // → '1'  (o 9 é recusado)
mask.is('month', '12') // → true
mask.is('month', '19') // → false
```

## Slots customizados — sua própria linguagem de pattern

Além de `#`, `@`, `*` e `{expr}`, você pode criar símbolos que façam sentido
para o seu time. Isso ajuda quando o projeto quer uma linguagem mais expressiva,
mais curta ou alinhada ao domínio do produto.

```js
mask.defineSlot('N', {
  test: ch => /\d/.test(ch),
  hint: '0',
})

mask('NNN[-]NN', '12345') // → '123-45'
mask.hint('NNN[-]NN')     // → '000-00'
mask.slots()              // → ['#', '@', '*', 'N']
```

Você também pode passar uma `RegExp` direta ou apenas uma função:

```js
mask.defineSlot('H', /[0-9a-f]/i)
mask.defineSlot('V', ch => 'AEIOUaeiou'.includes(ch))

mask('HHHHHH', '1a2b3c') // → '1a2b3c'
mask('VVV', 'mask')      // → 'a'
```

O registro global afeta o engine global. Para bibliotecas, design systems ou
produtos com regras próprias, prefira uma instância isolada:

```js
const forge = mask.create()

forge.defineSlot('N', { test: ch => /\d/.test(ch), hint: '0' })
forge.defineSlot('#', { test: ch => /[1-9]/.test(ch), hint: '1' })

forge('NNN[-]NN', '12345') // → '123-45'
forge('#', '0')            // → ''   (# foi sobrescrito nesta instância)
mask('#', '0')             // → '0'  (global continua igual)
```

Se um símbolo registrado precisar aparecer como texto fixo, escape com
colchetes:

```js
mask.defineSlot('N', /\d/)

mask('[N]##', '45') // → 'N45'
mask('N##', '145')  // → '145'
```

## mask.on — qualquer framework

```js
// Vanilla JS
const off = mask.on(inputEl, 'cpf', {
  onValue:  raw    => setState(raw),
  onMasked: masked => setLabel(masked),
})
off() // remove listeners

// React
useEffect(() => {
  return mask.on(ref.current, 'date', {
    onValue: (date) => setValue(date), // Date | null
  })
}, [])

// Vue
onMounted(() => {
  mask.on(inputRef.value, 'phone', {
    onValue: v => emit('update:modelValue', v),
  })
})

// Svelte action
function maskAction(node, pattern) {
  const off = mask.on(node, pattern)
  return { destroy: off }
}
```

## mask.create — instâncias isoladas

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
  money: {
    pattern: '########[,]##',
    transform: raw => parseInt(raw || '0', 10) / 100,
  },
})

export const maskUS = mask.create({
  ssn:   { pattern: '###[-]##[-]####' },
  zip:   { pattern: '#####[-]####' },
  phone: { pattern: '[(]###[)] ###[-]####' },
})

// Mesma API, registries isolados — alterações em maskBR não afetam maskUS
maskBR('cpf', '12345678909')          // → '123.456.789-09'
maskBR.raw('date', '01/01/2025')      // → Date
maskBR.names()                         // → ['cpf', 'cnpj', 'phone', 'cep', 'date', 'money']
maskUS.names()                         // → ['ssn', 'zip', 'phone']
```

## rawLength e patternLength

```js
const filled = mask.rawLength('cpf', value)   // chars preenchidos (sem literais)
const total  = mask.patternLength('cpf')       // tamanho total mascarado

const pct    = mask('cpf', value).length / total * 100
const ready  = mask.is('cpf', value)           // habilita submit
const label  = `${filled} raw chars`           // "7 raw chars"
```

`patternLength` conta o tamanho final mascarado, incluindo literais. Exemplos:

```js
mask.patternLength('##[/]##[/]####')       // → 10
mask.patternLength('###[.]###[.]###[-]##') // → 14
mask.patternLength('{4}### #### #### ####') // → 19
```

## Showcase visual

O projeto `maskforge-showcase` demonstra a lib com:

- playground destacado com máscara aplicada enquanto o usuário digita;
- visualização do pattern em blocos: slot, literal e expressão;
- exemplos para React, Vue e Vanilla;
- receitas interativas para `validate`, `define` e `create`;
- análise de benchmark local.

```bash
cd maskforge-showcase
npm install
npm run dev
```

## Benchmark local

Benchmark simples rodado em Node/WSL com 200.000 iterações por caso após warmup.
Os valores variam por máquina, mas ajudam a orientar expectativas de uso em input.

| Caso | Resultado |
|---|---:|
| CPF format | 39.705 ops/s |
| Phone dynamic | 32.455 ops/s |
| Date validate | 64.572 ops/s |
| Raw extraction | 44.729 ops/s |

```js
const iterations = 200000
for (let i = 0; i < iterations; i++) {
  mask('###[.]###[.]###[-]##', '12345678909')
}
```

## transform — contrato

```js
// transform(raw, masked, complete) => T
// validate(raw, masked, complete) => boolean
//
// raw      → string com os chars de input sem literais
// masked   → string formatada com a máscara
// complete → true quando todos os slots estão preenchidos
//
// Sem transform → mask.raw() retorna string crua, sempre
// Com transform → mask.raw() retorna o que transform devolver, sempre
//   O transform decide o que fazer com input parcial

mask.define('money', {
  pattern: '########[,]##',
  transform: raw => parseInt(raw || '0', 10) / 100,
  // retorna number sempre — mesmo parcial
})

mask.define('date', {
  pattern: '##[/]##[/]####',
  transform: (raw, masked, complete) => {
    if (!complete) return null  // null enquanto incompleto
    return new Date(...)        // Date quando completo
  },
})
```

## Licença

MIT

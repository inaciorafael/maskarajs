import { useMemo, useState } from 'react'
import mask from '../../mask.js'
import './App.css'

type Framework = 'React' | 'Vue' | 'Vanilla'
type RegistryName = 'BR' | 'US'
type BlockKind = 'slot' | 'literal' | 'expr' | 'name' | 'pattern'

type Preset = {
  name: string
  pattern: string | string[]
  value: string
  description: string
  implementation: string
}

type Example = {
  title: string
  pattern: string | string[]
  value: string
  description: string
}

const namedPatterns: Record<string, string | string[]> = {
  month: '{0-1}#',
  date: '##[/]{0-1}#[/]####',
  dateStrict: '##[/]{0-1}#[/]####',
  money: '########[,]##',
}

if (!mask.names().includes('month')) {
  mask.define('month', {
    pattern: namedPatterns.month,
    validate: (raw, _masked, complete) => {
      if (!complete) return true
      const month = Number(raw)
      return month >= 1 && month <= 12
    },
  })
}

if (!mask.names().includes('date')) {
  mask.define('date', {
    pattern: namedPatterns.date,
    validate: (raw) => {
      if (raw.length < 4) return true
      const month = Number(raw.slice(2, 4))
      return month >= 1 && month <= 12
    },
    transform: (raw, _masked, complete) => {
      if (!complete) return null
      const date = new Date(`${raw.slice(4, 8)}-${raw.slice(2, 4)}-${raw.slice(0, 2)}T12:00:00`)
      return Number.isNaN(date.getTime()) ? null : date
    },
  })
}

if (!mask.names().includes('dateStrict')) {
  mask.define('dateStrict', {
    pattern: namedPatterns.dateStrict,
    validate: (raw) => {
      if (raw.length < 4) return true
      const month = Number(raw.slice(2, 4))
      return month >= 1 && month <= 12
    },
    transform: (raw, _masked, complete) => {
      if (!complete) return null
      const date = new Date(`${raw.slice(4, 8)}-${raw.slice(2, 4)}-${raw.slice(0, 2)}T12:00:00`)
      return Number.isNaN(date.getTime()) ? null : date
    },
  })
}

if (!mask.names().includes('money')) {
  mask.define('money', {
    pattern: namedPatterns.money,
    transform: (raw) => Number.parseInt(raw || '0', 10) / 100,
  })
}

if (!mask.slots().includes('N')) {
  mask.defineSlot('N', { test: (ch) => /\d/.test(ch), hint: '0' })
}

const teamMask = mask.create()
teamMask.defineSlot('H', { test: (ch) => /[0-9a-fA-F]/.test(ch), hint: 'f' })
teamMask.defineSlot('V', { test: (ch) => 'AEIOUaeiou'.includes(ch), hint: 'a' })

const maskBR = mask.create({
  cpf: { pattern: '###[.]###[.]###[-]##' },
  cnpj: { pattern: '##[.]###[.]###[/]####[-]##' },
  phone: { pattern: ['[(]##[)] ####[-]####', '[(]##[)] #####[-]####'] },
  cep: { pattern: '#####[-]###', transform: (raw, _masked, complete) => (complete ? raw : null) },
})

const maskUS = mask.create({
  ssn: { pattern: '###[-]##[-]####' },
  zip: { pattern: '#####[-]####' },
  phone: { pattern: '[(]###[)] ###[-]####' },
})

const presets: Preset[] = [
  {
    name: 'CPF',
    pattern: '###[.]###[.]###[-]##',
    value: '12345678909',
    description: 'O usuario ve CPF formatado; seu app recebe o valor limpo.',
    implementation: `import mask from 'maskjs'

const pattern = '###[.]###[.]###[-]##'
const value = '12345678909'

const masked = mask(pattern, value)
const raw = mask.raw(pattern, masked)
const complete = mask.is(pattern, masked)`,
  },
  {
    name: 'Telefone BR',
    pattern: ['[(]##[)] ####[-]####', '[(]##[)] #####[-]####'],
    value: '11987654321',
    description: 'Um unico campo cobre telefone fixo e celular sem gambiarras.',
    implementation: `import mask from 'maskjs'

const phone = [
  '[(]##[)] ####[-]####',
  '[(]##[)] #####[-]####',
]

mask(phone, '11987654321')
mask.raw(phone, '(11) 98765-4321')`,
  },
  {
    name: 'Mes validado',
    pattern: 'month',
    value: '12',
    description: 'Quando o pattern sozinho nao basta, validate fecha a regra.',
    implementation: `import mask from 'maskjs'

mask.define('month', {
  pattern: '{0-1}#',
  validate: (raw, _, complete) => {
    if (!complete) return true
    return Number(raw) >= 1 && Number(raw) <= 12
  },
})

mask('month', '19') // '1'`,
  },
  {
    name: 'Slot N custom',
    pattern: 'NNN[-]NN',
    value: '12345',
    description: 'Crie uma linguagem de pattern que combina com o seu time.',
    implementation: `import mask from 'maskjs'

mask.defineSlot('N', {
  test: ch => /\\d/.test(ch),
  hint: '0',
})

mask('NNN[-]NN', '12345')
// '123-45'

mask('[N]##', '45')
// 'N45'`,
  },
  {
    name: 'Data strict',
    pattern: 'dateStrict',
    value: '01122025',
    description: 'Data com mes real, sem aceitar 19/99 no meio do fluxo.',
    implementation: `import mask from 'maskjs'

mask.define('dateStrict', {
  pattern: '##[/]{0-1}#[/]####',
  validate: raw => {
    if (raw.length < 4) return true
    const month = Number(raw.slice(2, 4))
    return month >= 1 && month <= 12
  },
})

mask('dateStrict', '01192025') // '01/1'`,
  },
  {
    name: 'Visa',
    pattern: '{4}### #### #### ####',
    value: '4111111111111111',
    description: 'Restrinja a entrada antes de ela virar estado invalido.',
    implementation: `import mask from 'maskjs'

const visa = '{4}### #### #### ####'

mask(visa, '4111111111111111')
// '4111 1111 1111 1111'

mask(visa, '5111111111111111')
// ''`,
  },
  {
    name: 'Hex',
    pattern:
      '{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}',
    value: '1a2b3c',
    description: 'Regras finas por caractere sem escrever um parser novo.',
    implementation: `import mask from 'maskjs'

const hex = '{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}'

mask(hex, '1z2b3c')
// '12b3c'`,
  },
]

const examples: Example[] = [
  {
    title: 'Documento',
    pattern: '###[.]###[.]###[-]##',
    value: '12345678909',
    description: 'Visual bonito no input, payload limpo para a API.',
  },
  {
    title: 'Data com validate',
    pattern: 'dateStrict',
    value: '01192025',
    description: 'O campo simplesmente nao deixa o erro seguir adiante.',
  },
  {
    title: 'Dinheiro',
    pattern: 'money',
    value: '129990',
    description: 'A mascara cuida da tela; o transform entrega o tipo certo.',
  },
  {
    title: 'Regex slot',
    pattern:
      '{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}',
    value: '1z2b3c',
    description: 'Paste sujo entra, valor coerente sai.',
  },
  {
    title: 'Slot do time',
    pattern: 'NNN[-]NN',
    value: '12345',
    description: 'Quando N significa numero no seu design system.',
  },
]

const snippets: Record<Framework, string> = {
  React: `import { useEffect, useRef, useState } from 'react'
import mask from 'maskjs'

export function useMask<T = string>(pattern, options = {}) {
  const ref = useRef<HTMLInputElement>(null)
  const [raw, setRaw] = useState<T | string>('')
  const [masked, setMasked] = useState('')

  useEffect(() => {
    if (!ref.current) return
    return mask.on<T>(ref.current, pattern, {
      onValue: value => {
        setRaw(value)
        options.onValue?.(value)
      },
      onMasked: value => {
        setMasked(value)
        options.onMasked?.(value)
      },
    })
  }, [pattern])

  return {
    ref,
    raw,
    masked,
    complete: mask.is(pattern, masked),
    placeholder: mask.hint(pattern),
  }
}

export function DateField() {
  const date = useMask<Date | null>('date')

  return <input ref={date.ref} placeholder={date.placeholder} />
}`,
  Vue: `// directives/maskforge.ts
import type { Directive } from 'vue'
import mask from 'maskjs'

type MaskBinding = string | string[] | {
  pattern: string | string[]
  onValue?: (value: unknown) => void
  onMasked?: (value: string) => void
}

export const vMaskforge: Directive<HTMLInputElement, MaskBinding> = {
  mounted(el, binding) {
    const config = Array.isArray(binding.value) || typeof binding.value === 'string'
      ? { pattern: binding.value }
      : binding.value

    el.dataset.maskforgeCleanup = 'on'
    ;(el as any)._maskforgeOff = mask.on(el, config.pattern, {
      onValue: config.onValue,
      onMasked: config.onMasked,
    })
  },
  unmounted(el) {
    ;(el as any)._maskforgeOff?.()
  },
}

<template>
  <input v-maskforge="'#####[-]###'" placeholder="00000-000" />
</template>`,
  Vanilla: `import mask from 'maskjs'

const input = document.querySelector<HTMLInputElement>('#phone')!

const off = mask.on(input, [
  '[(]##[)] ####[-]####',
  '[(]##[)] #####[-]####',
], {
  onValue(raw) {
    console.log({ raw })
  },
  onMasked(masked) {
    console.log({ masked })
  },
})

// off() remove os listeners`,
}

const validateSnippet = `mask.define('month', {
  pattern: '{0-1}#',
  validate: (raw, masked, complete) => {
    if (!complete) return true
    const month = Number(raw)
    return month >= 1 && month <= 12
  },
})

mask('month', '12') // '12'
mask('month', '19') // '1'
mask.is('month', '19') // false`

const defineSnippet = `mask.define('date', {
  pattern: '##[/]{0-1}#[/]####',
  validate: raw => {
    if (raw.length < 4) return true
    const month = Number(raw.slice(2, 4))
    return month >= 1 && month <= 12
  },
  transform: (raw, masked, complete) => {
    if (!complete) return null
    return new Date(\`\${raw.slice(4,8)}-\${raw.slice(2,4)}-\${raw.slice(0,2)}\`)
  },
})`

const createSnippet = `export const maskBR = mask.create({
  cpf:   { pattern: '###[.]###[.]###[-]##' },
  cnpj:  { pattern: '##[.]###[.]###[/]####[-]##' },
  phone: { pattern: ['[(]##[)] ####[-]####', '[(]##[)] #####[-]####'] },
  cep:   { pattern: '#####[-]###', transform: (r, m, c) => c ? r : null },
})

export const maskUS = mask.create({
  ssn:   { pattern: '###[-]##[-]####' },
  zip:   { pattern: '#####[-]####' },
  phone: { pattern: '[(]###[)] ###[-]####' },
})`

const slotsSnippet = `// Global: disponivel para todo o app
mask.defineSlot('N', {
  test: ch => /\\d/.test(ch),
  hint: '0',
})

mask('NNN[-]NN', '12345')
// '123-45'

// Instancia: linguagem isolada para um contexto
const forge = mask.create()
forge.defineSlot('H', /[0-9a-f]/i)
forge.defineSlot('V', ch => 'AEIOUaeiou'.includes(ch))

forge('HHHHHH', '1a2b3c') // '1a2b3c'
forge('VVV', 'maskforge') // 'aoe'`

const apiRows = [
  {
    name: 'mask(pattern, value)',
    label: 'Format',
    description: 'A funcao que voce chama no render, no paste ou antes de mostrar dados vindos da API.',
    example: `mask('###[.]###[.]###[-]##', '12345678909')\n// '123.456.789-09'`,
    sketch: 'format',
  },
  {
    name: 'mask.raw(pattern, value)',
    label: 'Raw',
    description: 'Pegue o que importa para salvar: sem pontos, barras ou ruido visual. Com transform, ja volta no tipo certo.',
    example: `mask.raw('cpf', '123.456.789-09')\n// '12345678909'`,
    sketch: 'raw',
  },
  {
    name: 'validate(raw, masked, complete)',
    label: 'Guard',
    description: 'Para aquelas regras que regex de slot nao resolve sozinha, como mes valido, prefixos e ranges contextuais.',
    example: `mask.define('month', {\n  pattern: '{0-1}#',\n  validate: (raw, _, complete) => !complete || Number(raw) <= 12,\n})`,
    sketch: 'guard',
  },
  {
    name: 'mask.is(pattern, value)',
    label: 'Ready',
    description: 'Uma checagem direta para liberar submit, mostrar sucesso ou manter o fluxo em progresso.',
    example: `mask.is('##[/]##[/]####', '01/01/2025')\n// true`,
    sketch: 'ready',
  },
  {
    name: 'mask.patternLength(pattern)',
    label: 'Measure',
    description: 'Mede o formato final, incluindo literais. Perfeito para feedback visual de preenchimento.',
    example: `mask.patternLength('##[/]##[/]####')\n// 10`,
    sketch: 'measure',
  },
  {
    name: 'mask.create(presets)',
    label: 'Registry',
    description: 'Organize presets por pais, produto ou dominio sem espalhar estado global pela aplicacao.',
    example: `const maskBR = mask.create({\n  cpf: { pattern: '###[.]###[.]###[-]##' },\n})`,
    sketch: 'registry',
  },
  {
    name: 'mask.defineSlot(symbol, definition)',
    label: 'Language',
    description: 'Ensine a engine a falar a linguagem do seu time: N para numero, H para hexadecimal, V para vogal ou qualquer regra curta.',
    example: `mask.defineSlot('N', { test: ch => /\\d/.test(ch), hint: '0' })\nmask('NNN[-]NN', '12345')\n// '123-45'`,
    sketch: 'language',
  },
]

const syntaxRows = [
  ['#', 'Para campos numericos.'],
  ['@', 'Para nomes, siglas e textos com letras.'],
  ['*', 'Quando o caractere pode ser qualquer coisa.'],
  ['[texto]', 'Para pontos, barras, tracos e outros literais.'],
  ['{expr}', 'Para regras mais finas por caractere.'],
  ['N, H...', 'Slots criados por voce para a linguagem do time.'],
]

const benchmarkRows = [
  ['CPF format', '39,705 ops/s', 'Formatacao comum com literais'],
  ['Phone dynamic', '32,455 ops/s', 'Escolha automatica entre patterns'],
  ['Date validate', '64,572 ops/s', 'Regra contextual em mascara nomeada'],
  ['Raw extraction', '44,729 ops/s', 'Valor limpo a partir do display'],
]

function parsePattern(text: string) {
  const trimmed = text.trim()
  if (trimmed.startsWith('[')) {
    const parsed = JSON.parse(trimmed)
    if (Array.isArray(parsed) && parsed.every((item) => typeof item === 'string')) return parsed as string[]
  }
  return trimmed
}

function printPattern(pattern: string | string[]) {
  return Array.isArray(pattern) ? JSON.stringify(pattern, null, 2) : pattern
}

function stringify(value: unknown) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? 'Invalid Date' : value.toISOString().slice(0, 10)
  if (value === null) return 'null'
  if (value === undefined) return 'undefined'
  return String(value)
}

function highlightCode(code: string) {
  const lines = code.split('\n')
  const tokenPattern =
    /(\/\/.*|`(?:\\.|[^`])*`|'(?:\\.|[^'])*'|"(?:\\.|[^"])*"|\b(?:import|from|export|const|let|return|if|true|false|null|new|function|type|interface)\b|\b(?:mask|raw|define|defineSlot|undefineSlot|slots|create|is|hint|patternLength|rawLength|validate|transform|on|Number|Date|console|log)\b|\b\d+(?:\.\d+)?\b)/g

  return lines.map((line, lineIndex) => {
    const parts = line.split(tokenPattern).filter(Boolean)
    return (
      <span className="code-line" key={`${line}-${lineIndex}`}>
        {parts.map((part, partIndex) => {
          let className = 'code-plain'
          if (part.startsWith('//')) className = 'code-comment'
          else if (part.startsWith("'") || part.startsWith('"') || part.startsWith('`')) className = 'code-string'
          else if (/^\d/.test(part)) className = 'code-number'
          else if (/^(import|from|export|const|let|return|if|true|false|null|new|function|type|interface)$/.test(part)) {
            className = 'code-keyword'
          } else if (/^(mask|raw|define|defineSlot|undefineSlot|slots|create|is|hint|patternLength|rawLength|validate|transform|on|Number|Date|console|log)$/.test(part)) {
            className = 'code-function'
          }

          return (
            <span className={className} key={`${part}-${partIndex}`}>
              {part}
            </span>
          )
        })}
        {lineIndex < lines.length - 1 ? '\n' : ''}
      </span>
    )
  })
}

function CodeBlock({ code, className = 'snippet' }: { code: string; className?: string }) {
  return <pre className={`${className} highlighted-code`}>{highlightCode(code)}</pre>
}

function tokenizePattern(pattern: string): Array<{ kind: BlockKind; value: string }> {
  const blocks: Array<{ kind: BlockKind; value: string }> = []
  let i = 0

  while (i < pattern.length) {
    const ch = pattern[i]

    if (ch === '[') {
      const close = pattern.indexOf(']', i)
      if (close === -1) {
        blocks.push({ kind: 'literal', value: pattern.slice(i) })
        break
      }
      blocks.push({ kind: 'literal', value: pattern.slice(i, close + 1) })
      i = close + 1
      continue
    }

    if (ch === '{') {
      const close = pattern.indexOf('}', i)
      if (close === -1) {
        blocks.push({ kind: 'expr', value: pattern.slice(i) })
        break
      }
      blocks.push({ kind: 'expr', value: pattern.slice(i, close + 1) })
      i = close + 1
      continue
    }

    if (mask.slots().includes(ch)) {
      blocks.push({ kind: 'slot', value: ch })
      i += 1
      continue
    }

    blocks.push({ kind: 'literal', value: ch })
    i += 1
  }

  return blocks
}

function visualPatterns(patternText: string) {
  const trimmed = patternText.trim()
  if (trimmed in namedPatterns) {
    return [
      { label: `name: ${trimmed}`, blocks: [{ kind: 'name' as const, value: trimmed }] },
      { label: 'registered pattern', blocks: tokenizePattern(printPattern(namedPatterns[trimmed])) },
    ]
  }

  try {
    const parsed = parsePattern(trimmed)
    if (Array.isArray(parsed)) {
      return parsed.map((pattern, index) => ({
        label: `pattern ${index + 1}`,
        blocks: tokenizePattern(pattern),
      }))
    }
  } catch {
    return [{ label: 'pattern', blocks: [{ kind: 'pattern' as const, value: 'invalid JSON array' }] }]
  }

  return [{ label: 'pattern', blocks: tokenizePattern(trimmed) }]
}

function PatternVisualizer({ patternText }: { patternText: string }) {
  const groups = useMemo(() => visualPatterns(patternText), [patternText])

  return (
    <div className="pattern-visualizer" aria-label="Visualizacao do pattern em blocos">
      <div className="visualizer-head">
        <strong>Mapa do pattern</strong>
        <div className="legend">
          <span className="slot">slot</span>
          <span className="literal">literal</span>
          <span className="expr">expr</span>
        </div>
      </div>
      <div className="block-groups">
        {groups.map((group) => (
          <div className="block-group" key={group.label}>
            <span className="group-label">{group.label}</span>
            <div className="blocks">
              {group.blocks.map((block, index) => (
                <span className={`pattern-block ${block.kind}`} key={`${block.value}-${index}`}>
                  {block.value || 'empty'}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function Playground() {
  const [activePreset, setActivePreset] = useState(0)
  const [inputValue, setInputValue] = useState(mask(presets[0].pattern, presets[0].value))
  const preset = presets[activePreset]
  const patternText = printPattern(preset.pattern)

  const result = useMemo(() => {
    try {
      const pattern = preset.pattern
      const masked = mask(pattern, inputValue)
      const raw = mask.raw(pattern, inputValue)
      const complete = mask.is(pattern, inputValue)
      const hint = mask.hint(pattern)
      const filled = mask.rawLength(pattern, inputValue)
      const total = mask.patternLength(pattern)

      return { ok: true as const, pattern, masked, raw, complete, hint, filled, total }
    } catch (error) {
      return {
        ok: false as const,
        message: error instanceof Error ? error.message : 'Padrao invalido',
      }
    }
  }, [inputValue, preset.pattern])

  const progress = result.ok && result.total > 0 ? Math.min(100, (result.masked.length / result.total) * 100) : 0
  const inputHint = result.ok ? result.hint : 'Digite um valor'

  function selectPreset(index: number) {
    const preset = presets[index]
    setActivePreset(index)
    setInputValue(mask(preset.pattern, preset.value))
  }

  function updateMaskedValue(nextValue: string) {
    setInputValue(mask(preset.pattern, nextValue))
  }

  return (
    <section className="playground-shell" id="playground" aria-label="Playground do Maskforge">
      <div className="section-heading">
        <span>Playground</span>
        <h2>Escolha um exemplo, digite como usuário e veja a implementação completa.</h2>
        <p>
          Aqui os exemplos ficam prontos para uso: você só troca o valor e acompanha o resultado, o raw, o progresso
          e o código necessário para reproduzir o mesmo comportamento no seu frontend.
        </p>
      </div>

      <div className="playground-panel">
        <div className="controls">
          <div className="preset-list" aria-label="Presets">
            {presets.map((preset, index) => (
              <button
                key={preset.name}
                type="button"
                className="preset"
                aria-pressed={activePreset === index}
                onClick={() => selectPreset(index)}
              >
                <strong>{preset.name}</strong>
                <span>{preset.description}</span>
              </button>
            ))}
          </div>

          <div className="locked-pattern">
            <span>Pattern deste exemplo</span>
            <code>{patternText}</code>
          </div>

          <label className="field featured-input">
            <span>Digite como seu usuario digitaria</span>
            <input value={inputValue} placeholder={inputHint} onChange={(event) => updateMaskedValue(event.target.value)} />
          </label>
        </div>

        <div className="results">
          <PatternVisualizer patternText={patternText} />

          <div className="meter" aria-label="Progresso mascarado">
            <span style={{ width: `${progress}%` }} />
          </div>

          {result.ok ? (
            <div className="result-grid">
              <output>
                <span>masked</span>
                <code>{result.masked || '""'}</code>
              </output>
              <output>
                <span>raw</span>
                <code>{stringify(result.raw) || '""'}</code>
              </output>
              <output>
                <span>hint</span>
                <code>{result.hint || '""'}</code>
              </output>
              <output>
                <span>complete</span>
                <code>{String(result.complete)}</code>
              </output>
              <output>
                <span>pattern length</span>
                <code>{result.total}</code>
              </output>
              <output>
                <span>raw length</span>
                <code>{result.filled}</code>
              </output>
            </div>
          ) : (
            <div className="error-box">
              <strong>Padrao invalido</strong>
              <code>{result.message}</code>
            </div>
          )}

          <CodeBlock className="live-code" code={preset.implementation} />
          <CodeBlock className="live-code" code={`mask(${JSON.stringify(patternText)}, '${inputValue}')
// ${result.ok ? result.masked || '""' : 'corrija o padrao'}

mask.raw(pattern, value)
// ${result.ok ? stringify(result.raw) || '""' : '-'}`} />
        </div>
      </div>
    </section>
  )
}

function CustomLab() {
  const [patternText, setPatternText] = useState('###[.]###[.]###[-]##')
  const [inputValue, setInputValue] = useState('')

  const result = useMemo(() => {
    try {
      const pattern = parsePattern(patternText)
      const masked = mask(pattern, inputValue)
      const raw = mask.raw(pattern, inputValue)
      const complete = mask.is(pattern, inputValue)
      const hint = mask.hint(pattern)
      const filled = mask.rawLength(pattern, inputValue)
      const total = mask.patternLength(pattern)
      return { ok: true as const, pattern, masked, raw, complete, hint, filled, total }
    } catch (error) {
      return { ok: false as const, message: error instanceof Error ? error.message : 'Padrao invalido' }
    }
  }, [inputValue, patternText])

  function updateValue(nextValue: string) {
    try {
      setInputValue(mask(parsePattern(patternText), nextValue))
    } catch {
      setInputValue(nextValue)
    }
  }

  return (
    <section className="custom-lab-section">
      <div className="section-heading">
        <span>Laboratório livre</span>
        <h2>Agora é sua vez: escreva qualquer pattern e teste sem compromisso.</h2>
        <p>
          Use este espaço para validar uma regra do seu produto. Cole um pattern, digite valores reais e veja os blocos
          mudarem junto com o resultado.
        </p>
      </div>

      <div className="custom-lab">
        <div className="custom-editor">
          <label className="field">
            <span>Pattern customizado</span>
            <textarea value={patternText} spellCheck={false} onChange={(event) => setPatternText(event.target.value)} />
          </label>
          <label className="field featured-input">
            <span>Valor de teste</span>
            <input value={inputValue} placeholder={result.ok ? result.hint : 'Corrija o pattern'} onChange={(event) => updateValue(event.target.value)} />
          </label>
        </div>

        <div className="custom-preview">
          <PatternVisualizer patternText={patternText} />
          {result.ok ? (
            <div className="result-grid">
              <output>
                <span>masked</span>
                <code>{result.masked || '""'}</code>
              </output>
              <output>
                <span>raw</span>
                <code>{stringify(result.raw) || '""'}</code>
              </output>
              <output>
                <span>complete</span>
                <code>{String(result.complete)}</code>
              </output>
              <output>
                <span>pattern length</span>
                <code>{result.total}</code>
              </output>
            </div>
          ) : (
            <div className="error-box">
              <strong>Pattern inválido</strong>
              <code>{result.message}</code>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}

function ExampleGallery() {
  return (
    <section className="examples-section">
      <div className="section-heading compact">
        <span>Exemplos</span>
        <h2>Os campos que aparecem em todo produto, resolvidos com a mesma API.</h2>
      </div>
      <div className="example-grid">
        {examples.map((example) => {
          const masked = mask(example.pattern, example.value)
          const raw = mask.raw(example.pattern, masked)
          return (
            <article className="example-card" key={example.title}>
              <h3>{example.title}</h3>
              <p>{example.description}</p>
              <code>{printPattern(example.pattern)}</code>
              <div>
                <span>input</span>
                <strong>{example.value}</strong>
              </div>
              <div>
                <span>masked</span>
                <strong>{masked || '""'}</strong>
              </div>
              <div>
                <span>raw</span>
                <strong>{stringify(raw) || '""'}</strong>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function ValidateDemo() {
  const [monthValue, setMonthValue] = useState(mask('month', '12'))
  const [dateValue, setDateValue] = useState(mask('dateStrict', '01122025'))

  const monthRaw = mask.raw('month', monthValue)
  const dateRaw = mask.raw('dateStrict', dateValue)

  return (
    <article className="recipe-card validate-card">
      <div className="recipe-copy">
        <span>validate()</span>
        <h3>Quando a mascara precisa entender contexto.</h3>
        <p>
          `{0-1}#` limita o formato do mes, mas nao sabe que 19 e invalido. `validate` entra nesse ponto e evita
          que o estado ruim chegue no seu formulario.
        </p>
      </div>

      <div className="recipe-play">
        <div className="segmented month-actions" aria-label="Exemplos de mes">
          <button type="button" onClick={() => setMonthValue(mask('month', '12'))}>
            Testar 12
          </button>
          <button type="button" onClick={() => setMonthValue(mask('month', '19'))}>
            Testar 19
          </button>
        </div>
        <label className="field">
          <span>month</span>
          <input value={monthValue} placeholder={mask.hint('month')} onChange={(event) => setMonthValue(mask('month', event.target.value))} />
        </label>
        <label className="field">
          <span>dateStrict</span>
          <input value={dateValue} placeholder={mask.hint('dateStrict')} onChange={(event) => setDateValue(mask('dateStrict', event.target.value))} />
        </label>
        <div className="mini-results">
          <output>
            <span>month raw</span>
            <code>{stringify(monthRaw) || '""'}</code>
          </output>
          <output>
            <span>date raw</span>
            <code>{stringify(dateRaw)}</code>
          </output>
        </div>
      </div>

      <CodeBlock code={validateSnippet} />
    </article>
  )
}

function DefineDemo() {
  const [dateValue, setDateValue] = useState(mask('date', '01012025'))
  const [moneyValue, setMoneyValue] = useState(mask('money', '129990'))

  const dateRaw = mask.raw('date', dateValue)
  const moneyRaw = mask.raw('money', moneyValue)

  return (
    <article className="recipe-card">
      <div className="recipe-copy">
        <span>mask.define()</span>
        <h3>Dê nome para as mascaras que seu produto usa todo dia.</h3>
        <p>O input fica agradavel para o usuario, e o seu codigo recebe string limpa, number, Date, null ou o tipo que fizer sentido.</p>
      </div>

      <div className="recipe-play">
        <label className="field">
          <span>date</span>
          <input value={dateValue} placeholder={mask.hint('date')} onChange={(event) => setDateValue(mask('date', event.target.value))} />
        </label>
        <label className="field">
          <span>money</span>
          <input value={moneyValue} placeholder={mask.hint('money')} onChange={(event) => setMoneyValue(mask('money', event.target.value))} />
        </label>
        <div className="mini-results">
          <output>
            <span>raw date</span>
            <code>{stringify(dateRaw)}</code>
          </output>
          <output>
            <span>raw money</span>
            <code>{stringify(moneyRaw)}</code>
          </output>
        </div>
      </div>

      <CodeBlock code={defineSnippet} />
    </article>
  )
}

function CreateDemo() {
  const [registry, setRegistry] = useState<RegistryName>('BR')
  const [name, setName] = useState('cpf')
  const [value, setValue] = useState(maskBR('cpf', '12345678909'))

  const currentMask = registry === 'BR' ? maskBR : maskUS
  const names = currentMask.names()
  const maskedValue = currentMask(name, value)
  const rawValue = currentMask.raw(name, maskedValue)

  function changeRegistry(nextRegistry: RegistryName) {
    const nextMask = nextRegistry === 'BR' ? maskBR : maskUS
    const nextName = nextMask.names()[0]
    setRegistry(nextRegistry)
    setName(nextName)
    setValue(nextMask(nextName, nextRegistry === 'BR' ? '12345678909' : '123456789'))
  }

  function changeName(nextName: string) {
    setName(nextName)
    setValue(currentMask(nextName, ''))
  }

  return (
    <article className="recipe-card">
      <div className="recipe-copy">
        <span>mask.create()</span>
        <h3>Separe presets por contexto sem misturar responsabilidades.</h3>
        <p>Um checkout BR, um painel US, uma lib interna: cada instancia carrega suas mascaras e usa a mesma API.</p>
      </div>

      <div className="recipe-play">
        <div className="segmented" aria-label="Registry">
          {(['BR', 'US'] as RegistryName[]).map((item) => (
            <button key={item} type="button" aria-pressed={registry === item} onClick={() => changeRegistry(item)}>
              {item}
            </button>
          ))}
        </div>
        <label className="field">
          <span>Mascara nomeada</span>
          <select value={name} onChange={(event) => changeName(event.target.value)}>
            {names.map((maskName) => (
              <option key={maskName} value={maskName}>
                {maskName}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Valor</span>
          <input value={maskedValue} placeholder={currentMask.hint(name)} onChange={(event) => setValue(currentMask(name, event.target.value))} />
        </label>
        <div className="mini-results">
          <output>
            <span>masked</span>
            <code>{maskedValue || '""'}</code>
          </output>
          <output>
            <span>raw</span>
            <code>{stringify(rawValue) || '""'}</code>
          </output>
        </div>
      </div>

      <CodeBlock code={createSnippet} />
    </article>
  )
}

function CustomSlotsDemo() {
  const [globalValue, setGlobalValue] = useState(mask('NNN[-]NN', '12345'))
  const [hexValue, setHexValue] = useState(teamMask('HHHHHH', '1a2b3c'))
  const [vowelValue, setVowelValue] = useState(teamMask('VVV', 'maskforge'))

  return (
    <article className="recipe-card slots-card">
      <div className="recipe-copy">
        <span>defineSlot()</span>
        <h3>Crie uma linguagem de mascara com a cara do seu time.</h3>
        <p>
          `N` pode ser numero, `H` pode ser hexadecimal, `V` pode ser vogal. No global isso vale para o app inteiro;
          em uma instancia, a regra fica isolada para aquele produto, pacote ou formulario.
        </p>
      </div>

      <div className="recipe-play">
        <label className="field">
          <span>Global: NNN[-]NN</span>
          <input value={globalValue} placeholder={mask.hint('NNN[-]NN')} onChange={(event) => setGlobalValue(mask('NNN[-]NN', event.target.value))} />
        </label>
        <label className="field">
          <span>Instancia: HHHHHH</span>
          <input value={hexValue} placeholder={teamMask.hint('HHHHHH')} onChange={(event) => setHexValue(teamMask('HHHHHH', event.target.value))} />
        </label>
        <label className="field">
          <span>Instancia: VVV</span>
          <input value={vowelValue} placeholder={teamMask.hint('VVV')} onChange={(event) => setVowelValue(teamMask('VVV', event.target.value))} />
        </label>
        <div className="mini-results">
          <output>
            <span>slots globais</span>
            <code>{mask.slots().join(' ')}</code>
          </output>
          <output>
            <span>slots instancia</span>
            <code>{teamMask.slots().join(' ')}</code>
          </output>
        </div>
      </div>

      <CodeBlock code={slotsSnippet} />
    </article>
  )
}

function BenchmarkSection() {
  return (
    <section className="benchmark-section">
      <div className="section-heading">
        <span>Performance</span>
        <h2>Leve o bastante para rodar perto do input.</h2>
        <p>
          Estes numeros foram medidos no Node dentro do WSL com 200.000 iteracoes por caso. Eles nao prometem milagre,
          mas mostram a ideia: a mascara pode ficar no caminho critico da digitacao sem virar peso para a interface.
        </p>
      </div>
      <div className="benchmark-grid">
        {benchmarkRows.map(([name, ops, note]) => (
          <article key={name}>
            <span>{name}</span>
            <strong>{ops}</strong>
            <p>{note}</p>
          </article>
        ))}
      </div>
      <CodeBlock className="snippet benchmark-code" code={`const iterations = 200000
for (let i = 0; i < iterations; i++) {
  mask('###[.]###[.]###[-]##', '12345678909')
}`} />
    </section>
  )
}

function HandSketch({ type }: { type: string }) {
  return (
    <svg className={`hand-sketch ${type}`} viewBox="0 0 220 150" role="img" aria-label={`Ilustracao ${type}`}>
      <path className="sketch-paper" d="M18 18 C58 10,146 10,202 19 C208 54,207 99,199 132 C151 142,72 141,20 132 C12 95,13 54,18 18 Z" />
      {type === 'format' && (
        <>
          <path d="M35 48 C62 42,92 42,119 48" />
          <path d="M35 74 C72 68,108 68,146 74" />
          <path d="M142 50 C156 58,165 65,176 76" />
          <path d="M176 76 C163 84,152 91,139 101" />
          <rect x="35" y="94" width="120" height="24" rx="7" />
        </>
      )}
      {type === 'raw' && (
        <>
          <rect x="32" y="42" width="146" height="26" rx="8" />
          <path d="M54 82 C78 91,123 91,150 82" />
          <path d="M69 102 C92 108,124 108,147 102" />
          <path d="M36 55 L53 55 M72 55 L89 55 M109 55 L126 55 M146 55 L164 55" />
        </>
      )}
      {type === 'guard' && (
        <>
          <path d="M48 38 L111 24 L170 39 L161 102 C134 122,91 124,59 101 Z" />
          <path d="M78 73 L99 94 L142 55" />
          <path d="M42 122 C82 112,132 113,178 122" />
        </>
      )}
      {type === 'ready' && (
        <>
          <circle cx="78" cy="76" r="35" />
          <path d="M62 77 L75 91 L101 61" />
          <path d="M125 54 C145 50,166 50,187 55" />
          <path d="M126 79 C146 75,166 76,185 80" />
          <path d="M126 104 C145 101,161 101,181 105" />
        </>
      )}
      {type === 'measure' && (
        <>
          <path d="M38 50 L178 50" />
          <path d="M38 42 L38 59 M178 42 L178 59" />
          <rect x="44" y="78" width="24" height="24" rx="6" />
          <rect x="76" y="78" width="24" height="24" rx="6" />
          <rect x="108" y="78" width="24" height="24" rx="6" />
          <rect x="140" y="78" width="24" height="24" rx="6" />
        </>
      )}
      {type === 'registry' && (
        <>
          <rect x="34" y="36" width="64" height="38" rx="9" />
          <rect x="122" y="36" width="64" height="38" rx="9" />
          <path d="M66 76 C67 92,82 102,105 105" />
          <path d="M154 76 C152 93,139 102,114 105" />
          <rect x="78" y="101" width="64" height="24" rx="8" />
        </>
      )}
      {type === 'language' && (
        <>
          <path d="M40 48 C65 39, 91 39, 116 48" />
          <path d="M42 79 C72 71, 110 72, 146 80" />
          <path d="M48 108 C83 101, 125 101, 170 109" />
          <path d="M146 43 L178 43 L163 67 L178 91 L145 91" />
          <path d="M153 52 C161 58, 166 65, 170 74" />
          <circle cx="62" cy="48" r="4" />
          <circle cx="93" cy="79" r="4" />
          <circle cx="132" cy="108" r="4" />
        </>
      )}
    </svg>
  )
}

function ApiDocsSection() {
  return (
    <section className="api-docs-section">
      <div className="section-heading">
        <span>API na pratica</span>
        <h2>Uma API pequena para cobrir o ciclo inteiro do campo.</h2>
        <p>
          Formatar, limpar, validar, medir progresso e separar presets. O Maskforge tenta resolver essas etapas sem
          obrigar voce a trocar de framework, reescrever hooks ou criar adaptadores para cada tela.
        </p>
      </div>

      <div className="api-flow">
        <div>
          <strong>1. Voce descreve</strong>
          <span>Slots, literais e expressoes em poucas letras.</span>
        </div>
        <div>
          <strong>2. O usuario digita</strong>
          <span>Digitacao, paste e edicao no mesmo campo.</span>
        </div>
        <div>
          <strong>3. A engine trabalha</strong>
          <span>Filtra, valida, aplica literais e transforma.</span>
        </div>
        <div>
          <strong>4. Seu app recebe</strong>
          <span>masked, raw, complete, hint e progresso.</span>
        </div>
      </div>

      <div className="api-doc-grid">
        {apiRows.map((row) => (
          <article className="api-doc-card" key={row.name}>
            <HandSketch type={row.sketch} />
            <div className="api-doc-copy">
              <span>{row.label}</span>
              <h3>{row.name}</h3>
              <p>{row.description}</p>
            </div>
            <CodeBlock code={row.example} className="snippet api-example" />
          </article>
        ))}
      </div>

      <div className="syntax-strip">
        {syntaxRows.map(([name, description]) => (
          <div key={name}>
            <code>{name}</code>
            <span>{description}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function MaskforgeLogo() {
  return (
    <a className="site-logo" href="#top" aria-label="Maskforge">
      <svg viewBox="0 0 64 64" role="img" aria-label="Maskforge logo">
        <path className="rune-plate" d="M13 15 C22 8, 43 8, 52 15 C58 24, 57 42, 51 50 C41 58, 23 58, 13 50 C7 41, 7 24, 13 15 Z" />
        <path d="M20 43 C25 36, 29 28, 33 18" />
        <path d="M33 18 C38 28, 43 36, 48 43" />
        <path d="M25 34 C30 31, 35 31, 40 34" />
        <path d="M24 22 C28 25, 31 27, 35 30" />
        <path d="M42 22 C38 26, 35 29, 31 33" />
        <path className="rune-accent" d="M18 47 C27 51, 39 51, 48 47" />
        <circle cx="24" cy="39" r="1.7" />
        <circle cx="42" cy="39" r="1.7" />
      </svg>
      <span>Maskforge</span>
    </a>
  )
}

function PixSupport() {
  return (
    <aside className="pix-support" aria-label="Apoie o Maskforge">
      <strong>Apoie o projeto</strong>
      <div className="pix-qr">
        <img src="/pix-qrcode.png" alt="QR Code Pix para doacoes" onError={(event) => event.currentTarget.classList.add('is-missing')} />
        <span>QR Pix</span>
      </div>
      <small>Coloque seu QR em <code>public/pix-qrcode.png</code>.</small>
    </aside>
  )
}

function WhyMaskSection() {
  const reasons = [
    ['Cabe no seu formulario', 'A API e pequena: formatar, pegar raw, validar, medir e conectar ao input. Sem arquitetura nova para aprender.'],
    ['Nao prende seu stack', 'Funciona em React, Vue, Svelte ou Vanilla porque o core nao depende de componente, hook ou diretiva.'],
    ['Regras reais, nao so caracteres', 'Com validate e transform, a mascara entende contexto e devolve valores prontos para a regra de negocio.'],
    ['Presets sem estado global', 'mask.create permite separar mascaras por pais, produto ou area do app sem misturar responsabilidades.'],
    ['Leve por design', 'Parser cacheado, zero dependencias e uma superficie pequena para manter perto da digitacao.'],
    ['Legivel para o time', 'Patterns curtos, literais explicitos e blocos visuais tornam a regra facil de revisar.'],
  ]

  return (
    <section className="why-section">
      <div className="section-heading">
        <span>Por que Maskforge</span>
        <h2>Porque mascara de input nao deveria virar uma colecao de excecoes no frontend.</h2>
        <p>
          A proposta e simples: uma engine pequena, declarativa e flexivel o suficiente para lidar com os casos comuns
          e com as regras especificas que aparecem quando o produto amadurece.
        </p>
      </div>
      <div className="why-grid">
        {reasons.map(([title, text], index) => (
          <article key={title}>
            <span>{String(index + 1).padStart(2, '0')}</span>
            <h3>{title}</h3>
            <p>{text}</p>
          </article>
        ))}
      </div>
    </section>
  )
}

function App() {
  const [framework, setFramework] = useState<Framework>('React')

  return (
    <main id="top">
      <MaskforgeLogo />
      <PixSupport />
      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">maskjs · framework-agnostic · zero deps</p>
          <h1>Mascaras de input que deixam o frontend mais simples.</h1>
          <p className="hero-text">
            Maskforge entrega uma forma pequena e previsivel de formatar, limpar e validar campos sem prender seu
            projeto a um framework ou a uma pilha de handlers.
          </p>
          <div className="hero-actions">
            <a className="button primary" href="#playground">
              Testar agora
            </a>
            <a className="button secondary" href="#benchmark">
              Ver performance
            </a>
          </div>
          <div className="stats" aria-label="Diferenciais do Maskforge">
            <div>
              <strong>~4kb</strong>
              <span>Pequena o bastante para ficar perto do input.</span>
            </div>
            <div>
              <strong>validate</strong>
              <span>Regras reais sem transformar o campo em um labirinto.</span>
            </div>
            <div>
              <strong>Typed</strong>
              <span>Presets organizados para projetos que crescem.</span>
            </div>
          </div>
        </div>

        <div className="visual" aria-label="Exemplo visual de mascara">
          <PatternVisualizer patternText="##[/]{0-1}#[/]####" />
          <CodeBlock className="hero-code" code={`mask.define('month', {
  pattern: '{0-1}#',
  validate: raw => Number(raw) <= 12
})

mask('month', '19') // '1'`} />
        </div>
      </section>

      <Playground />
      <CustomLab />
      <ExampleGallery />
      <WhyMaskSection />

      <section className="recipes-section" id="receitas">
        <div className="section-heading">
          <span>Receitas interativas</span>
          <h2>Comece com um pattern. Evolua para uma camada de mascaras do produto.</h2>
          <p>Valide contexto, transforme raw values e organize presets sem espalhar regras de input por todos os componentes.</p>
        </div>

        <div className="recipes-grid">
          <ValidateDemo />
          <CustomSlotsDemo />
          <DefineDemo />
          <CreateDemo />
        </div>
      </section>

      <section className="docs-section" id="implementacao">
        <div className="section-heading">
          <span>Implementacao copiavel</span>
          <h2>Hook para React, diretiva para Vue 3 e um caminho direto para Vanilla.</h2>
          <p>
            A ideia e chegar no seu projeto sem cerimônia: cole o hook, registre a diretiva ou use `mask.on` direto
            no input. O core continua o mesmo.
          </p>
        </div>

        <div className="implementation">
          <div className="tabs" role="tablist" aria-label="Frameworks">
            {(['React', 'Vue', 'Vanilla'] as Framework[]).map((item) => (
              <button
                key={item}
                type="button"
                role="tab"
                aria-selected={framework === item}
                onClick={() => setFramework(item)}
              >
                {item}
              </button>
            ))}
          </div>
          <CodeBlock code={snippets[framework]} />
        </div>
      </section>

      <BenchmarkSection />
      <ApiDocsSection />

      <section className="final-section">
        <div>
          <span>Pronto para experimentar</span>
          <h2>Leve para o seu formulario e remova uma classe inteira de bugs chatos de input.</h2>
        </div>
        <CodeBlock className="footer-code" code={`npm install maskjs
npm run dev`} />
      </section>
    </main>
  )
}

export default App

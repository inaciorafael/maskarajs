/**
 * mask.js — engine de máscaras com padrão declarativo
 *
 * Sintaxe do padrão:
 *   #           → qualquer dígito (0–9)
 *   @           → qualquer letra (a–z, A–Z, acentuados)
 *   *           → qualquer caractere
 *   [texto]     → literal fixo (inserido/removido automaticamente)
 *   {expr}      → slot livre: testa UM caractere contra a expressão
 *
 * Sintaxe de {expr} — três formas, resolvidas nesta ordem:
 *   1. Regex explícita  — contém \, [, ^, (, |  → new RegExp(expr)
 *        {\d}            → /\d/.test(ch)
 *        {[0-4]}         → /[0-4]/.test(ch)
 *        {[^aeiou]}      → qualquer consoante
 *   2. Intervalo        — exatamente "x-y" (3 chars com hífen no meio)
 *        {0-4}           → ch >= '0' && ch <= '4'
 *        {a-f}           → ch >= 'a' && ch <= 'f'
 *   3. Conjunto literal — qualquer outra coisa
 *        {4}             → só o char '4'
 *        {013}           → '0', '1' ou '3'
 *        {SP}            → 'S' ou 'P'
 *
 * Exemplos reais:
 *   CEP:        '#####[-]###'
 *   Telefone:   ['[(]##[)] ####[-]####', '[(]##[)] #####[-]####']
 *   CPF:        '###[.]###[.]###[-]##'
 *   CNPJ:       '##[.]###[.]###[/]####[-]##'
 *   Data:       '##[/]##[/]####'
 *   Mês:        '{0-1}#' + validate incremental para aceitar só 01–12
 *   Cartão:     '#### #### #### ####'
 *   Visa:       '{4}### #### #### ####'
 *   Mês válido: '{0-1}{0-9}[/]{0-3}{0-9}[/]####'
 *   Hex color:  '{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}'
 */

// ─── Cache do parser ───────────────────────────────────────────────────────
//
// parse() compila regex e aloca tokens a cada chamada.
// Como o mesmo padrão é usado em extractInputChars + applyTokens + inputCount
// a cada keystroke, cachear elimina recompilações redundantes.
//
// Chave: string do padrão → Valor: array de tokens imutáveis

const _parseCache = new Map()

// ─── Parser de padrão ──────────────────────────────────────────────────────

/**
 * Resolve {expr} para um predicado de teste (ch: string) => boolean.
 *
 * Ordem de resolução:
 *   1. Regex explícita — expr contém \ [ ^ ( |
 *   2. Intervalo       — exatamente "x-y"
 *   3. Conjunto literal
 */
function resolveExpr(expr) {
  const isRegex = /[\\[^(|]/.test(expr) || expr.startsWith('\\')
  if (isRegex) {
    let re
    try { re = new RegExp(expr) } catch (e) {
      throw new Error(`mask: expressão inválida "{${expr}}" — ${e.message}`)
    }
    return { test: ch => re.test(ch), constraint: expr }
  }
  if (expr.length === 3 && expr[1] === '-') {
    const lo = expr[0], hi = expr[2]
    return { test: ch => ch >= lo && ch <= hi, constraint: expr }
  }
  return { test: ch => expr.includes(ch), constraint: expr }
}

/** Predicados padrão para os tokens base sem modificador */
const DEFAULT_SLOTS = Object.freeze({
  '#': { test: ch => /\d/.test(ch), hint: '0' },
  '@': { test: ch => /[A-Za-zÀ-ÿ]/.test(ch), hint: 'A' },
  '*': { test: () => true, hint: '_' },
})

const globalSlots = { ...DEFAULT_SLOTS }
let globalSlotsVersion = 0
let slotLanguageSeq = 0

function normalizeSlot(symbol, definition) {
  if (typeof symbol !== 'string' || Array.from(symbol).length !== 1) {
    throw new Error('mask.defineSlot: o símbolo precisa ter exatamente 1 caractere')
  }
  if (symbol === '[' || symbol === ']' || symbol === '{' || symbol === '}') {
    throw new Error(`mask.defineSlot: "${symbol}" é reservado pela sintaxe de pattern`)
  }

  if (typeof definition === 'function') {
    return { test: definition, hint: symbol }
  }

  if (definition instanceof RegExp) {
    const flags = definition.flags.replace(/[gy]/g, '')
    const re = new RegExp(definition.source, flags)
    return { test: ch => re.test(ch), hint: symbol }
  }

  if (!definition || typeof definition.test !== 'function') {
    throw new Error(`mask.defineSlot: "${symbol}" precisa de uma função, RegExp ou { test, hint }`)
  }

  return {
    test: definition.test,
    hint: typeof definition.hint === 'string' && definition.hint ? Array.from(definition.hint)[0] : symbol,
  }
}

function defineSlot(slots, symbol, definition) {
  slots[symbol] = normalizeSlot(symbol, definition)
}

/**
 * Converte um padrão string em tokens — resultado cacheado por padrão.
 *
 * Token sem modificador:
 *   '#'     → { type:'input', base:'#',      test: /\d/.test    }
 *
 * Token {expr}:
 *   '{0-4}' → { type:'input', base:'{expr}', test: ch>=0&&ch<=4, constraint:'0-4' }
 *   '{[^0]}'→ { type:'input', base:'{expr}', test: /[^0]/.test,  constraint:'[^0]' }
 */
function parse(pattern, slots = globalSlots, cacheId = 'global', slotsVersion = globalSlotsVersion) {
  const cacheKey = `${cacheId}:${slotsVersion}:${pattern}`
  if (_parseCache.has(cacheKey)) return _parseCache.get(cacheKey)

  const tokens = []
  let i = 0

  while (i < pattern.length) {
    const ch = pattern[i]

    // ── literal fixo [texto] ──────────────────────────────────────────────
    if (ch === '[') {
      const close = pattern.indexOf(']', i)
      if (close === -1) throw new Error(`mask: colchete não fechado em "${pattern}"`)
      tokens.push({ type: 'literal', value: pattern.slice(i + 1, close) })
      i = close + 1
      continue
    }

    // ── slot livre {expr} ─────────────────────────────────────────────────
    if (ch === '{') {
      const close = pattern.indexOf('}', i)
      if (close === -1) throw new Error(`mask: chave não fechada em "${pattern}"`)
      const expr = pattern.slice(i + 1, close)
      if (!expr) throw new Error(`mask: expressão vazia em "${pattern}"`)
      const { test, constraint } = resolveExpr(expr)
      tokens.push({ type: 'input', base: '{expr}', test, constraint })
      i = close + 1
      continue
    }

    // ── tokens de input configuráveis ─────────────────────────────────────
    if (slots[ch]) {
      tokens.push({ type: 'input', base: ch, ...slots[ch] })
      i++
      continue
    }

    // ── literal implícito ─────────────────────────────────────────────────
    tokens.push({ type: 'literal', value: ch })
    i++
  }

  // congela os tokens para evitar mutação acidental no cache
  Object.freeze(tokens)
  _parseCache.set(cacheKey, tokens)
  return tokens
}

/** Quantos slots de input um padrão tem */
function inputCount(pattern, slots = globalSlots, cacheId = 'global', slotsVersion = globalSlotsVersion) {
  return parse(pattern, slots, cacheId, slotsVersion).filter(t => t.type === 'input').length
}

// ─── Engine de aplicação ───────────────────────────────────────────────────

/**
 * Aplica tokens a chars de input já filtrados e validados.
 * Retorna o valor mascarado, sem literais pendurados enquanto a máscara está parcial.
 * Quando todos os slots foram preenchidos, literais finais entram no valor final.
 */
function applyTokens(tokens, inputChars) {
  let masked = ''
  let ci = 0
  const totalInputs = tokens.filter(token => token.type === 'input').length
  const complete = totalInputs > 0 && inputChars.length >= totalInputs

  for (const token of tokens) {
    if (token.type === 'literal') {
      if (ci >= inputChars.length && !complete) break
      masked += token.value
      continue
    }

    if (ci >= inputChars.length) break

    if (token.test(inputChars[ci])) {
      masked += inputChars[ci]
      ci++
    } else {
      break
    }
  }

  if (complete) return masked

  // remove literais pendurados no final sem input depois deles
  let trimmed = masked
  for (let i = tokens.length - 1; i >= 0; i--) {
    const t = tokens[i]
    if (t.type === 'literal') {
      if (trimmed.endsWith(t.value)) trimmed = trimmed.slice(0, -t.value.length)
    } else {
      break
    }
  }

  return trimmed
}

function trailingLiteralValue(tokens) {
  let value = ''

  for (let i = tokens.length - 1; i >= 0; i--) {
    const token = tokens[i]
    if (token.type !== 'literal') break
    value = token.value + value
  }

  return value
}

function hasPartialTrailingLiteral(value, tokens) {
  const literal = trailingLiteralValue(tokens)
  if (!literal) return false

  const text = String(value)
  for (let i = 1; i < literal.length; i++) {
    if (text.endsWith(literal.slice(0, i))) return true
  }

  return false
}

// ─── Seleção de padrão dinâmico ────────────────────────────────────────────

/**
 * Dado um array de padrões e os chars de input,
 * escolhe o menor padrão que ainda comporta todos os chars.
 * Se nenhum comporta, usa o maior.
 */
function selectPattern(patterns, chars, slots = globalSlots, cacheId = 'global', slotsVersion = globalSlotsVersion) {
  const sorted = [...patterns].sort((a, b) => inputCount(a, slots, cacheId, slotsVersion) - inputCount(b, slots, cacheId, slotsVersion))
  for (const p of sorted) {
    if (inputCount(p, slots, cacheId, slotsVersion) >= chars.length) return p
  }
  return sorted[sorted.length - 1]
}

function isPatternRule(item) {
  return item && typeof item === 'object' && !Array.isArray(item) && typeof item.pattern !== 'undefined'
}

function toPatternList(pattern) {
  return Array.isArray(pattern) ? pattern : [pattern]
}

function flattenPatterns(pattern) {
  const list = toPatternList(pattern)
  const flattened = []

  for (const item of list) {
    if (isPatternRule(item)) {
      flattened.push(...flattenPatterns(item.pattern))
    } else if (Array.isArray(item)) {
      flattened.push(...flattenPatterns(item))
    } else {
      flattened.push(item)
    }
  }

  return flattened
}

function hasConditionalRules(pattern) {
  return Array.isArray(pattern) && pattern.some(isPatternRule)
}

function extractCandidateChars(value, patterns, slots = globalSlots, cacheId = 'global', slotsVersion = globalSlotsVersion) {
  const allLiterals = new Set()
  for (const p of flattenPatterns(patterns)) {
    for (const t of parse(p, slots, cacheId, slotsVersion)) {
      if (t.type === 'literal') {
        for (const ch of t.value) allLiterals.add(ch)
      }
    }
  }
  return Array.from(String(value)).filter(ch => !allLiterals.has(ch))
}

function resolvePatternList(pattern, value = '', slots = globalSlots, cacheId = 'global', slotsVersion = globalSlotsVersion) {
  if (!hasConditionalRules(pattern)) return flattenPatterns(pattern)

  const rules = pattern.map(item => isPatternRule(item) ? item : { pattern: item })
  const raw = extractCandidateChars(value, rules.map(rule => rule.pattern), slots, cacheId, slotsVersion).join('')
  const matched = rules.find(rule => typeof rule.when === 'function' && rule.when(raw, String(value)))
  const fallback = rules.find(rule => typeof rule.when !== 'function')
  return flattenPatterns((matched || fallback || rules[0]).pattern)
}

function assertPatternRules(pattern, label) {
  if (!Array.isArray(pattern)) return
  for (const rule of pattern) {
    if (!isPatternRule(rule)) continue
    if (rule.when && typeof rule.when !== 'function') {
      throw new Error(`${label}: when precisa ser uma função`)
    }
    assertPatternRules(rule.pattern, label)
  }
}

function hasPatternMap(definition) {
  return definition?.patterns && typeof definition.patterns === 'object' && !Array.isArray(definition.patterns)
}

function patternMapValues(patterns) {
  return Object.values(patterns)
}

function selectDefinitionPattern(definition, value = '', slots = globalSlots, cacheId = 'global', slotsVersion = globalSlotsVersion) {
  if (!hasPatternMap(definition)) return definition.pattern

  const raw = extractCandidateChars(value, patternMapValues(definition.patterns), slots, cacheId, slotsVersion).join('')
  const selected = definition.select(raw, String(value))

  if (!Object.prototype.hasOwnProperty.call(definition.patterns, selected)) {
    throw new Error(`mask.select: "${String(selected)}" não existe em patterns`)
  }

  return definition.patterns[selected]
}

function allDefinitionPatterns(definition) {
  return hasPatternMap(definition) ? patternMapValues(definition.patterns) : definition.pattern
}

function assertDefinition(name, definition, label = 'mask.define') {
  if (!definition || (!definition.pattern && !definition.patterns)) {
    throw new Error(`${label}: "${name}" precisa de um pattern`)
  }

  if (definition.pattern && definition.patterns) {
    throw new Error(`${label}: "${name}" use pattern ou patterns, não ambos`)
  }

  if (hasPatternMap(definition)) {
    if (typeof definition.select !== 'function') {
      throw new Error(`${label}: "${name}" select precisa ser uma função`)
    }
    const values = patternMapValues(definition.patterns)
    if (values.length === 0) {
      throw new Error(`${label}: "${name}" patterns precisa ter ao menos um pattern`)
    }
    for (const pattern of values) assertPatternRules(pattern, `${label}: "${name}"`)
  } else {
    assertPatternRules(definition.pattern, `${label}: "${name}"`)
  }

  if (definition.validate && typeof definition.validate !== 'function') {
    throw new Error(`${label}: "${name}" validate precisa ser uma função`)
  }
}

// ─── Extração e validação de chars de input ────────────────────────────────

/**
 * Extrai os chars de input de um valor (bruto ou mascarado),
 * filtra literais, valida cada char contra o predicado do slot correspondente,
 * e trunca ao limite do padrão escolhido.
 *
 * FIX: chars inválidos (ex: letras em campo #) são descartados antes de
 * chegar ao applyTokens — garante raw correto mesmo em paste.
 */
function defaultValidate() {
  return true
}

function readFieldValue(valueOrEvent) {
  if (valueOrEvent && typeof valueOrEvent === 'object' && valueOrEvent.target && 'value' in valueOrEvent.target) {
    return valueOrEvent.target.value
  }
  return valueOrEvent
}

function assignFieldState(field, result) {
  field.value = result.value
  field.masked = result.masked
  field.raw = result.raw
  field.complete = result.complete
  field.hint = result.hint
  field.placeholder = result.placeholder
  field.rawLength = result.rawLength
  field.patternLength = result.patternLength
}

function createFieldApi(engine, pattern, initialValue = '') {
  const field = {
    pattern,
    value: '',
    masked: '',
    raw: '',
    complete: false,
    hint: '',
    placeholder: '',
    rawLength: 0,
    patternLength: engine.patternLength(pattern),
    set(valueOrEvent) {
      const value = readFieldValue(valueOrEvent)
      const result = engine.apply(pattern, value)
      assignFieldState(field, result)
      if (valueOrEvent && typeof valueOrEvent === 'object' && valueOrEvent.target && 'value' in valueOrEvent.target) {
        valueOrEvent.target.value = result.value
      }
      return result
    },
    onChange(valueOrEvent) {
      return field.set(valueOrEvent)
    },
    onInput(valueOrEvent) {
      return field.set(valueOrEvent)
    },
    reset(value = '') {
      return field.set(value)
    },
  }

  Object.defineProperty(field, 'inputProps', {
    enumerable: true,
    get() {
      return {
        value: field.value,
        placeholder: field.placeholder,
        onChange: field.onChange,
        onInput: field.onInput,
      }
    },
  })

  field.set(initialValue)
  return field
}

function buildCheckResult(result, value, candidateLength) {
  const hasValue = value != null && String(value).length > 0
  const rejected = candidateLength > result.rawLength
  const valid = result.complete && !rejected
  const reason = valid
    ? 'complete'
    : !hasValue
      ? 'empty'
      : rejected
        ? 'invalid'
        : 'incomplete'

  const messages = {
    complete: 'Value matches the mask.',
    empty: 'Value is empty.',
    invalid: 'Value contains characters or sequences rejected by the mask.',
    incomplete: 'Value does not complete the mask yet.',
  }

  return {
    ...result,
    valid,
    reason,
    message: messages[reason],
    expectedLength: result.patternLength,
    missing: Math.max(result.patternLength - result.value.length, 0),
  }
}

function fullLength(pattern, slots = globalSlots, cacheId = 'global', slotsVersion = globalSlotsVersion) {
  return parse(pattern, slots, cacheId, slotsVersion).reduce((total, token) => {
    if (token.type === 'literal') return total + token.value.length
    return total + 1
  }, 0)
}

function extractInputChars(value, patterns, validate = defaultValidate, slots = globalSlots, cacheId = 'global', slotsVersion = globalSlotsVersion, strict = false) {
  const patList = flattenPatterns(patterns)

  // 1. coleta todos os literais para remover do valor
  const allLiterals = new Set()
  for (const p of patList) {
    for (const t of parse(p, slots, cacheId, slotsVersion)) {
      if (t.type === 'literal') {
        for (const ch of t.value) allLiterals.add(ch)
      }
    }
  }

  // 2. remove literais — chars candidatos a input
  const candidates = Array.from(String(value)).filter(ch => !allLiterals.has(ch))

  // 3. escolhe o padrão para estes candidatos (antes de validar)
  const chosen = selectPattern(patList, candidates, slots, cacheId, slotsVersion)
  const inputTokens = parse(chosen, slots, cacheId, slotsVersion).filter(t => t.type === 'input')

  // 4. valida cada char contra o predicado do slot correspondente
  //    chars que não passam no teste são descartados (não apenas bloqueados)
  //    isso garante que paste com chars inválidos produza raw correto
  const valid = []
  let ti = 0
  for (const ch of candidates) {
    if (ti >= inputTokens.length) break
    if (inputTokens[ti].test(ch)) {
      const next = [...valid, ch]
      const nextRaw = next.join('')
      const nextMasked = applyTokens(parse(chosen, slots, cacheId, slotsVersion), next)
      const complete = next.length >= inputCount(chosen, slots, cacheId, slotsVersion)
      if (!validate(nextRaw, nextMasked, complete)) break
      valid.push(ch)
      ti++
    } else if (strict) {
      break
    }
    // char inválido para este slot → descartado silenciosamente
  }

  // 5. trunca ao limite do padrão (fonte da verdade do tamanho máximo)
  const truncated = valid.slice(0, inputCount(chosen, slots, cacheId, slotsVersion))
  const complete = truncated.length >= inputCount(chosen, slots, cacheId, slotsVersion)

  if (complete && hasPartialTrailingLiteral(value, parse(chosen, slots, cacheId, slotsVersion))) {
    return truncated.slice(0, -1)
  }

  return truncated
}

// ─── Registro de máscaras nomeadas ────────────────────────────────────────

const registry = new Map()

// ─── API pública ───────────────────────────────────────────────────────────

/**
 * mask(pattern, value) — aplica máscara, retorna string formatada (display)
 *
 * @param {string | string[]} pattern  padrão único, array dinâmico, ou nome registrado
 * @param {string}            value    valor bruto ou já mascarado
 * @returns {string}
 *
 * @example
 * mask('##[/]##[/]####', '01012025')              // → '01/01/2025'
 * mask(['[(]##[)] ####[-]####',
 *       '[(]##[)] #####[-]####'], '11987654321') // → '(11) 98765-4321'
 * mask('date', '01012025')                        // → '01/01/2025' (nome registrado)
 */
function mask(pattern, value) {
  if (value == null) return ''
  let validate
  if (typeof pattern === 'string' && registry.has(pattern)) {
    const entry = registry.get(pattern)
    validate = entry.validate
    pattern = selectDefinitionPattern(entry, value, globalSlots, 'global', globalSlotsVersion)
  }
  const str      = String(value)
  const patterns = resolvePatternList(pattern, str, globalSlots, 'global', globalSlotsVersion)
  const chars    = extractInputChars(str, patterns, validate, globalSlots, 'global', globalSlotsVersion)
  const chosen   = selectPattern(patterns, chars, globalSlots, 'global', globalSlotsVersion)
  return applyTokens(parse(chosen, globalSlots, 'global', globalSlotsVersion), chars)
}

/**
 * mask.raw(pattern, value) — devolve o raw passado pelo transform
 *
 * O raw É o transform. Não são dois valores — são um só.
 *
 * Sem transform: devolve a string crua (chars sem literais), sempre.
 * Com transform: devolve exatamente o que transform retornar —
 *   parcial ou completo. O transform recebe (raw, masked, complete).
 *
 * @example
 * mask.raw('##[/]##[/]####', '01/01/2025')  // → '01012025'
 * mask.raw('date', '01/01/2025')            // → Date(2025-01-01)  (com transform)
 * mask.raw('date', '01/01')                 // → null              (transform decidiu)
 */
mask.raw = function (pattern, value) {
  if (value == null) return ''

  let transform
  let validate
  if (typeof pattern === 'string' && registry.has(pattern)) {
    const entry = registry.get(pattern)
    transform   = entry.transform
    validate    = entry.validate
    pattern     = selectDefinitionPattern(entry, value, globalSlots, 'global', globalSlotsVersion)
  }

  const patterns = resolvePatternList(pattern, String(value), globalSlots, 'global', globalSlotsVersion)
  const raw      = extractInputChars(String(value), patterns, validate, globalSlots, 'global', globalSlotsVersion).join('')

  if (!transform) return raw

  const complete = patterns.some(p => raw.length >= inputCount(p, globalSlots, 'global', globalSlotsVersion))
  return transform(raw, mask(pattern, value), complete)
}

/**
 * mask.unmask(pattern, value) — alias semântico de mask.raw()
 *
 * Útil quando a intenção no código é deixar explícito que o valor está sendo
 * desmascarado para persistência, envio para API ou comparação.
 */
mask.unmask = mask.raw

/**
 * mask.is(pattern, value) — verifica se o valor preenche o padrão completamente
 *
 * @example
 * mask.is('##[/]##[/]####', '01/01/2025') // → true
 * mask.is('##[/]##[/]####', '01/01')      // → false
 */
mask.is = function (pattern, value) {
  if (value == null) return false
  let validate
  if (typeof pattern === 'string' && registry.has(pattern)) {
    const entry = registry.get(pattern)
    validate = entry.validate
    pattern = selectDefinitionPattern(entry, value, globalSlots, 'global', globalSlotsVersion)
  }
  const patterns = resolvePatternList(pattern, String(value), globalSlots, 'global', globalSlotsVersion)
  const chars    = extractInputChars(String(value), patterns, validate, globalSlots, 'global', globalSlotsVersion)
  return patterns.some(p => chars.length >= inputCount(p, globalSlots, 'global', globalSlotsVersion))
}

/**
 * mask.hint(pattern) — placeholder legível para o campo
 *
 * @example
 * mask.hint('##[/]##[/]####')          // → '00/00/0000'
 * mask.hint('[(]##[)] #####[-]####')   // → '(00) 00000-0000'
 * mask.hint('{[0-4]}###')              // → '0###'  (primeiro char do range)
 */
mask.hint = function (pattern) {
  if (typeof pattern === 'string' && registry.has(pattern)) {
    pattern = selectDefinitionPattern(registry.get(pattern), '', globalSlots, 'global', globalSlotsVersion)
  }
  const patterns = resolvePatternList(pattern, '', globalSlots, 'global', globalSlotsVersion)
  const p = patterns[patterns.length - 1]
  return parse(p, globalSlots, 'global', globalSlotsVersion)
    .map(t => {
      if (t.type === 'literal') return t.value
      if (t.constraint) {
        if (t.constraint.length === 3 && t.constraint[1] === '-') return t.constraint[0]
        if (/[\\[^(|]/.test(t.constraint) || t.constraint.startsWith('\\')) return '_'
        return t.constraint[0]
      }
      return t.hint || '_'
    })
    .join('')
}

/**
 * mask.rawLength(pattern, value) — comprimento do raw atual (chars de input preenchidos)
 *
 * Equivale a mask.raw(pattern, value).length mas sem passar pelo transform —
 * sempre retorna um número, independente do transform definido.
 *
 * Útil para: progress bars, validação incremental, contadores de caracteres.
 *
 * @example
 * mask.rawLength('##[/]##[/]####', '01/01')      // → 4   (digitando)
 * mask.rawLength('##[/]##[/]####', '01/01/2025') // → 8   (completo)
 * mask.rawLength('date', '01/01/2025')            // → 8   (funciona com nome registrado)
 *
 * // Progress bar:
 * const pct = mask.rawLength('cpf', value) / mask.patternLength('cpf') * 100
 */
mask.rawLength = function (pattern, value) {
  if (value == null) return 0
  let p = pattern
  let validate
  if (typeof p === 'string' && registry.has(p)) {
    const entry = registry.get(p)
    validate = entry.validate
    p = selectDefinitionPattern(entry, value, globalSlots, 'global', globalSlotsVersion)
  }
  const patterns = resolvePatternList(p, String(value), globalSlots, 'global', globalSlotsVersion)
  // Aplica a máscara e conta os chars do resultado — fonte da verdade
  // é o valor mascarado, não o valor bruto (que pode ter chars não validados)
  const masked = mask(p, String(value))
  return extractInputChars(masked, patterns, validate, globalSlots, 'global', globalSlotsVersion).length
}

/**
 * mask.patternLength(pattern) — comprimento total do valor mascarado completo
 *
 * Conta slots de input como 1 caractere e literais pelo seu tamanho real.
 * Para padrões dinâmicos (array), retorna o maior comprimento mascarado.
 *
 * Útil para: limites de caracteres, progress bars, pré-alocação de buffers.
 *
 * @example
 * mask.patternLength('##[/]##[/]####')                    // → 10
 * mask.patternLength('###[.]###[.]###[-]##')              // → 14  (CPF)
 * mask.patternLength(['[(]##[)] ####[-]####',
 *                     '[(]##[)] #####[-]####'])           // → 15  (maior padrão)
 * mask.patternLength('date')                              // → 10  (nome registrado)
 */
mask.patternLength = function (pattern) {
  if (typeof pattern === 'string' && registry.has(pattern)) {
    pattern = allDefinitionPatterns(registry.get(pattern))
  }
  const patterns = flattenPatterns(pattern)
  return Math.max(...patterns.map(p => fullLength(p, globalSlots, 'global', globalSlotsVersion)))
}

/**
 * mask.format(pattern, rawValue) — formata um valor vindo da API (sem máscara)
 *
 * Alias semântico de mask() — deixa clara a intenção de "formatar para exibição"
 * versus "aplicar máscara enquanto o usuário digita".
 *
 * @example
 * mask.format('cpf', user.cpf)        // → '123.456.789-09'
 * mask.format('phone', contact.phone) // → '(11) 98765-4321'
 * mask.format('date', '01012025')     // → '01/01/2025'
 */
mask.format = function (pattern, value) {
  return mask(pattern, value)
}

/**
 * mask.apply(pattern, value) — aplica máscara e retorna resultado rico
 *
 * Reúne as chamadas mais comuns em uma só resposta, sem mudar a API simples.
 *
 * @example
 * mask.apply('cpf', '12345678909')
 * // {
 * //   value: '123.456.789-09',
 * //   masked: '123.456.789-09',
 * //   raw: '12345678909',
 * //   complete: true,
 * //   hint: '000.000.000-00',
 * //   placeholder: '000.000.000-00',
 * //   rawLength: 11,
 * //   patternLength: 14
 * // }
 */
mask.apply = function (pattern, value) {
  const masked = mask(pattern, value)
  const hint = mask.hint(pattern)
  return {
    value: masked,
    masked,
    raw: mask.raw(pattern, masked),
    complete: mask.is(pattern, masked),
    hint,
    placeholder: hint,
    rawLength: mask.rawLength(pattern, masked),
    patternLength: mask.patternLength(pattern),
  }
}

/**
 * mask.field(pattern, initialValue?) — estado simples para campos mascarados
 *
 * Ajuda em UIs leves, demos, web components e integrações manuais sem exigir
 * um framework específico.
 */
mask.field = function (pattern, initialValue = '') {
  return createFieldApi(mask, pattern, initialValue)
}

/**
 * mask.check(pattern, value) — aplica a máscara e explica o estado do campo
 */
mask.check = function (pattern, value) {
  const result = mask.apply(pattern, value)
  let p = pattern
  if (typeof p === 'string' && registry.has(p)) {
    p = selectDefinitionPattern(registry.get(p), value ?? '', globalSlots, 'global', globalSlotsVersion)
  }
  const patterns = resolvePatternList(p, String(value ?? ''), globalSlots, 'global', globalSlotsVersion)
  const candidateLength = extractCandidateChars(String(value ?? ''), patterns, globalSlots, 'global', globalSlotsVersion).length
  return buildCheckResult(result, value, candidateLength)
}

/**
 * mask.define(name, definition) — registra uma máscara nomeada
 *
 * @param {string} name
 * @param {{ pattern: string | string[], transform?: (raw, masked, complete) => any, validate?: (raw, masked, complete) => boolean }} definition
 *
 * @example
 * mask.define('date', {
 *   pattern: '##[/]##[/]####',
 *   transform: (raw, masked, complete) => {
 *     if (!complete) return null
 *     const dt = new Date(`${raw.slice(4,8)}-${raw.slice(2,4)}-${raw.slice(0,2)}`)
 *     return isNaN(dt) ? null : dt
 *   },
 * })
 *
 * mask.define('money', {
 *   pattern: '########[,]##',
 *   transform: raw => parseInt(raw || '0', 10) / 100,
 * })
 *
 * mask.define('month', {
 *   pattern: '{0-1}#',
 *   validate: (raw, masked, complete) => !complete || Number(raw) >= 1 && Number(raw) <= 12,
 * })
 */
mask.define = function (name, definition) {
  assertDefinition(name, definition)
  registry.set(name, definition)
}

/**
 * mask.undefine(name) — remove uma máscara do registro
 *
 * @example
 * mask.undefine('date')
 * mask.is('date', '01/01/2025') // throws — 'date' não existe mais
 */
mask.undefine = function (name) {
  registry.delete(name)
}

/**
 * mask.names() — lista todas as máscaras registradas
 *
 * @example
 * mask.names() // → ['cpf', 'phone', 'date', 'money', ...]
 */
mask.names = function () {
  return Array.from(registry.keys())
}

/**
 * mask.defineSlot(symbol, definition) — cria ou sobrescreve um token de input.
 *
 * @example
 * mask.defineSlot('N', { test: ch => /\d/.test(ch), hint: '0' })
 * mask('NNN[-]NN', '12345') // → '123-45'
 */
mask.defineSlot = function (symbol, definition) {
  defineSlot(globalSlots, symbol, definition)
  globalSlotsVersion++
}

/**
 * mask.undefineSlot(symbol) — remove um token customizado.
 * Tokens padrão (#, @, *) voltam ao comportamento original.
 */
mask.undefineSlot = function (symbol) {
  if (DEFAULT_SLOTS[symbol]) globalSlots[symbol] = DEFAULT_SLOTS[symbol]
  else delete globalSlots[symbol]
  globalSlotsVersion++
}

/**
 * mask.slots() — lista os símbolos disponíveis na linguagem atual.
 */
mask.slots = function () {
  return Object.keys(globalSlots)
}

/**
 * mask.on(input, pattern, options?) — vincula máscara a um input DOM
 *
 * Framework-agnostic. Retorna função de cleanup.
 *
 * options:
 *   onValue(raw)    — valor limpo / transformado a cada mudança
 *   onMasked(v)     — valor mascarado a cada mudança
 *
 * @example
 * // Vanilla
 * const off = mask.on(el, 'cpf', { onValue: v => setState(v) })
 * off() // remove listeners
 *
 * // React
 * useEffect(() => mask.on(ref.current, 'date', {
 *   onValue: date => setValue(date), // recebe Date | null
 * }), [])
 *
 * // Vue
 * onMounted(() => mask.on(inputRef.value, 'phone', {
 *   onValue: v => emit('update:modelValue', v),
 * }))
 */
mask.on = function (input, pattern, options = {}) {
  const { onValue, onMaskara, onMasked } = options

  function currentPatterns() {
    let p = pattern
    if (typeof p === 'string' && registry.has(p)) p = selectDefinitionPattern(registry.get(p), input.value, globalSlots, 'global', globalSlotsVersion)
    return resolvePatternList(p, input.value, globalSlots, 'global', globalSlotsVersion)
  }

  // Bloqueia keydown quando já no limite máximo —
  // evita o flash de um frame com char excedente antes do handler corrigir
  function onKeydown(e) {
    if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return
    const patterns = currentPatterns()
    let validate
    if (typeof pattern === 'string' && registry.has(pattern)) validate = registry.get(pattern).validate
    const chars    = extractInputChars(e.target.value, patterns, validate, globalSlots, 'global', globalSlotsVersion)
    const maxLimit = Math.max(...patterns.map(p => inputCount(p, globalSlots, 'global', globalSlotsVersion)))
    if (chars.length >= maxLimit) e.preventDefault()
  }

  // Handler de input: aplica máscara, preserva cursor, dispara callbacks
  function handler(e) {
    const el     = e.target
    const raw    = el.value
    const masked = mask(pattern, raw)
    const cursor = el.selectionStart ?? masked.length
    const diff   = masked.length - raw.length

    el.value = masked

    requestAnimationFrame(() => {
      const pos = Math.max(0, cursor + diff)
      el.setSelectionRange(pos, pos)
    })

    onMaskara?.(masked)
    onMasked?.(masked)
    onValue?.(mask.raw(pattern, masked))
  }

  input.addEventListener('keydown', onKeydown)
  input.addEventListener('input',   handler)

  return () => {
    input.removeEventListener('keydown', onKeydown)
    input.removeEventListener('input',   handler)
  }
}

// ─── Instância isolada ────────────────────────────────────────────────────

/**
 * Cria uma instância independente do engine com registry próprio
 * e presets opcionais — sem compartilhar estado com a instância global.
 *
 * Útil para:
 *   - Múltiplos contextos num mesmo projeto (BR + US, admin + cliente)
 *   - Bibliotecas que não querem poluir o registry global
 *   - Testes com estado isolado
 *   - Presets reutilizáveis distribuídos como pacote
 *
 * @param {Record<string, MaskDefinition>} presets  máscaras pré-configuradas
 * @returns instância com a mesma API de mask, mas registry isolado
 *
 * @example
 * // Instância com presets brasileiros
 * export const maskBR = mask.create({
 *   cpf:   { pattern: '###[.]###[.]###[-]##' },
 *   cnpj:  { pattern: '##[.]###[.]###[/]####[-]##' },
 *   phone: { pattern: ['[(]##[)] ####[-]####', '[(]##[)] #####[-]####'] },
 *   cep:   { pattern: '#####[-]###', transform: (r,m,c) => c ? r : null },
 *   date:  {
 *     pattern: '##[/]##[/]####',
 *     transform: (raw, masked, complete) => {
 *       if (!complete) return null
 *       const dt = new Date(`${raw.slice(4,8)}-${raw.slice(2,4)}-${raw.slice(0,2)}T12:00:00`)
 *       return isNaN(dt) ? null : dt
 *     },
 *   },
 *   money: {
 *     pattern: '########[,]##',
 *     transform: raw => parseInt(raw || '0', 10) / 100,
 *   },
 * })
 *
 * // Instância com presets americanos
 * export const maskUS = mask.create({
 *   ssn:   { pattern: '###[-]##[-]####' },
 *   zip:   { pattern: '#####[-]####' },
 *   phone: { pattern: '({0-9}{0-9}{0-9}) ###[-]####' },
 *   date:  { pattern: '##{/}##[/]####' },
 * })
 *
 * // Uso — mesma API, registry isolado
 * maskBR('cpf', '12345678909')         // → '123.456.789-09'
 * maskBR.raw('date', '01/01/2025')     // → Date(2025-01-01)
 * maskBR.is('phone', '(11) 98765-4321')// → true
 * maskBR.on(el, 'cep', { onValue: v => setCep(v) })
 *
 * // Registros da instância não afetam a global nem outras instâncias
 * maskBR.define('rg', { pattern: '##[.]###[.]###[-]#' })
 * maskUS.names() // → ['ssn', 'zip', 'phone', 'date']  (sem 'rg')
 * mask.names()   // → []  (global intocada)
 */
mask.create = function (presets = {}, options = {}) {
  // registry isolado para esta instância
  const localRegistry = new Map()
  const localSlots = { ...globalSlots }
  const localCacheId = `local-${++slotLanguageSeq}`
  let localSlotsVersion = globalSlotsVersion
  const strict = Boolean(options.strict)

  // registra presets iniciais
  for (const [name, def] of Object.entries(presets)) {
    assertDefinition(name, def, 'mask.create')
    localRegistry.set(name, def)
  }

  // resolve pattern de um nome neste registry local
  function resolveLocal(pattern) {
    if (typeof pattern === 'string' && localRegistry.has(pattern)) {
      return localRegistry.get(pattern).pattern
    }
    return pattern
  }

  function resolveLocalForValue(pattern, value = '') {
    if (typeof pattern === 'string' && localRegistry.has(pattern)) {
      return selectDefinitionPattern(localRegistry.get(pattern), value, localSlots, localCacheId, localSlotsVersion)
    }
    return pattern
  }

  function resolveLocalForLength(pattern) {
    if (typeof pattern === 'string' && localRegistry.has(pattern)) {
      return allDefinitionPatterns(localRegistry.get(pattern))
    }
    return pattern
  }

  function resolveLocalEntry(pattern) {
    if (typeof pattern === 'string' && localRegistry.has(pattern)) {
      return localRegistry.get(pattern)
    }
    return undefined
  }

  // ── API da instância — espelha mask.* usando o registry local ─────────

  function instance(pattern, value) {
    if (value == null) return ''
    const p = resolveLocalForValue(pattern, value)
    const pats = resolvePatternList(p, String(value), localSlots, localCacheId, localSlotsVersion)
    const chars = extractInputChars(String(value), pats, resolveLocalEntry(pattern)?.validate, localSlots, localCacheId, localSlotsVersion, strict)
    const chosen = selectPattern(pats, chars, localSlots, localCacheId, localSlotsVersion)
    return applyTokens(parse(chosen, localSlots, localCacheId, localSlotsVersion), chars)
  }

  instance.raw = function (pattern, value) {
    if (value == null) return ''
    let transform
    let validate
    if (typeof pattern === 'string' && localRegistry.has(pattern)) {
      const entry = localRegistry.get(pattern)
      transform   = entry.transform
      validate    = entry.validate
      pattern     = selectDefinitionPattern(entry, value, localSlots, localCacheId, localSlotsVersion)
    }
    const pats     = resolvePatternList(pattern, String(value), localSlots, localCacheId, localSlotsVersion)
    const raw      = extractInputChars(String(value), pats, validate, localSlots, localCacheId, localSlotsVersion, strict).join('')
    if (!transform) return raw
    const complete = pats.some(p => raw.length >= inputCount(p, localSlots, localCacheId, localSlotsVersion))
    return transform(raw, instance(pattern, value), complete)
  }

  instance.unmask = instance.raw

  instance.is = function (pattern, value) {
    if (value == null) return false
    const p    = resolveLocalForValue(pattern, value)
    const pats = resolvePatternList(p, String(value), localSlots, localCacheId, localSlotsVersion)
    const chars = extractInputChars(String(value), pats, resolveLocalEntry(pattern)?.validate, localSlots, localCacheId, localSlotsVersion, strict)
    return pats.some(pt => chars.length >= inputCount(pt, localSlots, localCacheId, localSlotsVersion))
  }

  instance.hint = function (pattern) {
    const p = resolveLocalForValue(pattern, '')
    const pats = resolvePatternList(p, '', localSlots, localCacheId, localSlotsVersion)
    const pat = pats[pats.length - 1]
    return parse(pat, localSlots, localCacheId, localSlotsVersion).map(t => {
      if (t.type === 'literal') return t.value
      if (t.constraint) {
        if (t.constraint.length === 3 && t.constraint[1] === '-') return t.constraint[0]
        if (/[\\[^(|]/.test(t.constraint) || t.constraint.startsWith('\\')) return '_'
        return t.constraint[0]
      }
      return t.hint || '_'
    }).join('')
  }

  instance.format = function (pattern, value) {
    return instance(pattern, value)
  }

  instance.apply = function (pattern, value) {
    const masked = instance(pattern, value)
    const hint = instance.hint(pattern)
    return {
      value: masked,
      masked,
      raw: instance.raw(pattern, masked),
      complete: instance.is(pattern, masked),
      hint,
      placeholder: hint,
      rawLength: instance.rawLength(pattern, masked),
      patternLength: instance.patternLength(pattern),
    }
  }

  instance.field = function (pattern, initialValue = '') {
    return createFieldApi(instance, pattern, initialValue)
  }

  instance.check = function (pattern, value) {
    const result = instance.apply(pattern, value)
    const p = resolveLocalForValue(pattern, value ?? '')
    const pats = resolvePatternList(p, String(value ?? ''), localSlots, localCacheId, localSlotsVersion)
    const candidateLength = extractCandidateChars(String(value ?? ''), pats, localSlots, localCacheId, localSlotsVersion).length
    return buildCheckResult(result, value, candidateLength)
  }

  instance.define = function (name, definition) {
    assertDefinition(name, definition)
    localRegistry.set(name, definition)
  }

  instance.undefine = function (name) {
    localRegistry.delete(name)
  }

  instance.names = function () {
    return Array.from(localRegistry.keys())
  }

  instance.rawLength = function (pattern, value) {
    if (value == null) return 0
    const p = resolveLocalForValue(pattern, value)
    const pats = resolvePatternList(p, String(value), localSlots, localCacheId, localSlotsVersion)
    const masked = instance(pattern, String(value))
    return extractInputChars(masked, pats, resolveLocalEntry(pattern)?.validate, localSlots, localCacheId, localSlotsVersion, strict).length
  }

  instance.patternLength = function (pattern) {
    const p = resolveLocalForLength(pattern)
    const pats = flattenPatterns(p)
    return Math.max(...pats.map(p => fullLength(p, localSlots, localCacheId, localSlotsVersion)))
  }

  instance.on = function (input, pattern, options = {}) {
    const { onValue, onMaskara, onMasked } = options

    function currentPatterns() {
      const p = resolveLocalForValue(pattern, input.value)
      return resolvePatternList(p, input.value, localSlots, localCacheId, localSlotsVersion)
    }

    function onKeydown(e) {
      if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return
      const pats     = currentPatterns()
      const chars    = extractInputChars(e.target.value, pats, resolveLocalEntry(pattern)?.validate, localSlots, localCacheId, localSlotsVersion, strict)
      const maxLimit = Math.max(...pats.map(p => inputCount(p, localSlots, localCacheId, localSlotsVersion)))
      if (chars.length >= maxLimit) e.preventDefault()
    }

    function handler(e) {
      const el     = e.target
      const raw    = el.value
      const masked = instance(pattern, raw)
      const cursor = el.selectionStart ?? masked.length
      const diff   = masked.length - raw.length
      el.value     = masked
      requestAnimationFrame(() => {
        const pos = Math.max(0, cursor + diff)
        el.setSelectionRange(pos, pos)
      })
      onMaskara?.(masked)
      onMasked?.(masked)
      onValue?.(instance.raw(pattern, masked))
    }

    input.addEventListener('keydown', onKeydown)
    input.addEventListener('input',   handler)

    return () => {
      input.removeEventListener('keydown', onKeydown)
      input.removeEventListener('input',   handler)
    }
  }

  instance.defineSlot = function (symbol, definition) {
    defineSlot(localSlots, symbol, definition)
    localSlotsVersion++
  }

  instance.undefineSlot = function (symbol) {
    if (DEFAULT_SLOTS[symbol]) localSlots[symbol] = DEFAULT_SLOTS[symbol]
    else delete localSlots[symbol]
    localSlotsVersion++
  }

  instance.slots = function () {
    return Object.keys(localSlots)
  }

  // permite encadear mais defines após create()
  instance.create = mask.create

  return instance
}

// ─── Export ────────────────────────────────────────────────────────────────

const maskara = mask

export { mask, maskara }
export default mask

// CJS: module.exports = mask

const _parseCache = new Map()
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
function tokenHint(token) {
if (token.type === 'literal') return token.value
if (token.constraint) {
if (token.constraint.length === 3 && token.constraint[1] === '-') return token.constraint[0]
if (/[\\[^(|]/.test(token.constraint) || token.constraint.startsWith('\\')) return '_'
return token.constraint[0]
}
return token.hint || '_'
}
function compile(pattern, slots = globalSlots, cacheId = 'global', slotsVersion = globalSlotsVersion) {
const cacheKey = `${cacheId}:${slotsVersion}:${pattern}`
if (_parseCache.has(cacheKey)) return _parseCache.get(cacheKey)
const tokens = []
const inputTokens = []
const literalChars = new Set()
let patternLength = 0
let trailingLiteral = ''
let i = 0
while (i < pattern.length) {
const ch = pattern[i]
if (ch === '[') {
const close = pattern.indexOf(']', i)
if (close === -1) throw new Error(`mask: colchete não fechado em "${pattern}"`)
const value = pattern.slice(i + 1, close)
tokens.push({ type: 'literal', value })
for (const literalChar of value) literalChars.add(literalChar)
patternLength += value.length
i = close + 1
continue
}
if (ch === '{') {
const close = pattern.indexOf('}', i)
if (close === -1) throw new Error(`mask: chave não fechada em "${pattern}"`)
const expr = pattern.slice(i + 1, close)
if (!expr) throw new Error(`mask: expressão vazia em "${pattern}"`)
const { test, constraint } = resolveExpr(expr)
const token = { type: 'input', base: '{expr}', test, constraint }
tokens.push(token)
inputTokens.push(token)
patternLength++
i = close + 1
continue
}
if (slots[ch]) {
const token = { type: 'input', base: ch, ...slots[ch] }
tokens.push(token)
inputTokens.push(token)
patternLength++
i++
continue
}
tokens.push({ type: 'literal', value: ch })
literalChars.add(ch)
patternLength++
i++
}
for (let i = tokens.length - 1; i >= 0; i--) {
const token = tokens[i]
if (token.type !== 'literal') break
trailingLiteral = token.value + trailingLiteral
}
Object.freeze(tokens)
Object.freeze(inputTokens)
const compiled = Object.freeze({
pattern,
tokens,
inputTokens,
inputCount: inputTokens.length,
patternLength,
literalChars,
trailingLiteral,
hint: tokens.map(tokenHint).join(''),
})
_parseCache.set(cacheKey, compiled)
return compiled
}
function parse(pattern, slots = globalSlots, cacheId = 'global', slotsVersion = globalSlotsVersion) {
return compile(pattern, slots, cacheId, slotsVersion).tokens
}
function inputCount(pattern, slots = globalSlots, cacheId = 'global', slotsVersion = globalSlotsVersion) {
return compile(pattern, slots, cacheId, slotsVersion).inputCount
}
function applyTokens(tokens, inputChars, inputTotal = tokens.filter(token => token.type === 'input').length) {
let masked = ''
let ci = 0
const complete = inputTotal > 0 && inputChars.length >= inputTotal
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
for (const ch of compile(p, slots, cacheId, slotsVersion).literalChars) allLiterals.add(ch)
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
function defaultValidate() {
return true
}
function toNumber(raw) {
return raw ? Number(raw) : null
}
function toCents(raw) {
return Number.parseInt(raw || '0', 10) / 100
}
function toDateBR(raw, _masked, complete) {
if (!complete) return null
const day = Number(raw.slice(0, 2))
const month = Number(raw.slice(2, 4))
const year = Number(raw.slice(4, 8))
const date = new Date(year, month - 1, day)
if (
Number.isNaN(date.getTime()) ||
date.getFullYear() !== year ||
date.getMonth() !== month - 1 ||
date.getDate() !== day
) {
return null
}
return date
}
function toParts(schema) {
return (raw, masked, complete) => {
const result = { raw, masked, complete }
for (const [key, range] of Object.entries(schema)) {
result[key] = raw.slice(range[0], range[1])
}
return result
}
}
const transforms = Object.freeze({
number: toNumber,
cents: toCents,
dateBR: toDateBR,
parts: toParts,
})
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
function resolveEntryPattern(pattern, value, registryMap, slots, cacheId, slotsVersion) {
const entry = typeof pattern === 'string' && registryMap?.has(pattern)
? registryMap.get(pattern)
: undefined
return {
entry,
pattern: entry
? selectDefinitionPattern(entry, value, slots, cacheId, slotsVersion)
: pattern,
}
}
function hintFor(pattern, registryMap, slots, cacheId, slotsVersion) {
if (typeof pattern === 'string' && registryMap?.has(pattern)) {
pattern = selectDefinitionPattern(registryMap.get(pattern), '', slots, cacheId, slotsVersion)
}
const patterns = resolvePatternList(pattern, '', slots, cacheId, slotsVersion)
return compile(patterns[patterns.length - 1], slots, cacheId, slotsVersion).hint
}
function patternLengthFor(pattern, registryMap, slots, cacheId, slotsVersion) {
if (typeof pattern === 'string' && registryMap?.has(pattern)) {
pattern = allDefinitionPatterns(registryMap.get(pattern))
}
const patterns = flattenPatterns(pattern)
return Math.max(...patterns.map(p => compile(p, slots, cacheId, slotsVersion).patternLength))
}
function explainToken(token, index) {
if (token.type === 'literal') {
return {
type: 'literal',
index,
value: token.value,
length: token.value.length,
}
}
return {
type: token.base === '{expr}' ? 'expression' : 'slot',
index,
value: token.base === '{expr}' ? `{${token.constraint}}` : token.base,
hint: tokenHint(token),
constraint: token.constraint,
length: 1,
}
}
function explainFor(pattern, registryMap, slots, cacheId, slotsVersion) {
if (typeof pattern === 'string' && registryMap?.has(pattern)) {
pattern = allDefinitionPatterns(registryMap.get(pattern))
}
const patterns = flattenPatterns(pattern)
const variants = patterns.map(p => {
const compiled = compile(p, slots, cacheId, slotsVersion)
return {
pattern: p,
hint: compiled.hint,
rawLength: compiled.inputCount,
patternLength: compiled.patternLength,
tokens: compiled.tokens.map(explainToken),
}
})
return {
pattern,
variants,
hint: variants[variants.length - 1]?.hint || '',
rawLength: Math.max(...variants.map(variant => variant.rawLength)),
patternLength: Math.max(...variants.map(variant => variant.patternLength)),
}
}
function applyEngine(pattern, value, registryMap, slots, cacheId, slotsVersion, strict = false) {
const str = value == null ? '' : String(value)
const resolved = resolveEntryPattern(pattern, str, registryMap, slots, cacheId, slotsVersion)
const patterns = resolvePatternList(resolved.pattern, str, slots, cacheId, slotsVersion)
const chars = extractInputChars(str, patterns, resolved.entry?.validate, slots, cacheId, slotsVersion, strict)
const chosen = selectPattern(patterns, chars, slots, cacheId, slotsVersion)
const compiled = compile(chosen, slots, cacheId, slotsVersion)
const masked = applyTokens(compiled.tokens, chars, compiled.inputCount)
const rawString = chars.join('')
const complete = patterns.some(p => rawString.length >= inputCount(p, slots, cacheId, slotsVersion))
const raw = resolved.entry?.transform
? resolved.entry.transform(rawString, masked, complete)
: rawString
const hint = hintFor(pattern, registryMap, slots, cacheId, slotsVersion)
return {
value: masked,
masked,
raw,
complete,
hint,
placeholder: hint,
rawLength: chars.length,
patternLength: patternLengthFor(pattern, registryMap, slots, cacheId, slotsVersion),
}
}
function fullLength(pattern, slots = globalSlots, cacheId = 'global', slotsVersion = globalSlotsVersion) {
return compile(pattern, slots, cacheId, slotsVersion).patternLength
}
function extractInputChars(value, patterns, validate = defaultValidate, slots = globalSlots, cacheId = 'global', slotsVersion = globalSlotsVersion, strict = false) {
const patList = flattenPatterns(patterns)
const allLiterals = new Set()
for (const p of patList) {
for (const ch of compile(p, slots, cacheId, slotsVersion).literalChars) allLiterals.add(ch)
}
const candidates = Array.from(String(value)).filter(ch => !allLiterals.has(ch))
const chosen = selectPattern(patList, candidates, slots, cacheId, slotsVersion)
const compiled = compile(chosen, slots, cacheId, slotsVersion)
const inputTokens = compiled.inputTokens
const valid = []
let ti = 0
for (const ch of candidates) {
if (ti >= inputTokens.length) break
if (inputTokens[ti].test(ch)) {
const next = [...valid, ch]
const nextRaw = next.join('')
const nextMasked = applyTokens(compiled.tokens, next, compiled.inputCount)
const complete = next.length >= compiled.inputCount
if (!validate(nextRaw, nextMasked, complete)) break
valid.push(ch)
ti++
} else if (strict) {
break
}
}
const truncated = valid.slice(0, compiled.inputCount)
const complete = truncated.length >= compiled.inputCount
if (complete && hasPartialTrailingLiteral(value, compiled.tokens)) {
return truncated.slice(0, -1)
}
return truncated
}
const registry = new Map()
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
const compiled = compile(chosen, globalSlots, 'global', globalSlotsVersion)
return applyTokens(compiled.tokens, chars, compiled.inputCount)
}
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
mask.unmask = mask.raw
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
mask.hint = function (pattern) {
return hintFor(pattern, registry, globalSlots, 'global', globalSlotsVersion)
}
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
const masked = mask(p, String(value))
return extractInputChars(masked, patterns, validate, globalSlots, 'global', globalSlotsVersion).length
}
mask.patternLength = function (pattern) {
return patternLengthFor(pattern, registry, globalSlots, 'global', globalSlotsVersion)
}
mask.explain = function (pattern) {
return explainFor(pattern, registry, globalSlots, 'global', globalSlotsVersion)
}
mask.format = function (pattern, value) {
return mask(pattern, value)
}
mask.transforms = transforms
mask.apply = function (pattern, value) {
return applyEngine(pattern, value, registry, globalSlots, 'global', globalSlotsVersion)
}
mask.field = function (pattern, initialValue = '') {
return createFieldApi(mask, pattern, initialValue)
}
mask.check = function (pattern, value) {
const result = mask.apply(pattern, value)
const resolved = resolveEntryPattern(pattern, value ?? '', registry, globalSlots, 'global', globalSlotsVersion)
const patterns = resolvePatternList(resolved.pattern, String(value ?? ''), globalSlots, 'global', globalSlotsVersion)
const candidateLength = extractCandidateChars(String(value ?? ''), patterns, globalSlots, 'global', globalSlotsVersion).length
return buildCheckResult(result, value, candidateLength)
}
mask.define = function (name, definition) {
assertDefinition(name, definition)
registry.set(name, definition)
}
mask.undefine = function (name) {
registry.delete(name)
}
mask.names = function () {
return Array.from(registry.keys())
}
mask.defineSlot = function (symbol, definition) {
defineSlot(globalSlots, symbol, definition)
globalSlotsVersion++
}
mask.undefineSlot = function (symbol) {
if (DEFAULT_SLOTS[symbol]) globalSlots[symbol] = DEFAULT_SLOTS[symbol]
else delete globalSlots[symbol]
globalSlotsVersion++
}
mask.slots = function () {
return Object.keys(globalSlots)
}
mask.on = function (input, pattern, options = {}) {
const { onValue, onMaskara, onMasked } = options
function currentPatterns() {
let p = pattern
if (typeof p === 'string' && registry.has(p)) p = selectDefinitionPattern(registry.get(p), input.value, globalSlots, 'global', globalSlotsVersion)
return resolvePatternList(p, input.value, globalSlots, 'global', globalSlotsVersion)
}
function onKeydown(e) {
if (e.key.length !== 1 || e.ctrlKey || e.metaKey || e.altKey) return
const patterns = currentPatterns()
let validate
if (typeof pattern === 'string' && registry.has(pattern)) validate = registry.get(pattern).validate
const chars    = extractInputChars(e.target.value, patterns, validate, globalSlots, 'global', globalSlotsVersion)
const maxLimit = Math.max(...patterns.map(p => inputCount(p, globalSlots, 'global', globalSlotsVersion)))
if (chars.length >= maxLimit) e.preventDefault()
}
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
mask.create = function (presets = {}, options = {}) {
const localRegistry = new Map()
const localSlots = { ...globalSlots }
const localCacheId = `local-${++slotLanguageSeq}`
let localSlotsVersion = globalSlotsVersion
const strict = Boolean(options.strict)
for (const [name, def] of Object.entries(presets)) {
assertDefinition(name, def, 'mask.create')
localRegistry.set(name, def)
}
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
function instance(pattern, value) {
if (value == null) return ''
const p = resolveLocalForValue(pattern, value)
const pats = resolvePatternList(p, String(value), localSlots, localCacheId, localSlotsVersion)
const chars = extractInputChars(String(value), pats, resolveLocalEntry(pattern)?.validate, localSlots, localCacheId, localSlotsVersion, strict)
const chosen = selectPattern(pats, chars, localSlots, localCacheId, localSlotsVersion)
const compiled = compile(chosen, localSlots, localCacheId, localSlotsVersion)
return applyTokens(compiled.tokens, chars, compiled.inputCount)
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
return hintFor(pattern, localRegistry, localSlots, localCacheId, localSlotsVersion)
}
instance.format = function (pattern, value) {
return instance(pattern, value)
}
instance.explain = function (pattern) {
return explainFor(pattern, localRegistry, localSlots, localCacheId, localSlotsVersion)
}
instance.transforms = transforms
instance.apply = function (pattern, value) {
return applyEngine(pattern, value, localRegistry, localSlots, localCacheId, localSlotsVersion, strict)
}
instance.field = function (pattern, initialValue = '') {
return createFieldApi(instance, pattern, initialValue)
}
instance.check = function (pattern, value) {
const result = instance.apply(pattern, value)
const resolved = resolveEntryPattern(pattern, value ?? '', localRegistry, localSlots, localCacheId, localSlotsVersion)
const pats = resolvePatternList(resolved.pattern, String(value ?? ''), localSlots, localCacheId, localSlotsVersion)
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
return patternLengthFor(pattern, localRegistry, localSlots, localCacheId, localSlotsVersion)
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
instance.create = mask.create
return instance
}
const maskara = mask
module.exports = mask
module.exports.mask = mask
module.exports.maskara = mask
module.exports.default = mask

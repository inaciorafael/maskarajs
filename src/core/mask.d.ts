/**
 * mask.d.ts
 *
 * Tipagens com parâmetro de registry para autocomplete de nomes registrados.
 *
 * Uso básico (sem generics — funciona, sem autocomplete de nomes):
 *   import maskara from './mask.js'
 *   maskara('cpf', value)
 *
 * Uso tipado (com autocomplete de nomes):
 *   const m = maskara.create<{ cpf: string; date: Date | null; money: number }>({
 *     cpf:   { pattern: '###[.]###[.]###[-]##' },
 *     date:  { pattern: '##[/]##[/]####', transform: ... },
 *     money: { pattern: '########[,]##', transform: ... },
 *   })
 *   m('cpf', value)          // ← autocomplete sugere 'cpf' | 'date' | 'money'
 *   m.raw('date', value)     // ← retorno inferido: Date | null
 *   m.raw('money', value)    // ← retorno inferido: number
 *   m.raw('cpf', value)      // ← retorno inferido: string
 */

// ─── Primitivos ───────────────────────────────────────────────────────────

/** Regra condicional para escolher um pattern a partir do raw digitado */
export interface MaskPatternRule {
  pattern: string | string[]
  when?: (raw: string, value: string) => boolean
}
export type MaskaraPatternRule = MaskPatternRule

/** Mapa de patterns usado por máscaras nomeadas condicionais */
export type MaskPatternMap = Record<string, string | string[]>
export type MaskaraPatternMap = MaskPatternMap

/** Função que escolhe uma chave de patterns a partir do valor digitado */
export type MaskSelect<K extends string = string> = (raw: string, value: string) => K
export type MaskaraSelect<K extends string = string> = MaskSelect<K>

/** String de padrão declarativo, array dinâmico ou array de regras condicionais */
export type MaskPattern = string | string[] | MaskPatternRule[]
export type MaskaraPattern = MaskPattern

/** Função de transformação — recebe (raw, masked, complete) e retorna T */
export type MaskTransform<T> = (raw: string, masked: string, complete: boolean) => T
export type MaskaraTransform<T> = MaskTransform<T>

export interface MaskValidateIndexOptions {
  at: number
}
export type MaskaraValidateIndexOptions = MaskValidateIndexOptions

export interface MaskValidateRangeOptions {
  from: number
  to?: number
}
export type MaskaraValidateRangeOptions = MaskValidateRangeOptions

export interface MaskValidateIsOptions {
  at: number
  value: string | number
}
export type MaskaraValidateIsOptions = MaskValidateIsOptions

export interface MaskValidateOneOfOptions {
  at: number
  values: Array<string | number>
}
export type MaskaraValidateOneOfOptions = MaskValidateOneOfOptions

export interface MaskValidateBetweenOptions extends MaskValidateRangeOptions {
  min: number
  max: number
}
export type MaskaraValidateBetweenOptions = MaskValidateBetweenOptions

export interface MaskValidateValueOptions {
  value: string | number
}
export type MaskaraValidateValueOptions = MaskValidateValueOptions

export type MaskValidateWhenOptions = MaskValidateIndexOptions | MaskValidateRangeOptions
export type MaskaraValidateWhenOptions = MaskValidateWhenOptions

export interface MaskValidateWhenPayload {
  value: string
  raw: string
  char: string
  number: number
  at?: number
  from: number
  to: number
}
export type MaskaraValidateWhenPayload = MaskValidateWhenPayload

/** Utilitários para validar posições do raw incremental */
export interface MaskValidateContext {
  char(options: MaskValidateIndexOptions): string
  char(at: number): string
  has(options: MaskValidateIndexOptions): boolean
  has(at: number): boolean
  slice(options: MaskValidateRangeOptions): string
  toNumber(options: MaskValidateRangeOptions): number
  when(options: MaskValidateWhenOptions, predicate: (value: MaskValidateWhenPayload) => boolean): boolean
  is(options: MaskValidateIsOptions): boolean
  oneOf(options: MaskValidateOneOfOptions): boolean
  between(options: MaskValidateBetweenOptions): boolean
  length(): number
  isEmpty(): boolean
  startsWith(options: MaskValidateValueOptions): boolean
  startsWith(value: string | number): boolean
  endsWith(options: MaskValidateValueOptions): boolean
  endsWith(value: string | number): boolean
}
export type MaskaraValidateContext = MaskValidateContext

/** Payload recomendado para validate com autocomplete por desestruturação */
export interface MaskValidatePayload {
  raw: string
  masked: string
  complete: boolean
  ctx: MaskValidateContext
}
export type MaskaraValidatePayload = MaskValidatePayload

/** Validação incremental — retorna false para recusar o próximo caractere */
export type MaskPayloadValidate = (payload: MaskValidatePayload) => boolean
export type MaskaraPayloadValidate = MaskPayloadValidate

export type MaskValidate = MaskPayloadValidate
export type MaskaraValidate = MaskValidate

/** Predicado usado por um slot customizado */
export type MaskSlotTest = (ch: string) => boolean
export type MaskaraSlotTest = MaskSlotTest

/** Definição completa de um slot customizado */
export interface MaskSlotDefinition {
  test: MaskSlotTest
  hint?: string
}
export type MaskaraSlotDefinition = MaskSlotDefinition

/** Formas aceitas para registrar um slot customizado */
export type MaskSlotInput = MaskSlotTest | RegExp | MaskSlotDefinition
export type MaskaraSlotInput = MaskSlotInput

/** Definição de uma máscara nomeada com pattern único ou array dinâmico */
export interface MaskPatternDefinition<T = string> {
  pattern: MaskPattern
  transform?: MaskTransform<T>
  validate?: MaskValidate
}
export type MaskaraPatternDefinition<T = string> = MaskPatternDefinition<T>

/** Definição de uma máscara nomeada que seleciona um pattern por raw/value */
export interface MaskConditionalDefinition<T = string, K extends string = string> {
  patterns: Record<K, MaskPattern>
  select: MaskSelect<K>
  transform?: MaskTransform<T>
  validate?: MaskValidate
}
export type MaskaraConditionalDefinition<T = string, K extends string = string> = MaskConditionalDefinition<T, K>

/** Definição de uma máscara nomeada */
export type MaskDefinition<T = string> = MaskPatternDefinition<T> | MaskConditionalDefinition<T>
export type MaskaraDefinition<T = string> = MaskDefinition<T>


/** Opções de mask.on */
export interface MaskOnOptions<T> {
  /** Chamado a cada keystroke com o valor limpo / resultado do transform */
  onValue?: (value: T) => void
  /** Chamado a cada keystroke com o valor mascarado (display). Nome preferido. */
  onMaskara?: (masked: string) => void
  /** Chamado a cada keystroke com o valor mascarado (display) */
  onMasked?: (masked: string) => void
}
export type MaskaraOnOptions<T> = MaskOnOptions<T>

/** Resultado rico de apply(), útil para forms, debug e adapters */
export interface MaskApplyResult<T = string> {
  /** Valor mascarado pronto para exibir no input */
  value: string
  /** Alias explícito de value */
  masked: string
  /** Valor limpo ou transformado por transform */
  raw: T
  /** Se o valor preenche completamente a máscara */
  complete: boolean
  /** Placeholder gerado a partir do pattern */
  hint: string
  /** Alias semântico de hint */
  placeholder: string
  /** Quantidade de caracteres de input preenchidos */
  rawLength: number
  /** Comprimento total do valor mascarado completo */
  patternLength: number
}
export type MaskaraApplyResult<T = string> = MaskApplyResult<T>

/** Valor aceito pelos handlers de field(): string direta ou evento de input */
export type MaskFieldInput = string | null | undefined | { target: { value: string } }
export type MaskaraFieldInput = MaskFieldInput

/** Estado mutável e framework-agnostic para um campo mascarado */
export interface MaskField<T = string> extends MaskApplyResult<T> {
  /** Pattern literal ou nome usado por este campo */
  pattern: MaskPattern
  /** Aplica um novo valor e atualiza o estado do field */
  set(value: MaskFieldInput): MaskApplyResult<T>
  /** Alias de set(), conveniente para inputs controlados */
  onChange(value: MaskFieldInput): MaskApplyResult<T>
  /** Alias de set(), conveniente para eventos nativos */
  onInput(value: MaskFieldInput): MaskApplyResult<T>
  /** Limpa ou troca o valor atual */
  reset(value?: string | null | undefined): MaskApplyResult<T>
  /** Props mínimas para plugar em inputs quando fizer sentido */
  readonly inputProps: {
    value: string
    placeholder: string
    onChange: (value: MaskFieldInput) => MaskApplyResult<T>
    onInput: (value: MaskFieldInput) => MaskApplyResult<T>
  }
}
export type MaskaraField<T = string> = MaskField<T>

export type MaskCheckReason = 'complete' | 'empty' | 'invalid' | 'incomplete'
export type MaskaraCheckReason = MaskCheckReason

/** Resultado de check(), útil para feedback de forms e debug */
export interface MaskCheckResult<T = string> extends MaskApplyResult<T> {
  valid: boolean
  reason: MaskCheckReason
  message: string
  expectedLength: number
  missing: number
}
export type MaskaraCheckResult<T = string> = MaskCheckResult<T>

export type MaskExplainTokenType = 'slot' | 'literal' | 'expression'
export type MaskaraExplainTokenType = MaskExplainTokenType

export interface MaskExplainToken {
  type: MaskExplainTokenType
  index: number
  value: string
  hint?: string
  constraint?: string
  length: number
}
export type MaskaraExplainToken = MaskExplainToken

export interface MaskExplainVariant {
  pattern: string
  hint: string
  rawLength: number
  patternLength: number
  tokens: MaskExplainToken[]
}
export type MaskaraExplainVariant = MaskExplainVariant

export interface MaskExplainResult {
  pattern: MaskPattern
  variants: MaskExplainVariant[]
  hint: string
  rawLength: number
  patternLength: number
}
export type MaskaraExplainResult = MaskExplainResult

export interface MaskTransforms {
  number: MaskTransform<number | null>
  cents: MaskTransform<number>
  dateBR: MaskTransform<Date | null>
  parts<T extends Record<string, readonly [number, number]>>(
    schema: T
  ): MaskTransform<{
    raw: string
    masked: string
    complete: boolean
  } & { [K in keyof T]: string }>
}
export type MaskaraTransforms = MaskTransforms

/** Opções de criação de instância */
export interface MaskCreateOptions {
  /**
   * Quando true, o engine para no primeiro caractere inválido.
   * O padrão é false para preservar o comportamento tolerante de paste.
   */
  strict?: boolean
}
export type MaskaraCreateOptions = MaskCreateOptions

// ─── Registry map ─────────────────────────────────────────────────────────
//
// R = Record dos nomes registrados com seus tipos de retorno do transform.
//
// Exemplo:
//   type MyRegistry = {
//     cpf:   string        // sem transform → string
//     date:  Date | null   // transform retorna Date | null
//     money: number        // transform retorna number
//   }
//
// Usado para inferir o tipo de retorno de raw() a partir do nome.

/** Extrai o tipo de retorno de raw() para um nome de máscara */
type RawReturn<R extends object, K extends keyof R | MaskPattern> =
  K extends keyof R ? R[K] : string

/** Union de nomes registrados + MaskPattern (para aceitar padrão literal também) */
type PatternOrName<R extends object> = keyof R | MaskPattern

// ─── MaskInstance ─────────────────────────────────────────────────────────

/**
 * Instância tipada retornada por mask.create<R>(presets).
 *
 * R = mapa de nomes para tipos de retorno do transform.
 * Autocomplete sugere os nomes registrados em todos os métodos.
 */
export interface MaskInstance<R extends object = Record<string, string>> {

  /**
   * Aplica máscara — retorna string formatada para exibição.
   * @param pattern nome registrado (autocomplete) ou padrão literal
   */
  <K extends PatternOrName<R>>(pattern: K, value: string | null | undefined): string

  /**
   * Retorna o raw value passado pelo transform.
   * O tipo de retorno é inferido automaticamente pelo nome registrado.
   *
   * @example
   * m.raw('date', v)   // → Date | null  (inferido do registry)
   * m.raw('money', v)  // → number       (inferido do registry)
   * m.raw('cpf', v)    // → string       (inferido do registry)
   */
  raw<K extends PatternOrName<R>>(
    pattern: K,
    value: string | null | undefined
  ): RawReturn<R, K>

  /**
   * Alias semântico de raw(), útil para deixar claro que o valor está sendo desmascarado.
   */
  unmask<K extends PatternOrName<R>>(
    pattern: K,
    value: string | null | undefined
  ): RawReturn<R, K>

  /**
   * Aplica a máscara e retorna todos os metadados úteis em uma única chamada.
   */
  apply<K extends PatternOrName<R>>(
    pattern: K,
    value: string | null | undefined
  ): MaskApplyResult<RawReturn<R, K>>

  /**
   * Cria um estado simples para campos mascarados.
   */
  field<K extends PatternOrName<R>>(
    pattern: K,
    initialValue?: string | null | undefined
  ): MaskField<RawReturn<R, K>>

  /**
   * Aplica a máscara e explica se o valor está completo, vazio, inválido ou incompleto.
   */
  check<K extends PatternOrName<R>>(
    pattern: K,
    value: string | null | undefined
  ): MaskCheckResult<RawReturn<R, K>>

  /**
   * Verifica se o valor preenche completamente o padrão.
   */
  is<K extends PatternOrName<R>>(pattern: K, value: string | null | undefined): boolean

  /**
   * Retorna o placeholder legível do padrão.
   * @example m.hint('cpf') // → '000.000.000-00'
   */
  hint<K extends PatternOrName<R>>(pattern: K): string

  /**
   * Formata um valor vindo da API para exibição. Alias semântico de apply.
   * @example m.format('cpf', user.cpf) // → '123.456.789-09'
   */
  format<K extends PatternOrName<R>>(pattern: K, value: string | null | undefined): string

  /**
   * Comprimento do raw atual — chars de input preenchidos (sem literais).
   * Nunca passa pelo transform. Útil para progress bars.
   * @example
   * const pct = m.rawLength('cpf', v) / m.patternLength('cpf') * 100
   */
  rawLength<K extends PatternOrName<R>>(pattern: K, value: string | null | undefined): number

  /**
   * Comprimento total do valor mascarado completo.
   * Conta slots como 1 caractere e literais pelo tamanho real.
   * Para arrays, retorna o maior valor mascarado possível.
   */
  patternLength<K extends PatternOrName<R>>(pattern: K): number

  /**
   * Descreve como o engine entende o pattern: variantes, tokens, hint e tamanhos.
   * Útil para playgrounds, documentação e debug visual.
   */
  explain<K extends PatternOrName<R>>(pattern: K): MaskExplainResult

  /** Helpers reutilizáveis para transform em define/create */
  readonly transforms: MaskTransforms

  /**
   * Registra uma nova máscara nesta instância.
   * Não afeta outras instâncias nem o registry global.
   */
  define<N extends string, T = string>(name: N, definition: MaskDefinition<T>): void

  /**
   * Remove uma máscara desta instância.
   */
  undefine<K extends keyof R>(name: K): void

  /**
   * Lista os nomes registrados nesta instância.
   */
  names(): Array<keyof R & string>

  /**
   * Cria ou sobrescreve um símbolo de slot apenas nesta instância.
   * Use [N] quando precisar tratar um símbolo registrado como literal.
   */
  defineSlot(symbol: string, definition: MaskSlotInput): void

  /**
   * Remove um slot desta instância.
   * Slots padrão (#, @, *) voltam ao comportamento original.
   */
  undefineSlot(symbol: string): void

  /** Lista os símbolos de slot disponíveis nesta instância */
  slots(): string[]

  /**
   * Vincula máscara a um input DOM. Retorna cleanup().
   * Framework-agnostic — funciona em React, Vue, Svelte, Vanilla.
   *
   * @example
   * // React
   * useEffect(() => m.on(ref.current, 'date', { onValue: setDate }), [])
   *
   * // Vue
   * onMounted(() => m.on(inputRef.value, 'phone', { onValue: v => emit('update:modelValue', v) }))
   *
   * // Svelte action
   * const maskAction = (node, name) => ({ destroy: m.on(node, name) })
   */
  on<K extends PatternOrName<R>>(
    input: HTMLInputElement,
    pattern: K,
    options?: MaskOnOptions<RawReturn<R, K>>
  ): () => void

  /** Cria uma sub-instância com registry próprio */
  create<S extends object>(
    presets?: { [K in keyof S]: MaskDefinition<S[K]> },
    options?: MaskCreateOptions
  ): MaskInstance<S>
}
export type MaskaraInstance<R extends object = Record<string, string>> = MaskInstance<R>

// ─── Função principal (registry global, sem generics de nome) ─────────────

/**
 * Aplica máscara a um valor.
 *
 * @example
 * mask('###[.]###[.]###[-]##', '12345678909') // → '123.456.789-09'
 * mask(['[(]##[)] ####[-]####', '[(]##[)] #####[-]####'], '11987654321')
 */
export declare function mask(pattern: MaskPattern, value: string | null | undefined): string

export declare namespace mask {

  /** Retorna o raw value / resultado do transform */
  function raw<T = string>(pattern: MaskPattern, value: string | null | undefined): T

  /** Alias semântico de raw() */
  function unmask<T = string>(pattern: MaskPattern, value: string | null | undefined): T

  /** Aplica máscara e retorna valor, raw, complete, hint e métricas em uma chamada */
  function apply<T = string>(
    pattern: MaskPattern,
    value: string | null | undefined
  ): MaskApplyResult<T>

  /** Cria um estado simples para campos mascarados */
  function field<T = string>(
    pattern: MaskPattern,
    initialValue?: string | null | undefined
  ): MaskField<T>

  /** Aplica a máscara e explica o estado do valor */
  function check<T = string>(
    pattern: MaskPattern,
    value: string | null | undefined
  ): MaskCheckResult<T>

  /** Verifica se o valor preenche completamente o padrão */
  function is(pattern: MaskPattern, value: string | null | undefined): boolean

  /** Retorna o placeholder legível do padrão */
  function hint(pattern: MaskPattern): string

  /** Alias semântico de mask() para formatar valores da API */
  function format(pattern: MaskPattern, value: string | null | undefined): string

  /** Chars de input preenchidos — sem literais, sem transform */
  function rawLength(pattern: MaskPattern, value: string | null | undefined): number

  /** Comprimento total do valor mascarado completo */
  function patternLength(pattern: MaskPattern): number

  /** Explica variantes, tokens, hint e tamanhos de um pattern */
  function explain(pattern: MaskPattern): MaskExplainResult

  /** Helpers reutilizáveis para transform em define/create */
  const transforms: MaskTransforms

  /** Registra máscara nomeada no registry global */
  function define<T = string>(name: string, definition: MaskDefinition<T>): void

  /** Remove máscara do registry global */
  function undefine(name: string): void

  /** Lista nomes do registry global */
  function names(): string[]

  /**
   * Cria ou sobrescreve um símbolo de slot no engine global.
   * Use [N] quando precisar tratar um símbolo registrado como literal.
   */
  function defineSlot(symbol: string, definition: MaskSlotInput): void

  /**
   * Remove um slot global.
   * Slots padrão (#, @, *) voltam ao comportamento original.
   */
  function undefineSlot(symbol: string): void

  /** Lista os símbolos de slot disponíveis no engine global */
  function slots(): string[]

  /** Vincula máscara a input DOM — retorna cleanup() */
  function on<T = string>(
    input: HTMLInputElement,
    pattern: MaskPattern,
    options?: MaskOnOptions<T>
  ): () => void

  /**
   * Cria uma instância isolada com registry próprio e tipos inferidos.
   *
   * O generic R mapeia cada nome ao tipo de retorno do seu transform —
   * isso habilita autocomplete de nomes e inferência de tipo em raw().
   *
   * @example
   * const m = mask.create<{
   *   cpf:   string
   *   date:  Date | null
   *   money: number
   * }>({
   *   cpf:   { pattern: '###[.]###[.]###[-]##' },
   *   date:  { pattern: '##[/]##[/]####', transform: (r,_,c) => c ? new Date(...) : null },
   *   money: { pattern: '########[,]##', transform: r => parseInt(r||'0',10)/100 },
   * })
   *
   * m('cpf', v)           // autocomplete: 'cpf' | 'date' | 'money'
   * m.raw('date', v)      // → Date | null  ✓
   * m.raw('money', v)     // → number       ✓
   * m.rawLength('cpf', v) // → number       ✓
   * m.on(el, 'date', {
   *   onValue: date => ...  // date: Date | null ✓ (inferido)
   * })
   */
  function create<R extends object = {}>(
    presets?: { [K in keyof R]: MaskDefinition<R[K]> },
    options?: MaskCreateOptions
  ): MaskInstance<R>
}

/** Preferred alias for the main engine. `mask` remains available for compatibility. */
export declare const maskara: typeof mask

export default mask

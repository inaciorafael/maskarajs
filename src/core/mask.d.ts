/**
 * mask.d.ts
 *
 * Tipagens com parâmetro de registry para autocomplete de nomes registrados.
 *
 * Uso básico (sem generics — funciona, sem autocomplete de nomes):
 *   import mask from './mask.js'
 *   mask('cpf', value)
 *
 * Uso tipado (com autocomplete de nomes):
 *   const m = mask.create<{ cpf: string; date: Date | null; money: number }>({
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

/** String de padrão declarativo ou array para padrões dinâmicos */
export type MaskPattern = string | string[]

/** Função de transformação — recebe (raw, masked, complete) e retorna T */
export type MaskTransform<T> = (raw: string, masked: string, complete: boolean) => T

/** Validação incremental — retorna false para recusar o próximo caractere */
export type MaskValidate = (raw: string, masked: string, complete: boolean) => boolean

/** Predicado usado por um slot customizado */
export type MaskSlotTest = (ch: string) => boolean

/** Definição completa de um slot customizado */
export interface MaskSlotDefinition {
  test: MaskSlotTest
  hint?: string
}

/** Formas aceitas para registrar um slot customizado */
export type MaskSlotInput = MaskSlotTest | RegExp | MaskSlotDefinition

/** Definição de uma máscara nomeada */
export interface MaskDefinition<T = string> {
  pattern: MaskPattern
  transform?: MaskTransform<T>
  validate?: MaskValidate
}

/** Opções de mask.on */
export interface MaskOnOptions<T> {
  /** Chamado a cada keystroke com o valor limpo / resultado do transform */
  onValue?: (value: T) => void
  /** Chamado a cada keystroke com o valor mascarado (display) */
  onMasked?: (masked: string) => void
}

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
type RawReturn<R extends Record<string, unknown>, K extends keyof R | MaskPattern> =
  K extends keyof R ? R[K] : string

/** Union de nomes registrados + MaskPattern (para aceitar padrão literal também) */
type PatternOrName<R extends Record<string, unknown>> = keyof R | MaskPattern

// ─── MaskInstance ─────────────────────────────────────────────────────────

/**
 * Instância tipada retornada por mask.create<R>(presets).
 *
 * R = mapa de nomes para tipos de retorno do transform.
 * Autocomplete sugere os nomes registrados em todos os métodos.
 */
export interface MaskInstance<R extends Record<string, unknown> = Record<string, string>> {

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
  create<S extends Record<string, unknown>>(
    presets?: { [K in keyof S]: MaskDefinition<S[K]> }
  ): MaskInstance<S>
}

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
  function create<R extends Record<string, unknown> = Record<string, string>>(
    presets?: { [K in keyof R]: MaskDefinition<R[K]> }
  ): MaskInstance<R>
}

export default mask

import { useEffect, useMemo, useState } from 'react'
import mask from '../../mask.js'
import { DonationSupport } from './components/DonationSupport'
import { TopNav, type Locale, type Theme } from './components/TopNav'
import './App.css'

type Framework = 'React' | 'Vue' | 'Angular' | 'React Native' | 'Vanilla'
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

type HookExample = {
  framework: string
  title: string
  description: string
  code?: string
  soon?: boolean
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

const snippets: Record<Framework, string> = {
  React: `import { useState } from 'react'
import mask from 'maskarajs'

const cpfPattern = '###[.]###[.]###[-]##'

export function CPFInput() {
  const [masked, setMasked] = useState('')
  const raw = mask.raw(cpfPattern, masked)
  const complete = mask.is(cpfPattern, masked)

  return (
    <label>
      CPF
      <input
        value={masked}
        placeholder={mask.hint(cpfPattern)}
        inputMode="numeric"
        onChange={event => setMasked(mask(cpfPattern, event.target.value))}
      />
      <small>raw: {raw} / complete: {String(complete)}</small>
    </label>
  )
}`,
  Vue: `<script setup lang="ts">
import { computed, ref } from 'vue'
import mask from 'maskarajs'

const pattern = '#####[-]###'
const masked = ref('')
const raw = computed(() => mask.raw(pattern, masked.value))
const complete = computed(() => mask.is(pattern, masked.value))

function update(value: string) {
  masked.value = mask(pattern, value)
}
</script>

<template>
  <input
    :value="masked"
    :placeholder="mask.hint(pattern)"
    inputmode="numeric"
    @input="update(($event.target as HTMLInputElement).value)"
  />
  <small>raw: {{ raw }} / complete: {{ complete }}</small>
</template>`,
  Angular: `import { Component } from '@angular/core'
import mask from 'maskarajs'

@Component({
  selector: 'app-cpf-field',
  template: \`
    <input
      [value]="masked"
      [placeholder]="placeholder"
      inputmode="numeric"
      (input)="onInput($event)"
    />
    <small>raw: {{ raw }} / complete: {{ complete }}</small>
  \`,
})
export class CpfFieldComponent {
  pattern = '###[.]###[.]###[-]##'
  masked = ''

  get raw() {
    return mask.raw(this.pattern, this.masked)
  }

  get complete() {
    return mask.is(this.pattern, this.masked)
  }

  get placeholder() {
    return mask.hint(this.pattern)
  }

  onInput(event: Event) {
    const input = event.target as HTMLInputElement
    this.masked = mask(this.pattern, input.value)
  }
}`,
  'React Native': `import { useState } from 'react'
import { Text, TextInput, View } from 'react-native'
import mask from 'maskarajs'

const phonePattern = ['[(]##[)] ####[-]####', '[(]##[)] #####[-]####']

export function PhoneField() {
  const [masked, setMasked] = useState('')
  const raw = mask.raw(phonePattern, masked)

  return (
    <View>
      <TextInput
        value={masked}
        placeholder={mask.hint(phonePattern)}
        keyboardType="number-pad"
        onChangeText={value => setMasked(mask(phonePattern, value))}
      />
      <Text>raw: {raw}</Text>
    </View>
  )
}`,
  Vanilla: `import mask from 'maskarajs'

const input = document.querySelector<HTMLInputElement>('#phone')!
const output = document.querySelector<HTMLElement>('#raw')!

const off = mask.on(input, [
  '[(]##[)] ####[-]####',
  '[(]##[)] #####[-]####',
], {
  onValue(raw) {
    output.textContent = raw
  },
  onMasked(masked) {
    console.log({ masked })
  },
})`,
}

const codeSnippets = {
  reactHook: `import { useMask } from 'maskarajs/react'

const cpfPattern = '###[.]###[.]###[-]##'

export function CPFInput() {
  const cpf = useMask(cpfPattern)

  return (
    <input
      {...cpf.inputProps({ inputMode: 'numeric' })}
    />
  )
}`,
  validate: `mask.define('month', {
  pattern: '{0-1}#',
  validate: (raw, masked, complete) => {
    if (!complete) return true
    const month = Number(raw)
    return month >= 1 && month <= 12
  },
})

mask('month', '12') // '12'
mask('month', '19') // '1'`,
  define: `mask.define('date', {
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
})`,
  create: `export const maskBR = mask.create({
  cpf:   { pattern: '###[.]###[.]###[-]##' },
  cnpj:  { pattern: '##[.]###[.]###[/]####[-]##' },
  phone: { pattern: ['[(]##[)] ####[-]####', '[(]##[)] #####[-]####'] },
})

export const maskUS = mask.create({
  ssn:   { pattern: '###[-]##[-]####' },
  zip:   { pattern: '#####[-]####' },
})`,
  slots: `mask.defineSlot('N', {
  test: ch => /\\d/.test(ch),
  hint: '0',
})

mask('NNN[-]NN', '12345') // '123-45'

const forge = mask.create()
forge.defineSlot('H', /[0-9a-f]/i)
forge.defineSlot('V', ch => 'AEIOUaeiou'.includes(ch))`,
}

const content = {
  'pt-BR': {
    langName: 'Português',
    switchLabel: 'Idioma',
    themeLabel: 'Tema',
    theme: {
      light: 'Claro',
      dark: 'Escuro',
    },
    pix: {
      support: 'Apoie o projeto',
      button: 'Pague um Monster',
      modalEyebrow: 'Apoie o Maskarajs',
      title: 'Pague um Monster para manter a forja acesa.',
      body: 'Se a lib poupou alguns handlers, validacoes duplicadas ou aquela tarde brigando com mascara de input, considere apoiar. Pequenas doacoes ajudam a reservar tempo para melhorias, docs e exemplos melhores.',
      popular: 'mais escolhido',
      how: 'Como doar',
      howBody: 'Abra o app do banco, escaneie o QR ou copie a chave Pix. Escolha a faixa que fizer sentido para voce.',
      copied: 'Chave copiada',
      copy: 'Copiar chave Pix',
      close: 'Fechar popup de doacao',
      tiers: [
        ['R$ 7', 'Gole simbolico', 'Para quem curtiu a ideia e quer deixar um sinal de apoio.'],
        ['R$ 15', 'Pague um Monster', 'A faixa mais facil de escolher: energia para manter o projeto andando.'],
        ['R$ 30', 'Sprint de energia', 'Para quem usou o Maskarajs em um formulario real e quer fortalecer a lib.'],
        ['R$ 50+', 'Backer frontend', 'Para times e devs que querem ver a ferramenta amadurecer com carinho.'],
      ],
    },
    hero: {
      eyebrow: 'maskarajs · framework-agnostic · zero deps',
      title: 'Mascaras de input que deixam o frontend mais simples.',
      text: 'Maskarajs entrega uma forma pequena e previsivel de formatar, limpar e validar campos sem prender seu projeto a um framework ou a uma pilha de handlers.',
      primary: 'Testar agora',
      secondary: 'Ver performance',
      stats: [
        ['~4kb', 'Pequena o bastante para ficar perto do input.'],
        ['validate', 'Regras reais sem transformar o campo em um labirinto.'],
        ['Typed', 'Presets organizados para projetos que crescem.'],
      ],
    },
    syntax: {
      eyebrow: 'Linguagem do pattern',
      title: 'Declare slots, literais e expressoes com uma sintaxe curta.',
      text: 'Antes do playground, aqui esta o mapa mental do Maskarajs: blocos pequenos, coloridos e faceis de combinar para transformar regra de input em codigo legivel.',
      rows: [
        ['#', 'Numero', 'slot', 'Slot pronto para digitos de 0 a 9.'],
        ['@', 'Letra', 'slot', 'Aceita letras, inclusive acentuadas.'],
        ['*', 'Livre', 'slot', 'Um caractere qualquer quando a regra e aberta.'],
        ['[texto]', 'Literal', 'literal', 'Tudo dentro dos colchetes entra como texto fixo.'],
        ['{expr}', 'Expressao', 'expr', 'Restrinja um caractere com range, conjunto ou regex.'],
        ['N, H...', 'Seu slot', 'custom', 'Crie simbolos para a linguagem do seu time.'],
      ],
    },
    playground: {
      eyebrow: 'Playground',
      title: 'Escolha um exemplo, digite como usuario e veja a implementacao completa.',
      text: 'Os exemplos ficam prontos para uso: voce so troca o valor e acompanha o resultado, o raw, o progresso e o codigo para reproduzir o comportamento.',
      pattern: 'Pattern deste exemplo',
      input: 'Digite como seu usuario digitaria',
      invalid: 'Padrao invalido',
      fixPattern: 'corrija o padrao',
      typeValue: 'Digite um valor',
    },
    lab: {
      eyebrow: 'Laboratorio livre',
      title: 'Agora e sua vez: escreva qualquer pattern e teste sem compromisso.',
      text: 'Use este espaco para validar uma regra do seu produto. Cole um pattern, digite valores reais e veja os blocos mudarem junto com o resultado.',
      pattern: 'Pattern customizado',
      value: 'Valor de teste',
      fix: 'Corrija o pattern',
      invalid: 'Pattern invalido',
    },
    examplesTitle: 'Os campos que aparecem em todo produto, resolvidos com a mesma API.',
    examplesEyebrow: 'Exemplos',
    recipes: {
      eyebrow: 'Receitas interativas',
      title: 'Comece com um pattern. Evolua para uma camada de mascaras do produto.',
      text: 'Valide contexto, transforme raw values e organize presets sem espalhar regras de input por todos os componentes.',
      validateTitle: 'Quando a mascara precisa entender contexto.',
      validateText: '`{0-1}#` limita o formato do mes, mas nao sabe que 19 e invalido. `validate` entra nesse ponto e evita que o estado ruim chegue no seu formulario.',
      test12: 'Testar 12',
      test19: 'Testar 19',
      defineTitle: 'De nome para as mascaras que seu produto usa todo dia.',
      defineText: 'O input fica agradavel para o usuario, e o seu codigo recebe string limpa, number, Date, null ou o tipo que fizer sentido.',
      createTitle: 'Separe presets por contexto sem misturar responsabilidades.',
      createText: 'Um checkout BR, um painel US, uma lib interna: cada instancia carrega suas mascaras e usa a mesma API.',
      named: 'Mascara nomeada',
      value: 'Valor',
      slotsTitle: 'Crie uma linguagem de mascara com a cara do seu time.',
      slotsText: '`N` pode ser numero, `H` pode ser hexadecimal, `V` pode ser vogal. No global isso vale para o app inteiro; em uma instancia, a regra fica isolada para aquele produto, pacote ou formulario.',
      globalSlots: 'slots globais',
      instanceSlots: 'slots instancia',
    },
    why: {
      eyebrow: 'Por que Maskarajs',
      title: 'Porque mascara de input nao deveria virar uma colecao de excecoes no frontend.',
      text: 'A proposta e simples: uma engine pequena, declarativa e flexivel o suficiente para lidar com os casos comuns e com as regras especificas que aparecem quando o produto amadurece.',
      reasons: [
        ['Cabe no seu formulario', 'A API e pequena: formatar, pegar raw, validar, medir e conectar ao input. Sem arquitetura nova para aprender.'],
        ['Nao prende seu stack', 'Funciona em React, Vue, Svelte ou Vanilla porque o core nao depende de componente, hook ou diretiva.'],
        ['Regras reais, nao so caracteres', 'Com validate e transform, a mascara entende contexto e devolve valores prontos para a regra de negocio.'],
        ['Presets sem estado global', 'mask.create permite separar mascaras por pais, produto ou area do app sem misturar responsabilidades.'],
        ['Leve por design', 'Parser cacheado, zero dependencias e uma superficie pequena para manter perto da digitacao.'],
        ['Legivel para o time', 'Patterns curtos, literais explicitos e blocos visuais tornam a regra facil de revisar.'],
      ],
    },
    docs: {
      eyebrow: 'Implementacao pura',
      title: 'Use o core do maskarajs em qualquer stack, sem adaptador obrigatorio.',
      text: 'React, Vue, Angular, React Native e Vanilla podem usar a mesma API: aplique mask() no input, leia raw() para salvar e is() para saber quando esta completo.',
    },
    reactForms: {
      eyebrow: 'React forms',
      title: 'Quando quiser conveniencia no React, use o hook pronto.',
      text: 'O hook fica em maskarajs/react e entrega o que um input controlado precisa: value, onChange, raw, complete e inputProps.',
      soon: 'Em breve',
      cards: [
        ['useMask', 'O caminho curto para inputs React controlados, mantendo masked na tela e raw disponivel no retorno.'],
        ['useMaskDirective', 'Diretiva pensada para Vue 3, para aplicar mascara sem repetir handler em cada input.'],
        ['maskarajsDirective', 'Diretiva Angular para conectar maskarajs ao template mantendo raw e complete acessiveis.'],
        ['useNativeMask', 'Hook para React Native com a mesma ideia do core: valor mascarado na tela e raw pronto para salvar.'],
      ],
    },
    install: {
      eyebrow: 'Instalacao',
      title: 'Comece com um comando e ja teste no seu input.',
      text: 'Escolha seu gerenciador, copie o comando e leve o maskarajs para o formulario que mais precisa ficar simples.',
      copied: 'Copiado',
      copy: 'Copiar comando',
    },
    benchmark: {
      eyebrow: 'Performance',
      title: 'Leve o bastante para rodar perto do input.',
      text: 'Estes numeros foram medidos no Node dentro do WSL com 200.000 iteracoes por caso. Eles nao prometem milagre, mas mostram a ideia: a mascara pode ficar no caminho critico da digitacao sem virar peso para a interface.',
      rows: [
        ['CPF format', '39,705 ops/s', 'Formatacao comum com literais'],
        ['Phone dynamic', '32,455 ops/s', 'Escolha automatica entre patterns'],
        ['Date validate', '64,572 ops/s', 'Regra contextual em mascara nomeada'],
        ['Raw extraction', '44,729 ops/s', 'Valor limpo a partir do display'],
      ],
    },
    api: {
      eyebrow: 'API na pratica',
      title: 'Uma API pequena para cobrir o ciclo inteiro do campo.',
      text: 'Formatar, limpar, validar, medir progresso e separar presets. O Maskarajs resolve essas etapas sem obrigar voce a trocar de framework.',
      flow: [
        ['1. Voce descreve', 'Slots, literais e expressoes em poucas letras.'],
        ['2. O usuario digita', 'Digitacao, paste e edicao no mesmo campo.'],
        ['3. A engine trabalha', 'Filtra, valida, aplica literais e transforma.'],
        ['4. Seu app recebe', 'masked, raw, complete, hint e progresso.'],
      ],
    },
    final: {
      eyebrow: 'Pronto para experimentar',
      title: 'Leve para o seu formulario e remova uma classe inteira de bugs chatos de input.',
    },
  },
  en: {
    langName: 'English',
    switchLabel: 'Language',
    themeLabel: 'Theme',
    theme: {
      light: 'Light',
      dark: 'Dark',
    },
    pix: {
      support: 'Support the project',
      button: 'Buy me a Monster',
      modalEyebrow: 'Support Maskarajs',
      title: 'Buy me a Monster and keep the forge warm.',
      body: 'If this library saved you a few handlers, duplicated validations, or an afternoon fighting input masks, consider supporting it. Small donations help reserve time for improvements, docs, and better examples.',
      popular: 'most picked',
      how: 'How to donate',
      howBody: 'Open your banking app, scan the QR code, or copy the Pix key. Choose the tier that feels right to you.',
      copied: 'Pix key copied',
      copy: 'Copy Pix key',
      close: 'Close donation popup',
      tiers: [
        ['R$ 7', 'Small sip', 'For anyone who liked the idea and wants to leave a small sign of support.'],
        ['R$ 15', 'Buy a Monster', 'The easiest tier to pick: a little energy to keep the project moving.'],
        ['R$ 30', 'Energy sprint', 'For anyone who used Maskarajs in a real form and wants to strengthen the library.'],
        ['R$ 50+', 'Frontend backer', 'For teams and devs who want to see the tool mature with care.'],
      ],
    },
    hero: {
      eyebrow: 'maskarajs · framework-agnostic · zero deps',
      title: 'Input masks that make frontend code simpler.',
      text: 'Maskarajs gives you a small, predictable way to format, clean, and validate fields without tying your project to a framework or a stack of handlers.',
      primary: 'Try it now',
      secondary: 'See performance',
      stats: [
        ['~4kb', 'Small enough to live close to the input.'],
        ['validate', 'Real rules without turning the field into a maze.'],
        ['Typed', 'Organized presets for projects that grow.'],
      ],
    },
    syntax: {
      eyebrow: 'Pattern language',
      title: 'Declare slots, literals, and expressions with a compact syntax.',
      text: 'Before the playground, here is the mental model: small colored blocks that are easy to combine and easy to review.',
      rows: [
        ['#', 'Number', 'slot', 'Built-in slot for digits from 0 to 9.'],
        ['@', 'Letter', 'slot', 'Accepts letters, including accented letters.'],
        ['*', 'Open', 'slot', 'Any single character when the rule is loose.'],
        ['[text]', 'Literal', 'literal', 'Everything inside brackets becomes fixed text.'],
        ['{expr}', 'Expression', 'expr', 'Restrict one character with a range, set, or regex.'],
        ['N, H...', 'Your slot', 'custom', 'Create symbols for your team pattern language.'],
      ],
    },
    playground: {
      eyebrow: 'Playground',
      title: 'Pick an example, type like a user, and see the full implementation.',
      text: 'Examples are ready to use: change the value and watch the result, raw value, progress, and code needed to reproduce the behavior.',
      pattern: 'Pattern for this example',
      input: 'Type as your user would',
      invalid: 'Invalid pattern',
      fixPattern: 'fix the pattern',
      typeValue: 'Type a value',
    },
    lab: {
      eyebrow: 'Free lab',
      title: 'Your turn: write any pattern and test freely.',
      text: 'Use this space to validate a product rule. Paste a pattern, type real values, and watch the blocks update with the result.',
      pattern: 'Custom pattern',
      value: 'Test value',
      fix: 'Fix the pattern',
      invalid: 'Invalid pattern',
    },
    examplesTitle: 'Fields every product has, solved with the same API.',
    examplesEyebrow: 'Examples',
    recipes: {
      eyebrow: 'Interactive recipes',
      title: 'Start with a pattern. Grow into a product-level mask layer.',
      text: 'Validate context, transform raw values, and organize presets without spreading input rules across components.',
      validateTitle: 'When the mask needs context.',
      validateText: '`{0-1}#` limits the month format, but it does not know that 19 is invalid. `validate` closes that gap before bad state reaches your form.',
      test12: 'Try 12',
      test19: 'Try 19',
      defineTitle: 'Name the masks your product uses every day.',
      defineText: 'The input feels good for the user, and your code receives a clean string, number, Date, null, or whatever type makes sense.',
      createTitle: 'Split presets by context without mixing responsibilities.',
      createText: 'A Brazilian checkout, a US dashboard, an internal package: each instance carries its masks and keeps the same API.',
      named: 'Named mask',
      value: 'Value',
      slotsTitle: 'Create a mask language that fits your team.',
      slotsText: '`N` can mean number, `H` can mean hexadecimal, `V` can mean vowel. Globally it affects the whole app; in an instance, it stays isolated to that product, package, or form.',
      globalSlots: 'global slots',
      instanceSlots: 'instance slots',
    },
    why: {
      eyebrow: 'Why Maskarajs',
      title: 'Because input masks should not become a collection of frontend exceptions.',
      text: 'The idea is simple: a small, declarative engine flexible enough for common cases and the specific rules that show up as a product matures.',
      reasons: [
        ['Fits your form', 'A small API: format, get raw, validate, measure, and bind to the input. No new architecture to learn.'],
        ['Does not lock your stack', 'Works with React, Vue, Svelte, or Vanilla because the core does not depend on a component, hook, or directive.'],
        ['Real rules, not only characters', 'With validate and transform, the mask understands context and returns values ready for business rules.'],
        ['Presets without global state', 'mask.create separates masks by country, product, or app area without mixing responsibilities.'],
        ['Light by design', 'Cached parser, zero dependencies, and a small surface area for input-level work.'],
        ['Readable for the team', 'Short patterns, explicit literals, and visual blocks make rules easy to review.'],
      ],
    },
    docs: {
      eyebrow: 'Pure implementation',
      title: 'Use the maskarajs core in any stack, with no required adapter.',
      text: 'React, Vue, Angular, React Native, and Vanilla can use the same API: apply mask() in the input, read raw() for storage, and is() for completion.',
    },
    reactForms: {
      eyebrow: 'React forms',
      title: 'When you want React convenience, use the ready hook.',
      text: 'The hook lives in maskarajs/react and gives a controlled input what it needs: value, onChange, raw, complete, and inputProps.',
      soon: 'Coming soon',
      cards: [
        ['useMask', 'The shortest path for controlled React inputs, keeping masked on screen and raw in the returned object.'],
        ['useMaskDirective', 'A Vue 3 directive designed to apply masks without repeating handlers on every input.'],
        ['maskarajsDirective', 'An Angular directive to connect maskarajs to templates while keeping raw and complete available.'],
        ['useNativeMask', 'A React Native hook with the same core idea: masked value on screen and raw ready to save.'],
      ],
    },
    install: {
      eyebrow: 'Install',
      title: 'Start with one command and try it in your input.',
      text: 'Pick your package manager, copy the command, and bring maskarajs into the form that needs to stay simple.',
      copied: 'Copied',
      copy: 'Copy command',
    },
    benchmark: {
      eyebrow: 'Performance',
      title: 'Light enough to run near the input.',
      text: 'These numbers were measured in Node inside WSL with 200,000 iterations per case. They are not magic promises, but they show the intent: masking can stay on the typing path without weighing down the UI.',
      rows: [
        ['CPF format', '39,705 ops/s', 'Common formatting with literals'],
        ['Phone dynamic', '32,455 ops/s', 'Automatic choice between patterns'],
        ['Date validate', '64,572 ops/s', 'Contextual rule in a named mask'],
        ['Raw extraction', '44,729 ops/s', 'Clean value from the display value'],
      ],
    },
    api: {
      eyebrow: 'API in practice',
      title: 'A small API for the full field lifecycle.',
      text: 'Format, clean, validate, measure progress, and split presets. Maskarajs covers those steps without forcing you to change framework.',
      flow: [
        ['1. You describe', 'Slots, literals, and expressions in a few characters.'],
        ['2. The user types', 'Typing, paste, and editing in the same field.'],
        ['3. The engine works', 'Filters, validates, applies literals, and transforms.'],
        ['4. Your app receives', 'masked, raw, complete, hint, and progress.'],
      ],
    },
    final: {
      eyebrow: 'Ready to try',
      title: 'Bring it into your form and remove a whole class of annoying input bugs.',
    },
  },
} as const

function buildPresets(locale: Locale): Preset[] {
  const pt = locale === 'pt-BR'
  return [
    {
      name: 'CPF',
      pattern: '###[.]###[.]###[-]##',
      value: '12345678909',
      description: pt ? 'O usuario ve CPF formatado; seu app recebe o valor limpo.' : 'The user sees a formatted CPF; your app receives the clean value.',
      implementation: `import mask from 'maskarajs'

const pattern = '###[.]###[.]###[-]##'
const value = '12345678909'

const masked = mask(pattern, value)
const raw = mask.raw(pattern, masked)
const complete = mask.is(pattern, masked)`,
    },
    {
      name: pt ? 'Telefone BR' : 'Brazilian phone',
      pattern: ['[(]##[)] ####[-]####', '[(]##[)] #####[-]####'],
      value: '11987654321',
      description: pt ? 'Um unico campo cobre telefone fixo e celular sem gambiarras.' : 'One field covers landline and mobile numbers without hacks.',
      implementation: `import mask from 'maskarajs'

const phone = [
  '[(]##[)] ####[-]####',
  '[(]##[)] #####[-]####',
]

mask(phone, '11987654321')
mask.raw(phone, '(11) 98765-4321')`,
    },
    {
      name: pt ? 'Mes validado' : 'Validated month',
      pattern: 'month',
      value: '12',
      description: pt ? 'Quando o pattern sozinho nao basta, validate fecha a regra.' : 'When the pattern alone is not enough, validate closes the rule.',
      implementation: codeSnippets.validate,
    },
    {
      name: 'Slot N custom',
      pattern: 'NNN[-]NN',
      value: '12345',
      description: pt ? 'Crie uma linguagem de pattern que combina com o seu time.' : 'Create a pattern language that matches your team.',
      implementation: codeSnippets.slots,
    },
    {
      name: pt ? 'Data strict' : 'Strict date',
      pattern: 'dateStrict',
      value: '01122025',
      description: pt ? 'Data com mes real, sem aceitar 19/99 no meio do fluxo.' : 'Date with a real month, without accepting 19/99 in the flow.',
      implementation: codeSnippets.define,
    },
    {
      name: 'Visa',
      pattern: '{4}### #### #### ####',
      value: '4111111111111111',
      description: pt ? 'Restrinja a entrada antes de ela virar estado invalido.' : 'Restrict input before it becomes invalid state.',
      implementation: `import mask from 'maskarajs'

const visa = '{4}### #### #### ####'

mask(visa, '4111111111111111')
// '4111 1111 1111 1111'

mask(visa, '5111111111111111')
// ''`,
    },
    {
      name: 'Hex',
      pattern: '{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}',
      value: '1a2b3c',
      description: pt ? 'Regras finas por caractere sem escrever um parser novo.' : 'Fine character rules without writing a new parser.',
      implementation: `import mask from 'maskarajs'

const hex = '{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}'

mask(hex, '1z2b3c')
// '12b3c'`,
    },
  ]
}

function buildExamples(locale: Locale): Example[] {
  const pt = locale === 'pt-BR'
  return [
    { title: pt ? 'Documento' : 'Document', pattern: '###[.]###[.]###[-]##', value: '12345678909', description: pt ? 'Visual bonito no input, payload limpo para a API.' : 'Nice display in the input, clean payload for the API.' },
    { title: pt ? 'Data com validate' : 'Date with validate', pattern: 'dateStrict', value: '01192025', description: pt ? 'O campo simplesmente nao deixa o erro seguir adiante.' : 'The field simply does not let the error move forward.' },
    { title: pt ? 'Dinheiro' : 'Money', pattern: 'money', value: '129990', description: pt ? 'A mascara cuida da tela; o transform entrega o tipo certo.' : 'The mask handles the UI; transform returns the right type.' },
    { title: 'Regex slot', pattern: '{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}', value: '1z2b3c', description: pt ? 'Paste sujo entra, valor coerente sai.' : 'Dirty paste goes in, coherent value comes out.' },
    { title: pt ? 'Slot do time' : 'Team slot', pattern: 'NNN[-]NN', value: '12345', description: pt ? 'Quando N significa numero no seu design system.' : 'When N means number in your design system.' },
  ]
}

function buildApiRows(locale: Locale) {
  const pt = locale === 'pt-BR'
  return [
    ['Format', 'mask(pattern, value)', pt ? 'A funcao que voce chama no render, no paste ou antes de mostrar dados vindos da API.' : 'The function you call on render, paste, or before showing API data.', `mask('###[.]###[.]###[-]##', '12345678909')\n// '123.456.789-09'`, 'format'],
    ['Raw', 'mask.raw(pattern, value)', pt ? 'Pegue o que importa para salvar: sem pontos, barras ou ruido visual.' : 'Get what matters for storage: no dots, slashes, or visual noise.', `mask.raw('cpf', '123.456.789-09')\n// '12345678909'`, 'raw'],
    ['Guard', 'validate(raw, masked, complete)', pt ? 'Para regras que regex de slot nao resolve sozinha, como mes valido e ranges contextuais.' : 'For rules a slot regex cannot solve alone, such as valid months and contextual ranges.', `mask.define('month', {\n  pattern: '{0-1}#',\n  validate: (raw, _, complete) => !complete || Number(raw) <= 12,\n})`, 'guard'],
    ['Ready', 'mask.is(pattern, value)', pt ? 'Uma checagem direta para liberar submit ou manter o fluxo em progresso.' : 'A direct check to enable submit or keep the flow in progress.', `mask.is('##[/]##[/]####', '01/01/2025')\n// true`, 'ready'],
    ['Measure', 'mask.patternLength(pattern)', pt ? 'Mede o formato final, incluindo literais. Perfeito para feedback visual.' : 'Measures the final format, including literals. Great for visual progress.', `mask.patternLength('##[/]##[/]####')\n// 10`, 'measure'],
    ['Registry', 'mask.create(presets)', pt ? 'Organize presets por pais, produto ou dominio sem espalhar estado global.' : 'Organize presets by country, product, or domain without spreading global state.', `const maskBR = mask.create({\n  cpf: { pattern: '###[.]###[.]###[-]##' },\n})`, 'registry'],
    ['Language', 'mask.defineSlot(symbol, definition)', pt ? 'Ensine a engine a falar a linguagem do seu time: N, H, V ou qualquer regra curta.' : 'Teach the engine your team language: N, H, V, or any short rule.', `mask.defineSlot('N', { test: ch => /\\d/.test(ch), hint: '0' })\nmask('NNN[-]NN', '12345')\n// '123-45'`, 'language'],
  ] as const
}

function buildHookExamples(locale: Locale): HookExample[] {
  const t = content[locale].reactForms
  return [
    {
      framework: 'React',
      title: t.cards[0][0],
      description: t.cards[0][1],
      code: codeSnippets.reactHook,
    },
    {
      framework: 'Vue 3',
      title: t.cards[1][0],
      description: t.cards[1][1],
      soon: true,
    },
    {
      framework: 'Angular',
      title: t.cards[2][0],
      description: t.cards[2][1],
      soon: true,
    },
    {
      framework: 'React Native',
      title: t.cards[3][0],
      description: t.cards[3][1],
      soon: true,
    },
  ]
}

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
  const tokenPattern = /(\/\/.*|\/\*[\s\S]*?\*\/|`(?:\\.|[^`])*`|'(?:\\.|[^'])*'|"(?:\\.|[^"])*"|<\/?[A-Z][A-Za-z0-9.]*\b|<\/?[a-z][A-Za-z0-9-]*\b|\b(?:import|from|export|const|let|return|if|else|true|false|null|undefined|new|function|type|interface|class|get|as|extends|public|private|readonly)\b|\b(?:mask|raw|define|defineSlot|create|is|hint|patternLength|rawLength|validate|transform|on|Number|Date|String|console|log|useState|useMemo|useEffect|useForm|useMask|inputProps|computed|ref|z|yup|Component|TextInput|View|Text)\b|\b\d+(?:\.\d+)?\b)/g
  const nodes = []
  let lastIndex = 0

  for (const match of code.matchAll(tokenPattern)) {
    const token = match[0]
    const index = match.index ?? 0
    if (index > lastIndex) nodes.push(<span key={`plain-${index}`}>{code.slice(lastIndex, index)}</span>)

    const className = (() => {
      if (token.startsWith('//') || token.startsWith('/*')) return 'code-comment'
      if (token.startsWith("'") || token.startsWith('"') || token.startsWith('`')) return 'code-string'
      if (token.startsWith('<')) return 'code-tag'
      if (/^\d/.test(token)) return 'code-number'
      if (/^(import|from|export|const|let|return|if|else|true|false|null|undefined|new|function|type|interface|class|get|as|extends|public|private|readonly)$/.test(token)) return 'code-keyword'
      return 'code-function'
    })()

    nodes.push(<span className={className} key={`${className}-${index}`}>{token}</span>)
    lastIndex = index + token.length
  }

  if (lastIndex < code.length) nodes.push(<span key="tail">{code.slice(lastIndex)}</span>)
  return nodes
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
      blocks.push({ kind: 'literal', value: close === -1 ? pattern.slice(i) : pattern.slice(i, close + 1) })
      i = close === -1 ? pattern.length : close + 1
      continue
    }
    if (ch === '{') {
      const close = pattern.indexOf('}', i)
      blocks.push({ kind: 'expr', value: close === -1 ? pattern.slice(i) : pattern.slice(i, close + 1) })
      i = close === -1 ? pattern.length : close + 1
      continue
    }
    blocks.push({ kind: mask.slots().includes(ch) ? 'slot' : 'literal', value: ch })
    i += 1
  }
  return blocks
}

function visualPatterns(patternText: string, locale: Locale) {
  const trimmed = patternText.trim()
  if (trimmed in namedPatterns) {
    return [
      { label: `name: ${trimmed}`, blocks: [{ kind: 'name' as const, value: trimmed }] },
      { label: locale === 'pt-BR' ? 'pattern registrado' : 'registered pattern', blocks: tokenizePattern(printPattern(namedPatterns[trimmed])) },
    ]
  }
  try {
    const parsed = parsePattern(trimmed)
    if (Array.isArray(parsed)) {
      return parsed.map((pattern, index) => ({ label: `pattern ${index + 1}`, blocks: tokenizePattern(pattern) }))
    }
  } catch {
    return [{ label: 'pattern', blocks: [{ kind: 'pattern' as const, value: locale === 'pt-BR' ? 'array JSON invalido' : 'invalid JSON array' }] }]
  }
  return [{ label: 'pattern', blocks: tokenizePattern(trimmed) }]
}

function PatternVisualizer({ patternText, locale }: { patternText: string; locale: Locale }) {
  const groups = useMemo(() => visualPatterns(patternText, locale), [locale, patternText])
  const title = locale === 'pt-BR' ? 'Mapa do pattern' : 'Pattern map'
  return (
    <div className="pattern-visualizer" aria-label={title}>
      <div className="visualizer-head">
        <strong>{title}</strong>
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
              {group.blocks.map((block, index) => <span className={`pattern-block ${block.kind}`} key={`${block.value}-${index}`}>{block.value || 'empty'}</span>)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function SectionHeading({ eyebrow, title, text, compact = false }: { eyebrow: string; title: string; text?: string; compact?: boolean }) {
  return (
    <div className={`section-heading${compact ? ' compact' : ''}`}>
      <span>{eyebrow}</span>
      <h2>{title}</h2>
      {text ? <p>{text}</p> : null}
    </div>
  )
}

function InstallCommands({ locale }: { locale: Locale }) {
  const t = content[locale].install
  const [copied, setCopied] = useState('')
  const commands = [
    ['npm', 'npm install maskarajs'],
    ['yarn', 'yarn add maskarajs'],
    ['pnpm', 'pnpm add maskarajs'],
  ] as const

  async function copyCommand(command: string) {
    await navigator.clipboard.writeText(command)
    setCopied(command)
    window.setTimeout(() => setCopied(''), 1400)
  }

  return (
    <div className="install-card" aria-label={t.eyebrow}>
      <div>
        <span>{t.eyebrow}</span>
        <strong>{t.title}</strong>
        <p>{t.text}</p>
      </div>
      <div className="install-commands">
        {commands.map(([manager, command]) => (
          <button type="button" key={manager} onClick={() => copyCommand(command)} aria-label={`${t.copy}: ${command}`}>
            <span>{manager}</span>
            <code>{command}</code>
            <small>{copied === command ? t.copied : t.copy}</small>
          </button>
        ))}
      </div>
    </div>
  )
}

function Playground({ locale, presets }: { locale: Locale; presets: Preset[] }) {
  const t = content[locale].playground
  const [activePreset, setActivePreset] = useState(0)
  const [inputValue, setInputValue] = useState(mask(presets[0].pattern, presets[0].value))
  const preset = presets[activePreset]
  const patternText = printPattern(preset.pattern)
  const result = useMemo(() => {
    try {
      const masked = mask(preset.pattern, inputValue)
      const raw = mask.raw(preset.pattern, inputValue)
      return {
        ok: true as const,
        masked,
        raw,
        complete: mask.is(preset.pattern, inputValue),
        hint: mask.hint(preset.pattern),
        filled: mask.rawLength(preset.pattern, inputValue),
        total: mask.patternLength(preset.pattern),
      }
    } catch (error) {
      return { ok: false as const, message: error instanceof Error ? error.message : t.invalid }
    }
  }, [inputValue, preset.pattern, t.invalid])
  const progress = result.ok && result.total > 0 ? Math.min(100, (result.masked.length / result.total) * 100) : 0

  function selectPreset(index: number) {
    setActivePreset(index)
    setInputValue(mask(presets[index].pattern, presets[index].value))
  }

  return (
    <section className="playground-shell" id="playground">
      <SectionHeading eyebrow={t.eyebrow} title={t.title} text={t.text} />
      <div className="playground-panel">
        <div className="controls">
          <div className="preset-list" aria-label="Presets">
            {presets.map((item, index) => (
              <button key={item.name} type="button" className="preset" aria-pressed={activePreset === index} onClick={() => selectPreset(index)}>
                <strong>{item.name}</strong>
                <span>{item.description}</span>
              </button>
            ))}
          </div>
          <div className="locked-pattern">
            <span>{t.pattern}</span>
            <code>{patternText}</code>
          </div>
          <label className="field featured-input">
            <span>{t.input}</span>
            <input value={inputValue} placeholder={result.ok ? result.hint : t.typeValue} onChange={(event) => setInputValue(mask(preset.pattern, event.target.value))} />
          </label>
        </div>
        <div className="results">
          <PatternVisualizer patternText={patternText} locale={locale} />
          <div className="meter" aria-label="progress"><span style={{ width: `${progress}%` }} /></div>
          {result.ok ? <ResultGrid result={result} /> : <ErrorBox title={t.invalid} message={result.message} />}
          <CodeBlock className="live-code" code={preset.implementation} />
          <CodeBlock className="live-code" code={`mask(${JSON.stringify(patternText)}, '${inputValue}')\n// ${result.ok ? result.masked || '""' : t.fixPattern}\n\nmask.raw(pattern, value)\n// ${result.ok ? stringify(result.raw) || '""' : '-'}`} />
        </div>
      </div>
    </section>
  )
}

function ResultGrid({ result }: { result: { masked?: string; raw?: unknown; complete?: boolean; hint?: string; filled?: number; total?: number } }) {
  return (
    <div className="result-grid">
      {[
        ['masked', result.masked || '""'],
        ['raw', stringify(result.raw) || '""'],
        ['hint', result.hint || '""'],
        ['complete', String(result.complete)],
        ['pattern length', result.total],
        ['raw length', result.filled],
      ].map(([label, value]) => (
        <output key={label}>
          <span>{label}</span>
          <code>{value}</code>
        </output>
      ))}
    </div>
  )
}

function ErrorBox({ title, message }: { title: string; message: string }) {
  return <div className="error-box"><strong>{title}</strong><code>{message}</code></div>
}

function CustomLab({ locale }: { locale: Locale }) {
  const t = content[locale].lab
  const [patternText, setPatternText] = useState('###[.]###[.]###[-]##')
  const [inputValue, setInputValue] = useState('')
  const result = useMemo(() => {
    try {
      const pattern = parsePattern(patternText)
      return {
        ok: true as const,
        masked: mask(pattern, inputValue),
        raw: mask.raw(pattern, inputValue),
        complete: mask.is(pattern, inputValue),
        hint: mask.hint(pattern),
        total: mask.patternLength(pattern),
      }
    } catch (error) {
      return { ok: false as const, message: error instanceof Error ? error.message : t.invalid }
    }
  }, [inputValue, patternText, t.invalid])
  return (
    <section className="custom-lab-section">
      <SectionHeading eyebrow={t.eyebrow} title={t.title} text={t.text} />
      <div className="custom-lab">
        <div className="custom-editor">
          <label className="field"><span>{t.pattern}</span><textarea value={patternText} spellCheck={false} onChange={(event) => setPatternText(event.target.value)} /></label>
          <label className="field featured-input"><span>{t.value}</span><input value={inputValue} placeholder={result.ok ? result.hint : t.fix} onChange={(event) => {
            try { setInputValue(mask(parsePattern(patternText), event.target.value)) } catch { setInputValue(event.target.value) }
          }} /></label>
        </div>
        <div className="custom-preview">
          <PatternVisualizer patternText={patternText} locale={locale} />
          {result.ok ? <ResultGrid result={result} /> : <ErrorBox title={t.invalid} message={result.message} />}
        </div>
      </div>
    </section>
  )
}

function ExampleGallery({ locale, examples }: { locale: Locale; examples: Example[] }) {
  const t = content[locale]
  return (
    <section className="examples-section">
      <SectionHeading compact eyebrow={t.examplesEyebrow} title={t.examplesTitle} />
      <div className="example-grid">
        {examples.map((example) => {
          const masked = mask(example.pattern, example.value)
          const raw = mask.raw(example.pattern, masked)
          return (
            <article className="example-card" key={example.title}>
              <h3>{example.title}</h3>
              <p>{example.description}</p>
              <code>{printPattern(example.pattern)}</code>
              <div><span>input</span><strong>{example.value}</strong></div>
              <div><span>masked</span><strong>{masked || '""'}</strong></div>
              <div><span>raw</span><strong>{stringify(raw) || '""'}</strong></div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

function ValidateDemo({ locale }: { locale: Locale }) {
  const t = content[locale].recipes
  const [monthValue, setMonthValue] = useState(mask('month', '12'))
  const [dateValue, setDateValue] = useState(mask('dateStrict', '01122025'))
  return (
    <article className="recipe-card validate-card">
      <RecipeCopy eyebrow="validate()" title={t.validateTitle} text={t.validateText} />
      <div className="recipe-play">
        <div className="segmented month-actions">
          <button type="button" onClick={() => setMonthValue(mask('month', '12'))}>{t.test12}</button>
          <button type="button" onClick={() => setMonthValue(mask('month', '19'))}>{t.test19}</button>
        </div>
        <label className="field"><span>month</span><input value={monthValue} placeholder={mask.hint('month')} onChange={(event) => setMonthValue(mask('month', event.target.value))} /></label>
        <label className="field"><span>dateStrict</span><input value={dateValue} placeholder={mask.hint('dateStrict')} onChange={(event) => setDateValue(mask('dateStrict', event.target.value))} /></label>
        <MiniResults rows={[['month raw', stringify(mask.raw('month', monthValue)) || '""'], ['date raw', stringify(mask.raw('dateStrict', dateValue))]]} />
      </div>
      <CodeBlock code={codeSnippets.validate} />
    </article>
  )
}

function DefineDemo({ locale }: { locale: Locale }) {
  const t = content[locale].recipes
  const [dateValue, setDateValue] = useState(mask('date', '01012025'))
  const [moneyValue, setMoneyValue] = useState(mask('money', '129990'))
  return (
    <article className="recipe-card">
      <RecipeCopy eyebrow="mask.define()" title={t.defineTitle} text={t.defineText} />
      <div className="recipe-play">
        <label className="field"><span>date</span><input value={dateValue} placeholder={mask.hint('date')} onChange={(event) => setDateValue(mask('date', event.target.value))} /></label>
        <label className="field"><span>money</span><input value={moneyValue} placeholder={mask.hint('money')} onChange={(event) => setMoneyValue(mask('money', event.target.value))} /></label>
        <MiniResults rows={[['raw date', stringify(mask.raw('date', dateValue))], ['raw money', stringify(mask.raw('money', moneyValue))]]} />
      </div>
      <CodeBlock code={codeSnippets.define} />
    </article>
  )
}

function CreateDemo({ locale }: { locale: Locale }) {
  const t = content[locale].recipes
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
  return (
    <article className="recipe-card">
      <RecipeCopy eyebrow="mask.create()" title={t.createTitle} text={t.createText} />
      <div className="recipe-play">
        <div className="segmented">{(['BR', 'US'] as RegistryName[]).map((item) => <button key={item} type="button" aria-pressed={registry === item} onClick={() => changeRegistry(item)}>{item}</button>)}</div>
        <label className="field"><span>{t.named}</span><select value={name} onChange={(event) => { setName(event.target.value); setValue(currentMask(event.target.value, '')) }}>{names.map((maskName) => <option key={maskName} value={maskName}>{maskName}</option>)}</select></label>
        <label className="field"><span>{t.value}</span><input value={maskedValue} placeholder={currentMask.hint(name)} onChange={(event) => setValue(currentMask(name, event.target.value))} /></label>
        <MiniResults rows={[['masked', maskedValue || '""'], ['raw', stringify(rawValue) || '""']]} />
      </div>
      <CodeBlock code={codeSnippets.create} />
    </article>
  )
}

function CustomSlotsDemo({ locale }: { locale: Locale }) {
  const t = content[locale].recipes
  const [globalValue, setGlobalValue] = useState(mask('NNN[-]NN', '12345'))
  const [hexValue, setHexValue] = useState(teamMask('HHHHHH', '1a2b3c'))
  const [vowelValue, setVowelValue] = useState(teamMask('VVV', 'maskarajs'))
  return (
    <article className="recipe-card slots-card">
      <RecipeCopy eyebrow="defineSlot()" title={t.slotsTitle} text={t.slotsText} />
      <div className="recipe-play">
        <label className="field"><span>{locale === 'pt-BR' ? 'Global' : 'Global'}: NNN[-]NN</span><input value={globalValue} placeholder={mask.hint('NNN[-]NN')} onChange={(event) => setGlobalValue(mask('NNN[-]NN', event.target.value))} /></label>
        <label className="field"><span>{locale === 'pt-BR' ? 'Instancia' : 'Instance'}: HHHHHH</span><input value={hexValue} placeholder={teamMask.hint('HHHHHH')} onChange={(event) => setHexValue(teamMask('HHHHHH', event.target.value))} /></label>
        <label className="field"><span>{locale === 'pt-BR' ? 'Instancia' : 'Instance'}: VVV</span><input value={vowelValue} placeholder={teamMask.hint('VVV')} onChange={(event) => setVowelValue(teamMask('VVV', event.target.value))} /></label>
        <MiniResults rows={[[t.globalSlots, mask.slots().join(' ')], [t.instanceSlots, teamMask.slots().join(' ')]]} />
      </div>
      <CodeBlock code={codeSnippets.slots} />
    </article>
  )
}

function RecipeCopy({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return <div className="recipe-copy"><span>{eyebrow}</span><h3>{title}</h3><p>{text}</p></div>
}

function MiniResults({ rows }: { rows: Array<[string, string]> }) {
  return <div className="mini-results">{rows.map(([label, value]) => <output key={label}><span>{label}</span><code>{value}</code></output>)}</div>
}

function SyntaxIntro({ locale }: { locale: Locale }) {
  const t = content[locale].syntax
  return (
    <section className="syntax-section">
      <SectionHeading compact eyebrow={t.eyebrow} title={t.title} text={t.text} />
      <div className="syntax-strip">
        {t.rows.map(([name, title, kind, description]) => <article className={`syntax-card ${kind}`} key={name}><code>{name}</code><strong>{title}</strong><span>{description}</span></article>)}
      </div>
    </section>
  )
}

function WhyMaskSection({ locale }: { locale: Locale }) {
  const t = content[locale].why
  return (
    <section className="why-section">
      <SectionHeading eyebrow={t.eyebrow} title={t.title} text={t.text} />
      <div className="why-grid">{t.reasons.map(([title, text], index) => <article key={title}><span>{String(index + 1).padStart(2, '0')}</span><h3>{title}</h3><p>{text}</p></article>)}</div>
    </section>
  )
}

function BenchmarkSection({ locale }: { locale: Locale }) {
  const t = content[locale].benchmark
  return (
    <section className="benchmark-section" id="benchmark">
      <SectionHeading eyebrow={t.eyebrow} title={t.title} text={t.text} />
      <div className="benchmark-grid">{t.rows.map(([name, ops, note]) => <article key={name}><span>{name}</span><strong>{ops}</strong><p>{note}</p></article>)}</div>
      <CodeBlock className="snippet benchmark-code" code={`const iterations = 200000\nfor (let i = 0; i < iterations; i++) {\n  mask('###[.]###[.]###[-]##', '12345678909')\n}`} />
    </section>
  )
}

function HandSketch({ type }: { type: string }) {
  return (
    <svg className={`hand-sketch ${type}`} viewBox="0 0 220 150" role="img" aria-label={type}>
      <path className="sketch-paper" d="M18 18 C58 10,146 10,202 19 C208 54,207 99,199 132 C151 142,72 141,20 132 C12 95,13 54,18 18 Z" />
      {type === 'format' && <><path d="M35 48 C62 42,92 42,119 48" /><path d="M35 74 C72 68,108 68,146 74" /><path d="M142 50 C156 58,165 65,176 76" /><path d="M176 76 C163 84,152 91,139 101" /><rect x="35" y="94" width="120" height="24" rx="7" /></>}
      {type === 'raw' && <><rect x="32" y="42" width="146" height="26" rx="8" /><path d="M54 82 C78 91,123 91,150 82" /><path d="M69 102 C92 108,124 108,147 102" /><path d="M36 55 L53 55 M72 55 L89 55 M109 55 L126 55 M146 55 L164 55" /></>}
      {type === 'guard' && <><path d="M48 38 L111 24 L170 39 L161 102 C134 122,91 124,59 101 Z" /><path d="M78 73 L99 94 L142 55" /><path d="M42 122 C82 112,132 113,178 122" /></>}
      {type === 'ready' && <><circle cx="78" cy="76" r="35" /><path d="M62 77 L75 91 L101 61" /><path d="M125 54 C145 50,166 50,187 55" /><path d="M126 79 C146 75,166 76,185 80" /><path d="M126 104 C145 101,161 101,181 105" /></>}
      {type === 'measure' && <><path d="M38 50 L178 50" /><path d="M38 42 L38 59 M178 42 L178 59" /><rect x="44" y="78" width="24" height="24" rx="6" /><rect x="76" y="78" width="24" height="24" rx="6" /><rect x="108" y="78" width="24" height="24" rx="6" /><rect x="140" y="78" width="24" height="24" rx="6" /></>}
      {type === 'registry' && <><rect x="34" y="36" width="64" height="38" rx="9" /><rect x="122" y="36" width="64" height="38" rx="9" /><path d="M66 76 C67 92,82 102,105 105" /><path d="M154 76 C152 93,139 102,114 105" /><rect x="78" y="101" width="64" height="24" rx="8" /></>}
      {type === 'language' && <><path d="M40 48 C65 39, 91 39, 116 48" /><path d="M42 79 C72 71, 110 72, 146 80" /><path d="M48 108 C83 101, 125 101, 170 109" /><path d="M146 43 L178 43 L163 67 L178 91 L145 91" /><circle cx="62" cy="48" r="4" /><circle cx="93" cy="79" r="4" /><circle cx="132" cy="108" r="4" /></>}
    </svg>
  )
}

function ApiDocsSection({ locale }: { locale: Locale }) {
  const t = content[locale].api
  const rows = buildApiRows(locale)
  return (
    <section className="api-docs-section">
      <SectionHeading eyebrow={t.eyebrow} title={t.title} text={t.text} />
      <div className="api-flow">{t.flow.map(([title, text]) => <div key={title}><strong>{title}</strong><span>{text}</span></div>)}</div>
      <div className="api-doc-grid">{rows.map(([label, name, description, example, sketch]) => <article className="api-doc-card" key={name}><HandSketch type={sketch} /><div className="api-doc-copy"><span>{label}</span><h3>{name}</h3><p>{description}</p></div><CodeBlock code={example} className="snippet api-example" /></article>)}</div>
    </section>
  )
}

function ReactFormsSection({ locale }: { locale: Locale }) {
  const t = content[locale].reactForms
  const examples = buildHookExamples(locale)

  return (
    <section className="react-forms-section" id="react-forms">
      <SectionHeading eyebrow={t.eyebrow} title={t.title} text={t.text} />
      <div className="react-forms-grid">
        {examples.map((example, index) => (
          <article className={`react-form-card${example.soon ? ' is-soon' : ''}`} key={`${example.framework}-${example.title}`}>
            <div>
              <span>{String(index + 1).padStart(2, '0')} · {example.framework}</span>
              <h3>{example.title}</h3>
              <p>{example.description}</p>
              {example.soon ? <strong className="soon-badge">{t.soon}</strong> : null}
            </div>
            {example.code ? <CodeBlock code={example.code} /> : <div className="hook-soon"><code>{example.title}</code><span>{t.soon}</span></div>}
          </article>
        ))}
      </div>
    </section>
  )
}

function App() {
  const [locale, setLocale] = useState<Locale>(() => (window.localStorage.getItem('maskarajs-locale') as Locale) || 'pt-BR')
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = window.localStorage.getItem('maskarajs-theme')
    return savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : 'light'
  })
  const [framework, setFramework] = useState<Framework>('React')
  const [donationOpen, setDonationOpen] = useState(false)
  const t = content[locale]
  const presets = useMemo(() => buildPresets(locale), [locale])
  const examples = useMemo(() => buildExamples(locale), [locale])

  useEffect(() => {
    window.localStorage.setItem('maskarajs-locale', locale)
  }, [locale])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    window.localStorage.setItem('maskarajs-theme', theme)
  }, [theme])

  useEffect(() => {
    if (window.sessionStorage.getItem('maskarajs-donation-seen')) return
    const timer = window.setTimeout(() => {
      setDonationOpen(true)
      window.sessionStorage.setItem('maskarajs-donation-seen', 'true')
    }, 2200)
    return () => window.clearTimeout(timer)
  }, [])

  return (
    <main id="top" data-theme={theme}>
      <TopNav
        locale={locale}
        onLocaleChange={setLocale}
        languageLabel={t.switchLabel}
        theme={theme}
        onThemeChange={setTheme}
        themeLabel={t.themeLabel}
        themeOptions={t.theme}
        donateLabel={t.pix.button}
        onDonate={() => setDonationOpen(true)}
      />
      <DonationSupport locale={locale} open={donationOpen} onClose={() => setDonationOpen(false)} />
      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">{t.hero.eyebrow}</p>
          <h1>{t.hero.title}</h1>
          <p className="hero-text">{t.hero.text}</p>
          <InstallCommands locale={locale} />
          <div className="hero-actions"><a className="button primary" href="#playground">{t.hero.primary}</a><a className="button secondary" href="#benchmark">{t.hero.secondary}</a></div>
          <div className="stats" aria-label="Maskarajs">{t.hero.stats.map(([title, text]) => <div key={title}><strong>{title}</strong><span>{text}</span></div>)}</div>
        </div>
        <div className="visual" aria-label="Mask example"><PatternVisualizer patternText="##[/]{0-1}#[/]####" locale={locale} /><CodeBlock className="hero-code" code={`mask.define('month', {\n  pattern: '{0-1}#',\n  validate: raw => Number(raw) <= 12\n})\n\nmask('month', '19') // '1'`} /></div>
      </section>
      <SyntaxIntro locale={locale} />
      <Playground locale={locale} presets={presets} />
      <CustomLab locale={locale} />
      <ExampleGallery locale={locale} examples={examples} />
      <section className="docs-section" id="implementacao"><SectionHeading eyebrow={t.docs.eyebrow} title={t.docs.title} text={t.docs.text} /><div className="implementation"><div className="tabs" role="tablist" aria-label="Frameworks">{(['React', 'Vue', 'Angular', 'React Native', 'Vanilla'] as Framework[]).map((item) => <button key={item} type="button" role="tab" aria-selected={framework === item} onClick={() => setFramework(item)}>{item}</button>)}</div><CodeBlock code={snippets[framework]} /></div></section>
      <ReactFormsSection locale={locale} />
      <section className="recipes-section" id="receitas"><SectionHeading eyebrow={t.recipes.eyebrow} title={t.recipes.title} text={t.recipes.text} /><div className="recipes-grid"><ValidateDemo locale={locale} /><CustomSlotsDemo locale={locale} /><DefineDemo locale={locale} /><CreateDemo locale={locale} /></div></section>
      <WhyMaskSection locale={locale} />
      <BenchmarkSection locale={locale} />
      <ApiDocsSection locale={locale} />
      <section className="final-section"><div><span>{t.final.eyebrow}</span><h2>{t.final.title}</h2></div><CodeBlock className="footer-code" code="npm install maskarajs" /></section>
    </main>
  )
}

export default App

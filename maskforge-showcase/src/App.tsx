import { useEffect, useMemo, useState } from "react";
import maskara from "../../mask.js";
import { DonationSupport } from "./components/DonationSupport";
import { TopNav, type Locale, type Theme } from "./components/TopNav";
import mascotLogo from "./assets/logo-hero.png";
import "./App.css";

type Framework = "React" | "Vue" | "Angular" | "React Native" | "Vanilla";
type RegistryName = "BR" | "US";
type BlockKind = "slot" | "literal" | "expr" | "name" | "pattern";

type Preset = {
  name: string;
  pattern: string | string[];
  value: string;
  description: string;
  implementation: string;
};

type Example = {
  title: string;
  pattern: string | string[];
  value: string;
  description: string;
};

type HookExample = {
  framework: string;
  title: string;
  description: string;
  code?: string;
  soon?: boolean;
};

type DocumentationTopic = {
  id: string;
  menu: string;
  eyebrow: string;
  title: string;
  description: string;
  bullets: string[];
  code: string;
};

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

const shell = "mx-auto w-[min(1180px,calc(100%_-_32px))]";
const borderedPanel =
  "min-w-0 rounded-xl border border-line bg-surface shadow-maskara-soft";
const section = `${shell} py-10 sm:py-14`;
const softBand =
  "rounded-2xl border border-line bg-[linear-gradient(135deg,color-mix(in_srgb,var(--teal)_8%,var(--surface)),var(--surface)_58%,color-mix(in_srgb,var(--amber)_12%,var(--surface)))] p-4 shadow-maskara-soft";
const warmBand =
  "rounded-2xl border border-line bg-[linear-gradient(135deg,color-mix(in_srgb,var(--amber)_16%,var(--surface)),var(--surface)_60%,color-mix(in_srgb,var(--language-literal-bg)_14%,var(--surface)))] p-4 shadow-maskara-soft";
const calmBand =
  "rounded-2xl border border-line bg-[linear-gradient(135deg,color-mix(in_srgb,var(--surface-soft)_82%,var(--surface)),var(--surface)_55%,color-mix(in_srgb,var(--language-slot-bg)_16%,var(--surface)))] p-4 shadow-maskara-soft";
const inputClass =
  "min-h-[46px] w-full rounded-lg border border-line bg-surface px-3 py-[11px] text-ink outline-none";
const fieldClass = "mb-3.5 grid gap-2 text-left text-[13px] font-bold text-ink";
const sectionHeadingClass = "grid gap-3.5";
const eyebrowClass =
  "w-fit rounded-full bg-language-slot px-2.5 py-1.5 text-xs font-black uppercase text-[var(--language-slot-ink)]";
const sectionTitleClass =
  "m-0 max-w-[860px] text-[clamp(30px,4vw,52px)] leading-none tracking-normal text-ink";
const sectionTextClass = "m-0 max-w-[780px] leading-[1.55] text-muted";
const codePanelClass =
  "min-w-0 overflow-auto rounded-xl border border-white/10 bg-[#101917] p-4 text-[13px] leading-[1.6] text-[#d6fff1] shadow-maskara-soft";
const cardClass =
  "rounded-xl border border-line bg-surface p-4 shadow-maskara-soft transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_42px_var(--shadow-soft)]";
const pillButtonClass =
  "min-h-9 rounded-full border border-line bg-surface px-3 text-xs font-black text-muted";
const activePillClass =
  "border-teal bg-[color-mix(in_srgb,var(--teal)_14%,var(--surface))] text-ink";

const namedPatterns: Record<string, string | string[]> = {
  month: "{0-1}#",
  date: "##[/]{0-1}#[/]####",
  dateStrict: "##[/]{0-1}#[/]####",
  money: "########[,]##",
};

if (!maskara.names().includes("month")) {
  maskara.define("month", {
    pattern: namedPatterns.month,
    validate: (raw, _masked, complete) => {
      if (!complete) return true;
      const month = Number(raw);
      return month >= 1 && month <= 12;
    },
  });
}

if (!maskara.names().includes("date")) {
  maskara.define("date", {
    pattern: namedPatterns.date,
    validate: (raw) => {
      if (raw.length < 4) return true;
      const month = Number(raw.slice(2, 4));
      return month >= 1 && month <= 12;
    },
    transform: (raw, _masked, complete) => {
      if (!complete) return null;
      const date = new Date(
        `${raw.slice(4, 8)}-${raw.slice(2, 4)}-${raw.slice(0, 2)}T12:00:00`,
      );
      return Number.isNaN(date.getTime()) ? null : date;
    },
  });
}

if (!maskara.names().includes("dateStrict")) {
  maskara.define("dateStrict", {
    pattern: namedPatterns.dateStrict,
    validate: (raw) => {
      if (raw.length < 4) return true;
      const month = Number(raw.slice(2, 4));
      return month >= 1 && month <= 12;
    },
    transform: (raw, _masked, complete) => {
      if (!complete) return null;
      const date = new Date(
        `${raw.slice(4, 8)}-${raw.slice(2, 4)}-${raw.slice(0, 2)}T12:00:00`,
      );
      return Number.isNaN(date.getTime()) ? null : date;
    },
  });
}

if (!maskara.names().includes("money")) {
  maskara.define("money", {
    pattern: namedPatterns.money,
    transform: (raw) => Number.parseInt(raw || "0", 10) / 100,
  });
}

if (!maskara.names().includes("smartDocument")) {
  maskara.define("smartDocument", {
    patterns: {
      cpf: "###[.]###[.]###[-]##",
      cnpj: "##[.]###[.]###[/]####[-]##",
    },
    select: (raw) => (raw.includes("123") ? "cnpj" : "cpf"),
  });
}

if (!maskara.slots().includes("N")) {
  maskara.defineSlot("N", { test: (ch) => /\d/.test(ch), hint: "0" });
}

const teamMaskara = maskara.create();
teamMaskara.defineSlot("H", {
  test: (ch) => /[0-9a-fA-F]/.test(ch),
  hint: "f",
});
teamMaskara.defineSlot("V", {
  test: (ch) => "AEIOUaeiou".includes(ch),
  hint: "a",
});

const maskaraBR = maskara.create({
  cpf: { pattern: "###[.]###[.]###[-]##" },
  cnpj: { pattern: "##[.]###[.]###[/]####[-]##" },
  phone: { pattern: ["[(]##[)] ####[-]####", "[(]##[)] #####[-]####"] },
  cep: {
    pattern: "#####[-]###",
    transform: (raw, _masked, complete) => (complete ? raw : null),
  },
});

const maskaraUS = maskara.create({
  ssn: { pattern: "###[-]##[-]####" },
  zip: { pattern: "#####[-]####" },
  phone: { pattern: "[(]###[)] ###[-]####" },
});

const snippets: Record<Framework, string> = {
  React: `import { useState } from 'react'
import maskara from 'maskarajs'

const cpfPattern = '###[.]###[.]###[-]##'

export function CPFInput() {
  const [masked, setMasked] = useState('')
  const raw = maskara.raw(cpfPattern, masked)
  const complete = maskara.is(cpfPattern, masked)

  return (
    <label>
      CPF
      <input
        value={masked}
        placeholder={maskara.hint(cpfPattern)}
        inputMode="numeric"
        onChange={event => setMasked(maskara(cpfPattern, event.target.value))}
      />
      <small>raw: {raw} / complete: {String(complete)}</small>
    </label>
  )
}`,
  Vue: `<script setup lang="ts">
import { computed, ref } from 'vue'
import maskara from 'maskarajs'

const pattern = '#####[-]###'
const masked = ref('')
const raw = computed(() => maskara.raw(pattern, masked.value))
const complete = computed(() => maskara.is(pattern, masked.value))

function update(value: string) {
  masked.value = maskara(pattern, value)
}
</script>

<template>
  <input
    :value="masked"
    :placeholder="maskara.hint(pattern)"
    inputmode="numeric"
    @input="update(($event.target as HTMLInputElement).value)"
  />
  <small>raw: {{ raw }} / complete: {{ complete }}</small>
</template>`,
  Angular: `import { Component } from '@angular/core'
import maskara from 'maskarajs'

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
    return maskara.raw(this.pattern, this.masked)
  }

  get complete() {
    return maskara.is(this.pattern, this.masked)
  }

  get placeholder() {
    return maskara.hint(this.pattern)
  }

  onInput(event: Event) {
    const input = event.target as HTMLInputElement
    this.masked = maskara(this.pattern, input.value)
  }
}`,
  "React Native": `import { useState } from 'react'
import { Text, TextInput, View } from 'react-native'
import maskara from 'maskarajs'

const phonePattern = ['[(]##[)] ####[-]####', '[(]##[)] #####[-]####']

export function PhoneField() {
  const [masked, setMasked] = useState('')
  const raw = maskara.raw(phonePattern, masked)

  return (
    <View>
      <TextInput
        value={masked}
        placeholder={maskara.hint(phonePattern)}
        keyboardType="number-pad"
        onChangeText={value => setMasked(maskara(phonePattern, value))}
      />
      <Text>raw: {raw}</Text>
    </View>
  )
}`,
  Vanilla: `import maskara from 'maskarajs'

const input = document.querySelector<HTMLInputElement>('#phone')!
const output = document.querySelector<HTMLElement>('#raw')!

const off = maskara.on(input, [
  '[(]##[)] ####[-]####',
  '[(]##[)] #####[-]####',
], {
  onValue(raw) {
    output.textContent = raw
  },
  onMaskara(masked) {
    console.log({ masked })
  },
})`,
};

const codeSnippets = {
  reactHook: `import maskara from 'maskarajs'
import { MaskaraProvider, useMaskara } from 'maskarajs/react'

const appMaskara = maskara.create({
  cpf: { pattern: '###[.]###[.]###[-]##' },
  phone: { pattern: ['[(]##[)] ####[-]####', '[(]##[)] #####[-]####'] },
})

export function CPFInput() {
  const cpf = useMaskara('cpf')

  return (
    <input
      {...cpf.inputProps({ inputMode: 'numeric' })}
    />
  )
}

export function App() {
  return (
    <MaskaraProvider engine={appMaskara}>
      <CPFInput />
    </MaskaraProvider>
  )
}`,
  validate: `maskara.define('month', {
  pattern: '{0-1}#',
  validate: (raw, masked, complete) => {
    if (!complete) return true
    const month = Number(raw)
    return month >= 1 && month <= 12
  },
})

maskara('month', '12') // '12'
maskara('month', '19') // '1'`,
  conditional: `maskara.define('smartDocument', {
  patterns: {
    cpf: '###[.]###[.]###[-]##',
    cnpj: '##[.]###[.]###[/]####[-]##',
  },
  select: raw => raw.includes('123') ? 'cnpj' : 'cpf',
})

maskara('smartDocument', '98765432100')
// '987.654.321-00'

maskara('smartDocument', '12345678000199')
// '12.345.678/0001-99'`,
  define: `maskara.define('date', {
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
  create: `export const maskaraBR = maskara.create({
  cpf:   { pattern: '###[.]###[.]###[-]##' },
  cnpj:  { pattern: '##[.]###[.]###[/]####[-]##' },
  phone: { pattern: ['[(]##[)] ####[-]####', '[(]##[)] #####[-]####'] },
})

export const maskaraUS = maskara.create({
  ssn:   { pattern: '###[-]##[-]####' },
  zip:   { pattern: '#####[-]####' },
})`,
  slots: `maskara.defineSlot('N', {
  test: ch => /\\d/.test(ch),
  hint: '0',
})

maskara('NNN[-]NN', '12345') // '123-45'

const forge = maskara.create()
forge.defineSlot('H', /[0-9a-f]/i)
forge.defineSlot('V', ch => 'AEIOUaeiou'.includes(ch))`,
  brPresets: `import maskara from 'maskarajs'
import { br, type BrazilPresetRegistry } from 'maskarajs/presets/br'

const maskaraBR = maskara.create<BrazilPresetRegistry>(br)

maskaraBR('cpf', '12345678909')
// '123.456.789-09'

maskaraBR('phone', '11987654321')
// '(11) 98765-4321'

maskaraBR.raw('date', '01/12/2025')
// Date`,
};

const content = {
  "pt-BR": {
    langName: "Português",
    switchLabel: "Idioma",
    themeLabel: "Tema",
    theme: {
      light: "Claro",
      dark: "Escuro",
    },
    pix: {
      support: "Apoie o projeto",
      button: "Pague um Monster",
      modalEyebrow: "Apoie o Maskarajs",
      title: "Pague um Monster para manter a forja acesa.",
      body: "Se a lib poupou alguns handlers, validacoes duplicadas ou aquela tarde brigando com mascara de input, considere apoiar. Pequenas doacoes ajudam a reservar tempo para melhorias, docs e exemplos melhores.",
      popular: "mais escolhido",
      how: "Como doar",
      howBody:
        "Abra o app do banco, escaneie o QR ou copie a chave Pix. Escolha a faixa que fizer sentido para voce.",
      copied: "Chave copiada",
      copy: "Copiar chave Pix",
      close: "Fechar popup de doacao",
      tiers: [
        [
          "R$ 7",
          "Gole simbolico",
          "Para quem curtiu a ideia e quer deixar um sinal de apoio.",
        ],
        [
          "R$ 15",
          "Pague um Monster",
          "A faixa mais facil de escolher: energia para manter o projeto andando.",
        ],
        [
          "R$ 30",
          "Sprint de energia",
          "Para quem usou o Maskarajs em um formulario real e quer fortalecer a lib.",
        ],
        [
          "R$ 50+",
          "Backer frontend",
          "Para times e devs que querem ver a ferramenta amadurecer com carinho.",
        ],
      ],
    },
    hero: {
      eyebrow: "maskarajs · framework-agnostic · zero deps",
      title: "Mascaras de input que deixam o frontend mais simples.",
      text: "Maskarajs entrega uma forma pequena e previsivel de formatar, limpar e validar campos sem prender seu projeto a um framework ou a uma pilha de handlers.",
      primary: "Testar agora",
      secondary: "Ver performance",
      stats: [
        ["~4kb", "Pequena o bastante para ficar perto do input."],
        ["validate", "Regras reais sem transformar o campo em um labirinto."],
        ["Typed", "Presets organizados para projetos que crescem."],
      ],
    },
    syntax: {
      eyebrow: "Linguagem do pattern",
      title: "Declare slots, literais e expressoes com uma sintaxe curta.",
      text: "Antes do playground, aqui esta o mapa mental do Maskarajs: blocos pequenos, coloridos e faceis de combinar para transformar regra de input em codigo legivel.",
      rows: [
        ["#", "Numero", "slot", "Slot pronto para digitos de 0 a 9."],
        ["@", "Letra", "slot", "Aceita letras, inclusive acentuadas."],
        [
          "*",
          "Livre",
          "slot",
          "Um caractere qualquer quando a regra e aberta.",
        ],
        [
          "[texto]",
          "Literal",
          "literal",
          "Tudo dentro dos colchetes entra como texto fixo.",
        ],
        [
          "{expr}",
          "Expressao",
          "expr",
          "Restrinja um caractere com range, conjunto ou regex.",
        ],
        [
          "N, H...",
          "Seu slot",
          "custom",
          "Crie simbolos para a linguagem do seu time.",
        ],
      ],
    },
    playground: {
      eyebrow: "Playground",
      title:
        "Escolha um exemplo, digite como usuario e veja a implementacao completa.",
      text: "Os exemplos ficam prontos para uso: voce so troca o valor e acompanha o resultado, o raw, o progresso e o codigo para reproduzir o comportamento.",
      pattern: "Pattern deste exemplo",
      input: "Digite como seu usuario digitaria",
      invalid: "Padrao invalido",
      fixPattern: "corrija o padrao",
      typeValue: "Digite um valor",
    },
    lab: {
      eyebrow: "Laboratorio livre",
      title:
        "Agora e sua vez: escreva qualquer pattern e teste sem compromisso.",
      text: "Use este espaco para validar uma regra do seu produto. Cole um pattern, digite valores reais e veja os blocos mudarem junto com o resultado.",
      pattern: "Pattern customizado",
      value: "Valor de teste",
      fix: "Corrija o pattern",
      invalid: "Pattern invalido",
    },
    examplesTitle:
      "Os campos que aparecem em todo produto, resolvidos com a mesma API.",
    examplesEyebrow: "Exemplos",
    recipes: {
      eyebrow: "Receitas interativas",
      title:
        "Comece com um pattern. Evolua para uma camada de mascaras do produto.",
      text: "Valide contexto, transforme raw values e organize presets sem espalhar regras de input por todos os componentes.",
      validateTitle: "Quando a mascara precisa entender contexto.",
      validateText:
        "`{0-1}#` limita o formato do mes, mas nao sabe que 19 e invalido. `validate` entra nesse ponto e evita que o estado ruim chegue no seu formulario.",
      test12: "Testar 12",
      test19: "Testar 19",
      conditionalTitle:
        "Troque de mascara quando o valor digitado pedir outro caminho.",
      conditionalText:
        "Arrays de string seguem escolhendo por tamanho. Arrays com objetos permitem `when(raw, value)`: a primeira regra verdadeira vence, e uma regra sem `when` vira fallback.",
      useCpf: "Usar CPF",
      useCnpjTrigger: "Usar gatilho 123",
      defineTitle: "De nome para as mascaras que seu produto usa todo dia.",
      defineText:
        "O input fica agradavel para o usuario, e o seu codigo recebe string limpa, number, Date, null ou o tipo que fizer sentido.",
      createTitle:
        "Separe presets por contexto sem misturar responsabilidades.",
      createText:
        "Um checkout BR, um painel US, uma lib interna: cada instancia carrega suas mascaras e usa a mesma API.",
      named: "Mascara nomeada",
      value: "Valor",
      slotsTitle: "Crie uma linguagem de mascara com a cara do seu time.",
      slotsText:
        "`N` pode ser numero, `H` pode ser hexadecimal, `V` pode ser vogal. No global isso vale para o app inteiro; em uma instancia, a regra fica isolada para aquele produto, pacote ou formulario.",
      globalSlots: "slots globais",
      instanceSlots: "slots instancia",
    },
    why: {
      eyebrow: "Por que Maskarajs",
      title:
        "Porque mascara de input nao deveria virar uma colecao de excecoes no frontend.",
      text: "A proposta e simples: uma engine pequena, declarativa e flexivel o suficiente para lidar com os casos comuns e com as regras especificas que aparecem quando o produto amadurece.",
      reasons: [
        [
          "Cabe no seu formulario",
          "A API e pequena: formatar, pegar raw, validar, medir e conectar ao input. Sem arquitetura nova para aprender.",
        ],
        [
          "Nao prende seu stack",
          "Funciona em React, Vue, Svelte ou Vanilla porque o core nao depende de componente, hook ou diretiva.",
        ],
        [
          "Regras reais, nao so caracteres",
          "Com validate e transform, a mascara entende contexto e devolve valores prontos para a regra de negocio.",
        ],
        [
          "Presets sem estado global",
          "maskara.create permite separar mascaras por pais, produto ou area do app sem misturar responsabilidades.",
        ],
        [
          "Leve por design",
          "Parser cacheado, zero dependencias e uma superficie pequena para manter perto da digitacao.",
        ],
        [
          "Legivel para o time",
          "Patterns curtos, literais explicitos e blocos visuais tornam a regra facil de revisar.",
        ],
      ],
    },
    docs: {
      eyebrow: "Implementacao pura",
      title:
        "Use o core do maskarajs em qualquer stack, sem adaptador obrigatorio.",
      text: "React, Vue, Angular, React Native e Vanilla podem usar a mesma API: aplique maskara() no input, leia raw() para salvar e is() para saber quando esta completo.",
    },
    reactForms: {
      eyebrow: "React forms",
      title: "Quando quiser conveniencia no React, use o hook pronto.",
      text: "O adapter React agora tambem tem MaskaraProvider: configure uma instancia uma vez e use useMaskara nos campos sem repetir engine em todo componente.",
      soon: "Em breve",
      cards: [
        [
          "useMaskara",
          "O caminho curto para inputs React controlados, mantendo masked na tela e raw disponivel no retorno.",
        ],
        [
          "useMaskaraDirective",
          "Diretiva pensada para Vue 3, para aplicar mascara sem repetir handler em cada input.",
        ],
        [
          "maskaraDirective",
          "Diretiva Angular para conectar maskarajs ao template mantendo raw e complete acessiveis.",
        ],
        [
          "useNativeMaskara",
          "Hook para React Native com a mesma ideia do core: valor mascarado na tela e raw pronto para salvar.",
        ],
      ],
    },
    install: {
      eyebrow: "Instalacao",
      title: "Comece com um comando e ja teste no seu input.",
      text: "Escolha seu gerenciador, copie o comando e leve o maskarajs para o formulario que mais precisa ficar simples.",
      copied: "Copiado",
      copy: "Copiar comando",
    },
    benchmark: {
      eyebrow: "Performance",
      title: "Leve o bastante para rodar perto do input.",
      text: "Estes numeros foram medidos no Node dentro do WSL com 200.000 iteracoes por caso. Eles nao prometem milagre, mas mostram a ideia: a mascara pode ficar no caminho critico da digitacao sem virar peso para a interface.",
      rows: [
        ["CPF format", "39,705 ops/s", "Formatacao comum com literais"],
        ["Phone dynamic", "32,455 ops/s", "Escolha automatica entre patterns"],
        [
          "Date validate",
          "64,572 ops/s",
          "Regra contextual em mascara nomeada",
        ],
        ["Raw extraction", "44,729 ops/s", "Valor limpo a partir do display"],
      ],
    },
    api: {
      eyebrow: "API na pratica",
      title: "Uma API pequena para cobrir o ciclo inteiro do campo.",
      text: "Formatar, limpar, validar, medir progresso e separar presets. O Maskarajs resolve essas etapas sem obrigar voce a trocar de framework.",
      flow: [
        ["1. Voce descreve", "Slots, literais e expressoes em poucas letras."],
        ["2. O usuario digita", "Digitacao, paste e edicao no mesmo campo."],
        [
          "3. A engine trabalha",
          "Filtra, valida, aplica literais e transforma.",
        ],
        ["4. Seu app recebe", "masked, raw, complete, hint e progresso."],
      ],
    },
    final: {
      eyebrow: "Pronto para experimentar",
      title:
        "Leve para o seu formulario e remova uma classe inteira de bugs chatos de input.",
    },
  },
  en: {
    langName: "English",
    switchLabel: "Language",
    themeLabel: "Theme",
    theme: {
      light: "Light",
      dark: "Dark",
    },
    pix: {
      support: "Support the project",
      button: "Buy me a Monster",
      modalEyebrow: "Support Maskarajs",
      title: "Buy me a Monster and keep the forge warm.",
      body: "If this library saved you a few handlers, duplicated validations, or an afternoon fighting input masks, consider supporting it. Small donations help reserve time for improvements, docs, and better examples.",
      popular: "most picked",
      how: "How to donate",
      howBody:
        "Open your banking app, scan the QR code, or copy the Pix key. Choose the tier that feels right to you.",
      copied: "Pix key copied",
      copy: "Copy Pix key",
      close: "Close donation popup",
      tiers: [
        [
          "R$ 7",
          "Small sip",
          "For anyone who liked the idea and wants to leave a small sign of support.",
        ],
        [
          "R$ 15",
          "Buy a Monster",
          "The easiest tier to pick: a little energy to keep the project moving.",
        ],
        [
          "R$ 30",
          "Energy sprint",
          "For anyone who used Maskarajs in a real form and wants to strengthen the library.",
        ],
        [
          "R$ 50+",
          "Frontend backer",
          "For teams and devs who want to see the tool mature with care.",
        ],
      ],
    },
    hero: {
      eyebrow: "maskarajs · framework-agnostic · zero deps",
      title: "Input masks that make frontend code simpler.",
      text: "Maskarajs gives you a small, predictable way to format, clean, and validate fields without tying your project to a framework or a stack of handlers.",
      primary: "Try it now",
      secondary: "See performance",
      stats: [
        ["~4kb", "Small enough to live close to the input."],
        ["validate", "Real rules without turning the field into a maze."],
        ["Typed", "Organized presets for projects that grow."],
      ],
    },
    syntax: {
      eyebrow: "Pattern language",
      title: "Declare slots, literals, and expressions with a compact syntax.",
      text: "Before the playground, here is the mental model: small colored blocks that are easy to combine and easy to review.",
      rows: [
        ["#", "Number", "slot", "Built-in slot for digits from 0 to 9."],
        ["@", "Letter", "slot", "Accepts letters, including accented letters."],
        ["*", "Open", "slot", "Any single character when the rule is loose."],
        [
          "[text]",
          "Literal",
          "literal",
          "Everything inside brackets becomes fixed text.",
        ],
        [
          "{expr}",
          "Expression",
          "expr",
          "Restrict one character with a range, set, or regex.",
        ],
        [
          "N, H...",
          "Your slot",
          "custom",
          "Create symbols for your team pattern language.",
        ],
      ],
    },
    playground: {
      eyebrow: "Playground",
      title:
        "Pick an example, type like a user, and see the full implementation.",
      text: "Examples are ready to use: change the value and watch the result, raw value, progress, and code needed to reproduce the behavior.",
      pattern: "Pattern for this example",
      input: "Type as your user would",
      invalid: "Invalid pattern",
      fixPattern: "fix the pattern",
      typeValue: "Type a value",
    },
    lab: {
      eyebrow: "Free lab",
      title: "Your turn: write any pattern and test freely.",
      text: "Use this space to validate a product rule. Paste a pattern, type real values, and watch the blocks update with the result.",
      pattern: "Custom pattern",
      value: "Test value",
      fix: "Fix the pattern",
      invalid: "Invalid pattern",
    },
    examplesTitle: "Fields every product has, solved with the same API.",
    examplesEyebrow: "Examples",
    recipes: {
      eyebrow: "Interactive recipes",
      title: "Start with a pattern. Grow into a product-level mask layer.",
      text: "Validate context, transform raw values, and organize presets without spreading input rules across components.",
      validateTitle: "When the mask needs context.",
      validateText:
        "`{0-1}#` limits the month format, but it does not know that 19 is invalid. `validate` closes that gap before bad state reaches your form.",
      test12: "Try 12",
      test19: "Try 19",
      conditionalTitle: "Switch masks when the typed value asks for another path.",
      conditionalText:
        "String arrays still choose by size. Object arrays enable `when(raw, value)`: the first truthy rule wins, and a rule without `when` becomes the fallback.",
      useCpf: "Use CPF",
      useCnpjTrigger: "Use 123 trigger",
      defineTitle: "Name the masks your product uses every day.",
      defineText:
        "The input feels good for the user, and your code receives a clean string, number, Date, null, or whatever type makes sense.",
      createTitle: "Split presets by context without mixing responsibilities.",
      createText:
        "A Brazilian checkout, a US dashboard, an internal package: each instance carries its masks and keeps the same API.",
      named: "Named mask",
      value: "Value",
      slotsTitle: "Create a mask language that fits your team.",
      slotsText:
        "`N` can mean number, `H` can mean hexadecimal, `V` can mean vowel. Globally it affects the whole app; in an instance, it stays isolated to that product, package, or form.",
      globalSlots: "global slots",
      instanceSlots: "instance slots",
    },
    why: {
      eyebrow: "Why Maskarajs",
      title:
        "Because input masks should not become a collection of frontend exceptions.",
      text: "The idea is simple: a small, declarative engine flexible enough for common cases and the specific rules that show up as a product matures.",
      reasons: [
        [
          "Fits your form",
          "A small API: format, get raw, validate, measure, and bind to the input. No new architecture to learn.",
        ],
        [
          "Does not lock your stack",
          "Works with React, Vue, Svelte, or Vanilla because the core does not depend on a component, hook, or directive.",
        ],
        [
          "Real rules, not only characters",
          "With validate and transform, the mask understands context and returns values ready for business rules.",
        ],
        [
          "Presets without global state",
          "maskara.create separates masks by country, product, or app area without mixing responsibilities.",
        ],
        [
          "Light by design",
          "Cached parser, zero dependencies, and a small surface area for input-level work.",
        ],
        [
          "Readable for the team",
          "Short patterns, explicit literals, and visual blocks make rules easy to review.",
        ],
      ],
    },
    docs: {
      eyebrow: "Pure implementation",
      title: "Use the maskarajs core in any stack, with no required adapter.",
      text: "React, Vue, Angular, React Native, and Vanilla can use the same API: apply maskara() in the input, read raw() for storage, and is() for completion.",
    },
    reactForms: {
      eyebrow: "React forms",
      title: "When you want React convenience, use the ready hook.",
      text: "The React adapter now also has MaskaraProvider: configure an instance once and call useMaskara in fields without repeating engine in every component.",
      soon: "Coming soon",
      cards: [
        [
          "useMaskara",
          "The shortest path for controlled React inputs, keeping masked on screen and raw in the returned object.",
        ],
        [
          "useMaskaraDirective",
          "A Vue 3 directive designed to apply masks without repeating handlers on every input.",
        ],
        [
          "maskaraDirective",
          "An Angular directive to connect maskarajs to templates while keeping raw and complete available.",
        ],
        [
          "useNativeMaskara",
          "A React Native hook with the same core idea: masked value on screen and raw ready to save.",
        ],
      ],
    },
    install: {
      eyebrow: "Install",
      title: "Start with one command and try it in your input.",
      text: "Pick your package manager, copy the command, and bring maskarajs into the form that needs to stay simple.",
      copied: "Copied",
      copy: "Copy command",
    },
    benchmark: {
      eyebrow: "Performance",
      title: "Light enough to run near the input.",
      text: "These numbers were measured in Node inside WSL with 200,000 iterations per case. They are not magic promises, but they show the intent: masking can stay on the typing path without weighing down the UI.",
      rows: [
        ["CPF format", "39,705 ops/s", "Common formatting with literals"],
        ["Phone dynamic", "32,455 ops/s", "Automatic choice between patterns"],
        ["Date validate", "64,572 ops/s", "Contextual rule in a named mask"],
        [
          "Raw extraction",
          "44,729 ops/s",
          "Clean value from the display value",
        ],
      ],
    },
    api: {
      eyebrow: "API in practice",
      title: "A small API for the full field lifecycle.",
      text: "Format, clean, validate, measure progress, and split presets. Maskarajs covers those steps without forcing you to change framework.",
      flow: [
        [
          "1. You describe",
          "Slots, literals, and expressions in a few characters.",
        ],
        ["2. The user types", "Typing, paste, and editing in the same field."],
        [
          "3. The engine works",
          "Filters, validates, applies literals, and transforms.",
        ],
        ["4. Your app receives", "masked, raw, complete, hint, and progress."],
      ],
    },
    final: {
      eyebrow: "Ready to try",
      title:
        "Bring it into your form and remove a whole class of annoying input bugs.",
    },
  },
} as const;

function buildPresets(locale: Locale): Preset[] {
  const pt = locale === "pt-BR";
  return [
    {
      name: "CPF",
      pattern: "###[.]###[.]###[-]##",
      value: "12345678909",
      description: pt
        ? "O usuario ve CPF formatado; seu app recebe o valor limpo."
        : "The user sees a formatted CPF; your app receives the clean value.",
      implementation: `import maskara from 'maskarajs'

const pattern = '###[.]###[.]###[-]##'
const value = '12345678909'

const masked = maskara(pattern, value)
const raw = maskara.raw(pattern, masked)
const complete = maskara.is(pattern, masked)`,
    },
    {
      name: pt ? "Telefone BR" : "Brazilian phone",
      pattern: ["[(]##[)] ####[-]####", "[(]##[)] #####[-]####"],
      value: "11987654321",
      description: pt
        ? "Um unico campo cobre telefone fixo e celular sem gambiarras."
        : "One field covers landline and mobile numbers without hacks.",
      implementation: `import maskara from 'maskarajs'

const phone = [
  '[(]##[)] ####[-]####',
  '[(]##[)] #####[-]####',
]

maskara(phone, '11987654321')
maskara.raw(phone, '(11) 98765-4321')`,
    },
    {
      name: pt ? "Mes validado" : "Validated month",
      pattern: "month",
      value: "12",
      description: pt
        ? "Quando o pattern sozinho nao basta, validate fecha a regra."
        : "When the pattern alone is not enough, validate closes the rule.",
      implementation: codeSnippets.validate,
    },
    {
      name: "Slot N custom",
      pattern: "NNN[-]NN",
      value: "12345",
      description: pt
        ? "Crie uma linguagem de pattern que combina com o seu time."
        : "Create a pattern language that matches your team.",
      implementation: codeSnippets.slots,
    },
    {
      name: pt ? "Data strict" : "Strict date",
      pattern: "dateStrict",
      value: "01122025",
      description: pt
        ? "Data com mes real, sem aceitar 19/99 no meio do fluxo."
        : "Date with a real month, without accepting 19/99 in the flow.",
      implementation: codeSnippets.define,
    },
    {
      name: "Visa",
      pattern: "{4}### #### #### ####",
      value: "4111111111111111",
      description: pt
        ? "Restrinja a entrada antes de ela virar estado invalido."
        : "Restrict input before it becomes invalid state.",
      implementation: `import maskara from 'maskarajs'

const visa = '{4}### #### #### ####'

maskara(visa, '4111111111111111')
// '4111 1111 1111 1111'

maskara(visa, '5111111111111111')
// ''`,
    },
    {
      name: "Hex",
      pattern:
        "{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}",
      value: "1a2b3c",
      description: pt
        ? "Regras finas por caractere sem escrever um parser novo."
        : "Fine character rules without writing a new parser.",
      implementation: `import maskara from 'maskarajs'

const hex = '{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}'

maskara(hex, '1z2b3c')
// '12b3c'`,
    },
  ];
}

function buildExamples(locale: Locale): Example[] {
  const pt = locale === "pt-BR";
  return [
    {
      title: pt ? "Documento" : "Document",
      pattern: "###[.]###[.]###[-]##",
      value: "12345678909",
      description: pt
        ? "Visual bonito no input, payload limpo para a API."
        : "Nice display in the input, clean payload for the API.",
    },
    {
      title: pt ? "Data com validate" : "Date with validate",
      pattern: "dateStrict",
      value: "01192025",
      description: pt
        ? "O campo simplesmente nao deixa o erro seguir adiante."
        : "The field simply does not let the error move forward.",
    },
    {
      title: pt ? "Dinheiro" : "Money",
      pattern: "money",
      value: "129990",
      description: pt
        ? "A mascara cuida da tela; o transform entrega o tipo certo."
        : "The mask handles the UI; transform returns the right type.",
    },
    {
      title: "Regex slot",
      pattern:
        "{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}",
      value: "1z2b3c",
      description: pt
        ? "Paste sujo entra, valor coerente sai."
        : "Dirty paste goes in, coherent value comes out.",
    },
    {
      title: pt ? "Slot do time" : "Team slot",
      pattern: "NNN[-]NN",
      value: "12345",
      description: pt
        ? "Quando N significa numero no seu design system."
        : "When N means number in your design system.",
    },
  ];
}

function buildHookExamples(locale: Locale): HookExample[] {
  const t = content[locale].reactForms;
  return [
    {
      framework: "React",
      title: t.cards[0][0],
      description: t.cards[0][1],
      code: codeSnippets.reactHook,
    },
    {
      framework: "Vue 3",
      title: t.cards[1][0],
      description: t.cards[1][1],
      soon: true,
    },
    {
      framework: "Angular",
      title: t.cards[2][0],
      description: t.cards[2][1],
      soon: true,
    },
    {
      framework: "React Native",
      title: t.cards[3][0],
      description: t.cards[3][1],
      soon: true,
    },
  ];
}

function buildDocumentation(locale: Locale): DocumentationTopic[] {
  const pt = locale === "pt-BR";
  return [
    {
      id: "quick-start",
      menu: pt ? "Comeco rapido" : "Quick start",
      eyebrow: "maskara()",
      title: pt
        ? "Aplique mascara sem criar um componente novo."
        : "Apply a mask without creating a new component.",
      description: pt
        ? "A funcao principal recebe um pattern ou nome registrado e devolve a string pronta para exibir no input."
        : "The main function receives a pattern or registered name and returns the display string for the input.",
      bullets: pt
        ? [
          "Use direto no onChange, paste ou ao renderizar dados da API.",
          "A mesma chamada funciona em React, Vue, Angular, React Native e Vanilla.",
          "O valor de tela fica separado do valor limpo.",
        ]
        : [
          "Use it on change, paste, or when rendering API data.",
          "The same call works in React, Vue, Angular, React Native, and Vanilla.",
          "Display value stays separate from clean value.",
        ],
      code: `import maskara from 'maskarajs'

const cpf = '###[.]###[.]###[-]##'

maskara(cpf, '12345678909')
// '123.456.789-09'

maskara.raw(cpf, '123.456.789-09')
// '12345678909'`,
    },
    {
      id: "patterns",
      menu: "Patterns",
      eyebrow: "# @ * [] {}",
      title: pt
        ? "A linguagem do pattern cobre slots, literais e restricoes."
        : "The pattern language covers slots, literals, and restrictions.",
      description: pt
        ? "Patterns sao pequenos por design: voce combina tokens de entrada, texto fixo e expressoes por caractere."
        : "Patterns are small by design: combine input tokens, fixed text, and per-character expressions.",
      bullets: pt
        ? [
          "# aceita digitos, @ aceita letras e * aceita qualquer caractere.",
          "[texto] vira literal fixo e e removido do raw automaticamente.",
          "{expr} restringe um caractere com range, conjunto ou regex.",
        ]
        : [
          "# accepts digits, @ accepts letters, and * accepts any character.",
          "[text] becomes fixed literal text and is removed from raw automatically.",
          "{expr} restricts one character with a range, set, or regex.",
        ],
      code: `maskara('##[/]##[/]####', '01012025')
// '01/01/2025'

maskara('{4}### #### #### ####', '4111111111111111')
// '4111 1111 1111 1111'

maskara('{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}', '1z2')
// '12'`,
    },
    {
      id: "registered",
      menu: pt ? "Mascaras nomeadas" : "Named masks",
      eyebrow: "define()",
      title: pt
        ? "Dê nome para regras que aparecem em varios campos."
        : "Name rules that appear in multiple fields.",
      description: pt
        ? "Com define, seu produto passa a falar cpf, date, money ou qualquer nome do seu dominio."
        : "With define, your product can speak cpf, date, money, or any name from your domain.",
      bullets: pt
        ? [
          "Evita repetir patterns longos em varios componentes.",
          "Centraliza validate e transform junto da mascara.",
          "Funciona no registry global ou dentro de uma instancia.",
        ]
        : [
          "Avoid repeating long patterns across components.",
          "Keep validate and transform close to the maskara.",
          "Works globally or inside an isolated instance.",
        ],
      code: `maskara.define('date', {
  pattern: '##[/]{0-1}#[/]####',
  validate: raw => raw.length < 4 || Number(raw.slice(2, 4)) <= 12,
})

maskara('date', '01122025')
// '01/12/2025'`,
    },
    {
      id: "conditional",
      menu: pt ? "Condicionais" : "Conditional",
      eyebrow: "select(raw)",
      title: pt
        ? "Escolha outro pattern quando o raw apontar outra regra."
        : "Choose another pattern when raw points to another rule.",
      description: pt
        ? "Use regras condicionais quando tamanho nao basta. O pattern pode mudar por prefixo, BIN, pais, codigo interno ou qualquer regra de dominio."
        : "Use conditional rules when size is not enough. The pattern can change by prefix, BIN, country, internal code, or any domain rule.",
      bullets: pt
        ? [
          "Arrays de string continuam funcionando como antes.",
          "Use patterns para listar as opções por nome.",
          "select retorna a chave do pattern que deve ser usado.",
        ]
        : [
          "String arrays keep working as before.",
          "Use patterns to list options by name.",
          "select returns the pattern key that should be used.",
        ],
      code: `maskara.define('smartDocument', {
  patterns: {
    cpf: '###[.]###[.]###[-]##',
    cnpj: '##[.]###[.]###[/]####[-]##',
  },
  select: raw => raw.includes('123') ? 'cnpj' : 'cpf',
})

maskara('smartDocument', '98765432100')
// '987.654.321-00'

maskara('smartDocument', '12345678000199')
// '12.345.678/0001-99'`,
    },
    {
      id: "transform",
      menu: "Validate + transform",
      eyebrow: "validate()",
      title: pt
        ? "Valide contexto e devolva o tipo certo para o app."
        : "Validate context and return the right type to your app.",
      description: pt
        ? "O pattern filtra caracteres; validate fecha regras contextuais; transform converte raw para Date, number, null ou outro tipo."
        : "The pattern filters characters; validate handles contextual rules; transform converts raw into Date, number, null, or another type.",
      bullets: pt
        ? [
          "Bloqueie meses como 19 sem criar handler especial no input.",
          "Use complete para decidir quando transformar.",
          "raw() devolve o resultado do transform quando ele existe.",
        ]
        : [
          "Block months like 19 without a custom input handler.",
          "Use complete to decide when to transform.",
          "raw() returns the transform result when one exists.",
        ],
      code: `maskara.define('money', {
  pattern: '########[,]##',
  transform: raw => Number.parseInt(raw || '0', 10) / 100,
})

maskara('money', '129990')
// '1299,90'

maskara.raw('money', '1299,90')
// 1299.9`,
    },
    {
      id: "slots",
      menu: pt ? "Slots custom" : "Custom slots",
      eyebrow: "defineSlot()",
      title: pt
        ? "Crie uma linguagem curta para o seu time."
        : "Create a compact language for your team.",
      description: pt
        ? "Slots customizados deixam patterns mais expressivos quando seu produto tem simbolos recorrentes."
        : "Custom slots make patterns more expressive when your product has recurring symbols.",
      bullets: pt
        ? [
          "Registre N, H, V ou qualquer simbolo de um caractere.",
          "Use RegExp, funcao ou objeto com hint.",
          "Em instancias, a regra fica isolada daquele contexto.",
        ]
        : [
          "Register N, H, V, or any one-character symbol.",
          "Use a RegExp, function, or object with hint.",
          "Inside instances, the rule stays isolated to that context.",
        ],
      code: `const forge = maskara.create()

forge.defineSlot('H', /[0-9a-f]/i)
forge.defineSlot('V', ch => 'AEIOUaeiou'.includes(ch))

forge('HHHHHH', '1a2b3c')
// '1a2b3c'`,
    },
    {
      id: "instances",
      menu: pt ? "Instancias e presets" : "Instances and presets",
      eyebrow: "create()",
      title: pt
        ? "Separe regras por produto, pais ou pacote interno."
        : "Split rules by product, country, or internal package.",
      description: pt
        ? "maskara.create cria uma engine propria. Isso evita estado global acidental e permite presets oficiais como presets/br."
        : "maskara.create creates its own engine. This avoids accidental global state and enables official presets like presets/br.",
      bullets: pt
        ? [
          "Use para checkout BR, dashboard US ou design system.",
          "Presets BR incluem CPF, CNPJ, CEP, telefone, data, mes e dinheiro.",
          "Com TypeScript, os nomes registrados ganham autocomplete.",
        ]
        : [
          "Use it for Brazilian checkout, US dashboard, or a design system.",
          "BR presets include CPF, CNPJ, ZIP, phone, date, month, and money.",
          "With TypeScript, registered names get autocomplete.",
        ],
      code: `import maskara from 'maskarajs'
import { br, type BrazilPresetRegistry } from 'maskarajs/presets/br'

const maskaraBR = maskara.create<BrazilPresetRegistry>(br)

maskaraBR('cpf', '12345678909')
// '123.456.789-09'`,
    },
    {
      id: "react",
      menu: "React",
      eyebrow: "MaskaraProvider",
      title: pt
        ? "Configure uma engine uma vez e use nos campos."
        : "Configure an engine once and use it in fields.",
      description: pt
        ? "O adapter React entrega useMaskara para inputs controlados e MaskaraProvider para compartilhar a instancia configurada."
        : "The React adapter provides useMaskara for controlled inputs and MaskaraProvider for sharing the configured instance.",
      bullets: pt
        ? [
          "O hook guarda o estado do campo; a engine guarda configuracoes.",
          "inputProps conecta value, placeholder e onChange.",
          "Ainda e possivel passar engine direto em um campo especifico.",
        ]
        : [
          "The hook stores field state; the engine stores configuration.",
          "inputProps wires value, placeholder, and onChange.",
          "You can still pass engine directly to a specific field.",
        ],
      code: `import { MaskaraProvider, useMaskara } from 'maskarajs/react'

function CPFInput() {
  const cpf = useMaskara('cpf')
  return <input {...cpf.inputProps({ inputMode: 'numeric' })} />
}

<MaskaraProvider engine={maskaraBR}>
  <CPFInput />
</MaskaraProvider>`,
    },
    {
      id: "dom",
      menu: pt ? "DOM binding" : "DOM binding",
      eyebrow: "maskara.on()",
      title: pt
        ? "Vincule a mascara direto em um input DOM quando fizer sentido."
        : "Bind the mask directly to a DOM input when it makes sense.",
      description: pt
        ? "maskara.on e framework-agnostic: serve para Vanilla, actions, diretivas ou integracoes onde voce tem acesso ao input."
        : "maskara.on is framework-agnostic: use it in Vanilla, actions, directives, or integrations where you have access to the input.",
      bullets: pt
        ? [
          "Retorna cleanup para remover listeners.",
          "Dispara onValue com raw/transform e onMaskara com o valor de tela.",
          "Util para diretivas Vue, actions Svelte e widgets internos.",
        ]
        : [
          "Returns cleanup to remove listeners.",
          "Calls onValue with raw/transform and onMaskara with display value.",
          "Useful for Vue directives, Svelte actions, and internal widgets.",
        ],
      code: `const off = maskara.on(inputEl, 'phone', {
  onValue(raw) {
    console.log(raw)
  },
  onMaskara(masked) {
    console.log(masked)
  },
})

off()`,
    },
    {
      id: "utilities",
      menu: pt ? "Utilitarios" : "Utilities",
      eyebrow: "rawLength()",
      title: pt
        ? "Meça progresso, placeholder e completude sem reinventar logica."
        : "Measure progress, placeholder, and completion without reinventing logic.",
      description: pt
        ? "Os utilitarios ajudam a montar feedback visual, liberar submit e exibir placeholders coerentes."
        : "Utilities help build visual feedback, enable submit, and show coherent placeholders.",
      bullets: pt
        ? [
          "hint() gera placeholder a partir do pattern.",
          "is() indica se o campo esta completo.",
          "rawLength() e patternLength() ajudam em barras de progresso.",
        ]
        : [
          "hint() generates placeholder from the pattern.",
          "is() tells whether the field is complete.",
          "rawLength() and patternLength() help build progress bars.",
        ],
      code: `const total = maskara.patternLength('cpf')
const filled = maskara.rawLength('cpf', value)
const progress = filled / total

maskara.hint('cpf')
// '000.000.000-00'

maskara.is('cpf', value)
// true | false`,
    },
  ];
}

function parsePattern(text: string) {
  const trimmed = text.trim();
  if (trimmed.startsWith("[")) {
    const parsed = JSON.parse(trimmed);
    if (
      Array.isArray(parsed) &&
      parsed.every((item) => typeof item === "string")
    )
      return parsed as string[];
  }
  return trimmed;
}

function printPattern(pattern: string | string[]) {
  return Array.isArray(pattern) ? JSON.stringify(pattern, null, 2) : pattern;
}

function stringify(value: unknown) {
  if (value instanceof Date)
    return Number.isNaN(value.getTime())
      ? "Invalid Date"
      : value.toISOString().slice(0, 10);
  if (value === null) return "null";
  if (value === undefined) return "undefined";
  return String(value);
}

function highlightCode(code: string) {
  const tokenPattern =
    /(\/\/.*|\/\*[\s\S]*?\*\/|`(?:\\.|[^`])*`|'(?:\\.|[^'])*'|"(?:\\.|[^"])*"|<\/?[A-Z][A-Za-z0-9.]*\b|<\/?[a-z][A-Za-z0-9-]*\b|\b(?:import|from|export|const|let|return|if|else|true|false|null|undefined|new|function|type|interface|class|get|as|extends|public|private|readonly)\b|\b(?:maskara|raw|when|includes|startsWith|define|defineSlot|create|is|hint|patternLength|rawLength|validate|transform|on|Number|Date|String|console|log|useState|useMemo|useEffect|useForm|useMaskara|useMaskaraEngine|MaskaraProvider|inputProps|computed|ref|z|yup|Component|TextInput|View|Text)\b|\b\d+(?:\.\d+)?\b)/g;
  const nodes = [];
  let lastIndex = 0;

  for (const match of code.matchAll(tokenPattern)) {
    const token = match[0];
    const index = match.index ?? 0;
    if (index > lastIndex)
      nodes.push(
        <span key={`plain-${index}`}>{code.slice(lastIndex, index)}</span>,
      );

    const className = (() => {
      if (token.startsWith("//") || token.startsWith("/*"))
        return "text-[#7f9b91]";
      if (
        token.startsWith("'") ||
        token.startsWith('"') ||
        token.startsWith("`")
      )
        return "text-language-expr";
      if (token.startsWith("<")) return "text-language-slot";
      if (/^\d/.test(token)) return "text-[#b9a7ff]";
      if (
        /^(import|from|export|const|let|return|if|else|true|false|null|undefined|new|function|type|interface|class|get|as|extends|public|private|readonly)$/.test(
          token,
        )
      )
        return "text-[#88d8ff]";
      return "text-[#f28c72]";
    })();

    nodes.push(
      <span className={className} key={`${className}-${index}`}>
        {token}
      </span>,
    );
    lastIndex = index + token.length;
  }

  if (lastIndex < code.length)
    nodes.push(<span key="tail">{code.slice(lastIndex)}</span>);
  return nodes;
}

function CodeBlock({
  code,
  className = "",
}: {
  code: string;
  className?: string;
}) {
  return (
    <pre className={cn(codePanelClass, className)}>{highlightCode(code)}</pre>
  );
}

function patternBlockClass(kind: BlockKind) {
  const base =
    "inline-flex min-h-7 items-center rounded-md px-2.5 font-mono text-xs font-black";
  if (kind === "slot")
    return cn(base, "bg-language-slot text-[var(--language-slot-ink)]");
  if (kind === "literal")
    return cn(base, "bg-language-literal text-[var(--language-literal-ink)]");
  if (kind === "expr")
    return cn(base, "bg-language-expr text-[var(--language-expr-ink)]");
  if (kind === "name") return cn(base, "bg-teal text-ink-contrast");
  return cn(base, "bg-coral text-white");
}

function tokenizePattern(
  pattern: string,
): Array<{ kind: BlockKind; value: string }> {
  const blocks: Array<{ kind: BlockKind; value: string }> = [];
  let i = 0;
  while (i < pattern.length) {
    const ch = pattern[i];
    if (ch === "[") {
      const close = pattern.indexOf("]", i);
      blocks.push({
        kind: "literal",
        value: close === -1 ? pattern.slice(i) : pattern.slice(i, close + 1),
      });
      i = close === -1 ? pattern.length : close + 1;
      continue;
    }
    if (ch === "{") {
      const close = pattern.indexOf("}", i);
      blocks.push({
        kind: "expr",
        value: close === -1 ? pattern.slice(i) : pattern.slice(i, close + 1),
      });
      i = close === -1 ? pattern.length : close + 1;
      continue;
    }
    blocks.push({
      kind: maskara.slots().includes(ch) ? "slot" : "literal",
      value: ch,
    });
    i += 1;
  }
  return blocks;
}

function visualPatterns(patternText: string, locale: Locale) {
  const trimmed = patternText.trim();
  if (trimmed in namedPatterns) {
    return [
      {
        label: `name: ${trimmed}`,
        blocks: [{ kind: "name" as const, value: trimmed }],
      },
      {
        label: locale === "pt-BR" ? "pattern registrado" : "registered pattern",
        blocks: tokenizePattern(printPattern(namedPatterns[trimmed])),
      },
    ];
  }
  try {
    const parsed = parsePattern(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.map((pattern, index) => ({
        label: `pattern ${index + 1}`,
        blocks: tokenizePattern(pattern),
      }));
    }
  } catch {
    return [
      {
        label: "pattern",
        blocks: [
          {
            kind: "pattern" as const,
            value:
              locale === "pt-BR" ? "array JSON invalido" : "invalid JSON array",
          },
        ],
      },
    ];
  }
  return [{ label: "pattern", blocks: tokenizePattern(trimmed) }];
}

function PatternVisualizer({
  patternText,
  locale,
}: {
  patternText: string;
  locale: Locale;
}) {
  const groups = useMemo(
    () => visualPatterns(patternText, locale),
    [locale, patternText],
  );
  const title = locale === "pt-BR" ? "Mapa do pattern" : "Pattern map";
  return (
    <div
      className="rounded-xl border border-line bg-[linear-gradient(135deg,var(--surface-soft),color-mix(in_srgb,var(--language-slot-bg)_16%,var(--surface)))] p-4 shadow-[inset_0_1px_0_rgb(255_255_255_/_35%)]"
      aria-label={title}
    >
      <div className="mb-3.5 flex items-center justify-between gap-3">
        <strong className="text-ink">{title}</strong>
        <div className="flex flex-wrap gap-1.5">
          <span className={patternBlockClass("slot")}>slot</span>
          <span className={patternBlockClass("literal")}>literal</span>
          <span className={patternBlockClass("expr")}>expr</span>
        </div>
      </div>
      <div className="grid gap-3">
        {groups.map((group) => (
          <div className="grid gap-2" key={group.label}>
            <span className="text-xs font-black uppercase text-muted">
              {group.label}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {group.blocks.map((block, index) => (
                <span
                  className={patternBlockClass(block.kind)}
                  key={`${block.value}-${index}`}
                >
                  {block.value || "empty"}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function SectionHeading({
  eyebrow,
  title,
  text,
  compact = false,
}: {
  eyebrow: string;
  title: string;
  text?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={cn(sectionHeadingClass, compact ? "mb-[18px]" : "mb-[26px]")}
    >
      <span className={eyebrowClass}>{eyebrow}</span>
      <h2 className={sectionTitleClass}>{title}</h2>
      {text ? <p className={sectionTextClass}>{text}</p> : null}
    </div>
  );
}

function InstallCommands({ locale }: { locale: Locale }) {
  const t = content[locale].install;
  const [copied, setCopied] = useState("");
  const commands = [
    ["npm", "npm install maskarajs"],
    ["yarn", "yarn add maskarajs"],
    ["pnpm", "pnpm add maskarajs"],
  ] as const;

  async function copyCommand(command: string) {
    await navigator.clipboard.writeText(command);
    setCopied(command);
    window.setTimeout(() => setCopied(""), 1400);
  }

  return (
    <div
      className="mt-6 grid gap-3 rounded-lg border border-line bg-surface/90 p-3 shadow-maskara-soft sm:grid-cols-[0.9fr_1.1fr]"
      aria-label={t.eyebrow}
    >
      <div className="grid content-center gap-2 text-left">
        <span className={eyebrowClass}>{t.eyebrow}</span>
        <strong className="text-lg text-ink">{t.title}</strong>
        <p className="m-0 text-sm leading-[1.45] text-muted">{t.text}</p>
      </div>
      <div className="grid gap-2">
        {commands.map(([manager, command]) => (
          <button
            className="grid min-w-0 grid-cols-[58px_minmax(0,1fr)_auto] items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-left shadow-[0_8px_22px_var(--shadow-soft)] transition duration-200 hover:-translate-y-0.5 hover:border-teal"
            type="button"
            key={manager}
            onClick={() => copyCommand(command)}
            aria-label={`${t.copy}: ${command}`}
          >
            <span className="text-xs font-black uppercase text-teal-dark">
              {manager}
            </span>
            <code className="block overflow-hidden bg-transparent p-0 text-[13px] text-ellipsis whitespace-nowrap">
              {command}
            </code>
            <small className="whitespace-nowrap text-[11px] font-black text-muted">
              {copied === command ? t.copied : t.copy}
            </small>
          </button>
        ))}
      </div>
    </div>
  );
}

function Playground({
  locale,
  presets,
}: {
  locale: Locale;
  presets: Preset[];
}) {
  const t = content[locale].playground;
  const [activePreset, setActivePreset] = useState(0);
  const [inputValue, setInputValue] = useState(
    maskara(presets[0].pattern, presets[0].value),
  );
  const preset = presets[activePreset];
  const patternText = printPattern(preset.pattern);
  const result = useMemo(() => {
    try {
      const masked = maskara(preset.pattern, inputValue);
      const raw = maskara.raw(preset.pattern, inputValue);
      return {
        ok: true as const,
        masked,
        raw,
        complete: maskara.is(preset.pattern, inputValue),
        hint: maskara.hint(preset.pattern),
        filled: maskara.rawLength(preset.pattern, inputValue),
        total: maskara.patternLength(preset.pattern),
      };
    } catch (error) {
      return {
        ok: false as const,
        message: error instanceof Error ? error.message : t.invalid,
      };
    }
  }, [inputValue, preset.pattern, t.invalid]);
  const progress =
    result.ok && result.total > 0
      ? Math.min(100, (result.masked.length / result.total) * 100)
      : 0;

  function selectPreset(index: number) {
    setActivePreset(index);
    setInputValue(maskara(presets[index].pattern, presets[index].value));
  }

  return (
    <section className={cn(shell, "py-10 sm:py-12")} id="playground">
      <div className={softBand}>
        <SectionHeading eyebrow={t.eyebrow} title={t.title} text={t.text} />
        <div
          className={cn(
            borderedPanel,
            "grid overflow-hidden lg:grid-cols-[minmax(320px,0.76fr)_minmax(0,1fr)]",
          )}
        >
          <div className="min-w-0 border-b border-line bg-[color-mix(in_srgb,var(--surface-soft)_48%,var(--surface))] p-4 lg:border-r lg:border-b-0">
            <div
              className="mb-4 grid grid-cols-1 gap-2 sm:grid-cols-2"
              aria-label="Presets"
            >
              {presets.map((item, index) => (
                <button
                  key={item.name}
                  type="button"
                  className={cn(
                    "min-h-24 rounded-lg border border-line bg-surface p-3 text-left text-ink transition duration-200 hover:-translate-y-0.5 hover:border-teal",
                    activePreset === index &&
                    "border-teal bg-[color-mix(in_srgb,var(--teal)_14%,var(--surface))] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--teal)_28%,transparent)]",
                  )}
                  aria-pressed={activePreset === index}
                  onClick={() => selectPreset(index)}
                >
                  <strong className="block">{item.name}</strong>
                  <span className="mt-1 block text-xs leading-[1.35] text-muted">
                    {item.description}
                  </span>
                </button>
              ))}
            </div>
            <div className="mb-3.5 grid gap-2 text-left">
              <span className="text-[13px] font-bold text-ink">
                {t.pattern}
              </span>
              <code className="block [overflow-wrap:anywhere]">
                {patternText}
              </code>
            </div>
            <label className={fieldClass}>
              <span>{t.input}</span>
              <input
                className={cn(inputClass, "min-h-16 text-[22px] font-black")}
                value={inputValue}
                placeholder={result.ok ? result.hint : t.typeValue}
                onChange={(event) =>
                  setInputValue(maskara(preset.pattern, event.target.value))
                }
              />
            </label>
          </div>
          <div className="grid min-w-0 content-start gap-4 p-4">
            <PatternVisualizer patternText={patternText} locale={locale} />
            <div
              className="h-2.5 overflow-hidden rounded-full bg-[color-mix(in_srgb,var(--line)_64%,var(--surface))]"
              aria-label="progress"
            >
              <span
                className="block h-full rounded-full bg-gradient-to-r from-teal to-amber"
                style={{ width: `${progress}%` }}
              />
            </div>
            {result.ok ? (
              <ResultGrid result={result} />
            ) : (
              <ErrorBox title={t.invalid} message={result.message} />
            )}
            <CodeBlock code={preset.implementation} />
            <CodeBlock
              code={`maskara(${JSON.stringify(patternText)}, '${inputValue}')\n// ${result.ok ? result.masked || '""' : t.fixPattern}\n\nmaskara.raw(pattern, value)\n// ${result.ok ? stringify(result.raw) || '""' : "-"}`}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function ResultGrid({
  result,
}: {
  result: {
    masked?: string;
    raw?: unknown;
    complete?: boolean;
    hint?: string;
    filled?: number;
    total?: number;
  };
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {[
        ["masked", result.masked || '""'],
        ["raw", stringify(result.raw) || '""'],
        ["hint", result.hint || '""'],
        ["complete", String(result.complete)],
        ["pattern length", result.total],
        ["raw length", result.filled],
      ].map(([label, value]) => (
        <output
          className="grid gap-1 rounded-lg border border-line bg-surface-soft p-3"
          key={label}
        >
          <span className="text-[11px] font-black uppercase text-muted">
            {label}
          </span>
          <code className="block bg-transparent p-0 font-mono text-sm font-black text-ink">
            {value}
          </code>
        </output>
      ))}
    </div>
  );
}

function ErrorBox({ title, message }: { title: string; message: string }) {
  return (
    <div className="grid gap-2 rounded-lg border border-coral bg-[color-mix(in_srgb,var(--coral)_10%,var(--surface))] p-3">
      <strong className="text-coral">{title}</strong>
      <code>{message}</code>
    </div>
  );
}

function CustomLab({ locale }: { locale: Locale }) {
  const t = content[locale].lab;
  const [patternText, setPatternText] = useState("###[.]###[.]###[-]##");
  const [inputValue, setInputValue] = useState("");
  const result = useMemo(() => {
    try {
      const pattern = parsePattern(patternText);
      return {
        ok: true as const,
        masked: maskara(pattern, inputValue),
        raw: maskara.raw(pattern, inputValue),
        complete: maskara.is(pattern, inputValue),
        hint: maskara.hint(pattern),
        total: maskara.patternLength(pattern),
      };
    } catch (error) {
      return {
        ok: false as const,
        message: error instanceof Error ? error.message : t.invalid,
      };
    }
  }, [inputValue, patternText, t.invalid]);
  return (
    <section className={cn(shell, "py-8 sm:py-10")}>
      <div className={warmBand}>
        <SectionHeading eyebrow={t.eyebrow} title={t.title} text={t.text} />
        <div
          className={cn(
            borderedPanel,
            "grid gap-4 p-4 lg:grid-cols-[minmax(320px,0.72fr)_minmax(0,1fr)]",
          )}
        >
          <div className="grid content-start gap-3.5">
            <label className={fieldClass}>
              <span>{t.pattern}</span>
              <textarea
                className={cn(inputClass, "min-h-[138px] resize-y")}
                value={patternText}
                spellCheck={false}
                onChange={(event) => setPatternText(event.target.value)}
              />
            </label>
            <label className={fieldClass}>
              <span>{t.value}</span>
              <input
                className={cn(inputClass, "min-h-16 text-[22px] font-black")}
                value={inputValue}
                placeholder={result.ok ? result.hint : t.fix}
                onChange={(event) => {
                  try {
                    setInputValue(
                      maskara(parsePattern(patternText), event.target.value),
                    );
                  } catch {
                    setInputValue(event.target.value);
                  }
                }}
              />
            </label>
          </div>
          <div className="grid content-start gap-3.5">
            <PatternVisualizer patternText={patternText} locale={locale} />
            {result.ok ? (
              <ResultGrid result={result} />
            ) : (
              <ErrorBox title={t.invalid} message={result.message} />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ExampleGallery({
  locale,
  examples,
}: {
  locale: Locale;
  examples: Example[];
}) {
  const t = content[locale];
  return (
    <section className={cn(shell, "py-10 sm:py-12")}>
      <SectionHeading
        compact
        eyebrow={t.examplesEyebrow}
        title={t.examplesTitle}
      />
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
        {examples.map((example) => {
          const masked = maskara(example.pattern, example.value);
          const raw = maskara.raw(example.pattern, masked);
          return (
            <article
              className={cn(cardClass, "grid content-start gap-3")}
              key={example.title}
            >
              <h3 className="m-0 text-xl text-ink">{example.title}</h3>
              <p className="m-0 text-sm leading-[1.45] text-muted">
                {example.description}
              </p>
              <code className="block [overflow-wrap:anywhere]">
                {printPattern(example.pattern)}
              </code>
              <div className="grid gap-1 border-t border-line pt-2">
                <span className="text-[11px] font-black uppercase text-muted">
                  input
                </span>
                <strong className="text-ink">{example.value}</strong>
              </div>
              <div className="grid gap-1 border-t border-line pt-2">
                <span className="text-[11px] font-black uppercase text-muted">
                  masked
                </span>
                <strong className="text-ink">{masked || '""'}</strong>
              </div>
              <div className="grid gap-1 border-t border-line pt-2">
                <span className="text-[11px] font-black uppercase text-muted">
                  raw
                </span>
                <strong className="text-ink">{stringify(raw) || '""'}</strong>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function ValidateDemo({ locale }: { locale: Locale }) {
  const t = content[locale].recipes;
  const [monthValue, setMonthValue] = useState(maskara("month", "12"));
  const [dateValue, setDateValue] = useState(maskara("dateStrict", "01122025"));
  return (
    <article className={cn(cardClass, "grid gap-4")}>
      <RecipeCopy
        eyebrow="validate()"
        title={t.validateTitle}
        text={t.validateText}
      />
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-2">
          <button
            className={pillButtonClass}
            type="button"
            onClick={() => setMonthValue(maskara("month", "12"))}
          >
            {t.test12}
          </button>
          <button
            className={pillButtonClass}
            type="button"
            onClick={() => setMonthValue(maskara("month", "19"))}
          >
            {t.test19}
          </button>
        </div>
        <label className={fieldClass}>
          <span>month</span>
          <input
            className={inputClass}
            value={monthValue}
            placeholder={maskara.hint("month")}
            onChange={(event) =>
              setMonthValue(maskara("month", event.target.value))
            }
          />
        </label>
        <label className={fieldClass}>
          <span>dateStrict</span>
          <input
            className={inputClass}
            value={dateValue}
            placeholder={maskara.hint("dateStrict")}
            onChange={(event) =>
              setDateValue(maskara("dateStrict", event.target.value))
            }
          />
        </label>
        <MiniResults
          rows={[
            ["month raw", stringify(maskara.raw("month", monthValue)) || '""'],
            ["date raw", stringify(maskara.raw("dateStrict", dateValue))],
          ]}
        />
      </div>
      <CodeBlock code={codeSnippets.validate} />
    </article>
  );
}

function ConditionalDemo({ locale }: { locale: Locale }) {
  const t = content[locale].recipes;
  const [value, setValue] = useState(maskara("smartDocument", "98765432100"));
  const masked = maskara("smartDocument", value);
  const raw = maskara.raw("smartDocument", masked);
  const selected = String(raw).includes("123") ? "CNPJ" : "CPF";

  return (
    <article className={cn(cardClass, "grid gap-4")}>
      <RecipeCopy
        eyebrow="select(raw)"
        title={t.conditionalTitle}
        text={t.conditionalText}
      />
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-2">
          <button
            className={pillButtonClass}
            type="button"
            onClick={() => setValue(maskara("smartDocument", "98765432100"))}
          >
            {t.useCpf}
          </button>
          <button
            className={pillButtonClass}
            type="button"
            onClick={() => setValue(maskara("smartDocument", "12345678000199"))}
          >
            {t.useCnpjTrigger}
          </button>
        </div>
        <label className={fieldClass}>
          <span>{t.value}</span>
          <input
            className={inputClass}
            value={masked}
            placeholder={maskara.hint("smartDocument")}
            onChange={(event) => setValue(maskara("smartDocument", event.target.value))}
          />
        </label>
        <MiniResults rows={[["selected", selected], ["raw", stringify(raw) || '""']]} />
      </div>
      <CodeBlock code={codeSnippets.conditional} />
    </article>
  );
}

function DefineDemo({ locale }: { locale: Locale }) {
  const t = content[locale].recipes;
  const [dateValue, setDateValue] = useState(maskara("date", "01012025"));
  const [moneyValue, setMoneyValue] = useState(maskara("money", "129990"));
  return (
    <article className={cn(cardClass, "grid gap-4")}>
      <RecipeCopy
        eyebrow="maskara.define()"
        title={t.defineTitle}
        text={t.defineText}
      />
      <div className="grid gap-3">
        <label className={fieldClass}>
          <span>date</span>
          <input
            className={inputClass}
            value={dateValue}
            placeholder={maskara.hint("date")}
            onChange={(event) =>
              setDateValue(maskara("date", event.target.value))
            }
          />
        </label>
        <label className={fieldClass}>
          <span>money</span>
          <input
            className={inputClass}
            value={moneyValue}
            placeholder={maskara.hint("money")}
            onChange={(event) =>
              setMoneyValue(maskara("money", event.target.value))
            }
          />
        </label>
        <MiniResults
          rows={[
            ["raw date", stringify(maskara.raw("date", dateValue))],
            ["raw money", stringify(maskara.raw("money", moneyValue))],
          ]}
        />
      </div>
      <CodeBlock code={codeSnippets.define} />
    </article>
  );
}

function CreateDemo({ locale }: { locale: Locale }) {
  const t = content[locale].recipes;
  const [registry, setRegistry] = useState<RegistryName>("BR");
  const [name, setName] = useState("cpf");
  const [value, setValue] = useState(maskaraBR("cpf", "12345678909"));
  const currentMask = registry === "BR" ? maskaraBR : maskaraUS;
  const names = currentMask.names();
  const maskedValue = currentMask(name, value);
  const rawValue = currentMask.raw(name, maskedValue);
  function changeRegistry(nextRegistry: RegistryName) {
    const nextMask = nextRegistry === "BR" ? maskaraBR : maskaraUS;
    const nextName = nextMask.names()[0];
    setRegistry(nextRegistry);
    setName(nextName);
    setValue(
      nextMask(nextName, nextRegistry === "BR" ? "12345678909" : "123456789"),
    );
  }
  return (
    <article className={cn(cardClass, "grid gap-4")}>
      <RecipeCopy
        eyebrow="maskara.create()"
        title={t.createTitle}
        text={t.createText}
      />
      <div className="grid gap-3">
        <div className="grid grid-cols-2 gap-2">
          {(["BR", "US"] as RegistryName[]).map((item) => (
            <button
              className={cn(
                pillButtonClass,
                registry === item && activePillClass,
              )}
              key={item}
              type="button"
              aria-pressed={registry === item}
              onClick={() => changeRegistry(item)}
            >
              {item}
            </button>
          ))}
        </div>
        <label className={fieldClass}>
          <span>{t.named}</span>
          <select
            className={inputClass}
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setValue(currentMask(event.target.value, ""));
            }}
          >
            {names.map((maskName) => (
              <option key={maskName} value={maskName}>
                {maskName}
              </option>
            ))}
          </select>
        </label>
        <label className={fieldClass}>
          <span>{t.value}</span>
          <input
            className={inputClass}
            value={maskedValue}
            placeholder={currentMask.hint(name)}
            onChange={(event) =>
              setValue(currentMask(name, event.target.value))
            }
          />
        </label>
        <MiniResults
          rows={[
            ["masked", maskedValue || '""'],
            ["raw", stringify(rawValue) || '""'],
          ]}
        />
      </div>
      <CodeBlock code={codeSnippets.create} />
    </article>
  );
}

function CustomSlotsDemo({ locale }: { locale: Locale }) {
  const t = content[locale].recipes;
  const [globalValue, setGlobalValue] = useState(maskara("NNN[-]NN", "12345"));
  const [hexValue, setHexValue] = useState(teamMaskara("HHHHHH", "1a2b3c"));
  const [vowelValue, setVowelValue] = useState(teamMaskara("VVV", "maskarajs"));
  return (
    <article className={cn(cardClass, "grid gap-4 lg:col-span-2")}>
      <RecipeCopy
        eyebrow="defineSlot()"
        title={t.slotsTitle}
        text={t.slotsText}
      />
      <div className="grid gap-3">
        <label className={fieldClass}>
          <span>{locale === "pt-BR" ? "Global" : "Global"}: NNN[-]NN</span>
          <input
            className={inputClass}
            value={globalValue}
            placeholder={maskara.hint("NNN[-]NN")}
            onChange={(event) =>
              setGlobalValue(maskara("NNN[-]NN", event.target.value))
            }
          />
        </label>
        <label className={fieldClass}>
          <span>{locale === "pt-BR" ? "Instancia" : "Instance"}: HHHHHH</span>
          <input
            className={inputClass}
            value={hexValue}
            placeholder={teamMaskara.hint("HHHHHH")}
            onChange={(event) =>
              setHexValue(teamMaskara("HHHHHH", event.target.value))
            }
          />
        </label>
        <label className={fieldClass}>
          <span>{locale === "pt-BR" ? "Instancia" : "Instance"}: VVV</span>
          <input
            className={inputClass}
            value={vowelValue}
            placeholder={teamMaskara.hint("VVV")}
            onChange={(event) =>
              setVowelValue(teamMaskara("VVV", event.target.value))
            }
          />
        </label>
        <MiniResults
          rows={[
            [t.globalSlots, maskara.slots().join(" ")],
            [t.instanceSlots, teamMaskara.slots().join(" ")],
          ]}
        />
      </div>
      <CodeBlock code={codeSnippets.slots} />
    </article>
  );
}

function BrazilPresetsDemo({ locale }: { locale: Locale }) {
  const copy =
    locale === "pt-BR"
      ? {
        title:
          "Comece com CPF, CNPJ, CEP, telefone, data e dinheiro prontos.",
        text: "O pacote maskarajs/presets/br entrega um conjunto oficial para criar uma instancia isolada com as mascaras brasileiras mais comuns.",
        named: "Preset",
        value: "Valor",
      }
      : {
        title:
          "Start with CPF, CNPJ, ZIP, phone, date, and money ready to use.",
        text: "The maskarajs/presets/br package gives you an official set for creating an isolated instance with common Brazilian masks.",
        named: "Preset",
        value: "Value",
      };
  const options = [
    ["cpf", "12345678909"],
    ["cnpj", "11222333000181"],
    ["phone", "11987654321"],
    ["cep", "01310930"],
  ] as const;
  const [name, setName] = useState<(typeof options)[number][0]>("cpf");
  const [value, setValue] = useState(maskaraBR(name, options[0][1]));
  const masked = maskaraBR(name, value);
  const raw = maskaraBR.raw(name, masked);

  function changePreset(nextName: (typeof options)[number][0]) {
    const nextValue =
      options.find(([option]) => option === nextName)?.[1] ?? "";
    setName(nextName);
    setValue(maskaraBR(nextName, nextValue));
  }

  return (
    <article className={cn(cardClass, "grid gap-4")}>
      <RecipeCopy eyebrow="presets/br" title={copy.title} text={copy.text} />
      <div className="grid gap-3">
        <label className={fieldClass}>
          <span>{copy.named}</span>
          <select
            className={inputClass}
            value={name}
            onChange={(event) =>
              changePreset(event.target.value as (typeof options)[number][0])
            }
          >
            {options.map(([option]) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </label>
        <label className={fieldClass}>
          <span>{copy.value}</span>
          <input
            className={inputClass}
            value={masked}
            placeholder={maskaraBR.hint(name)}
            onChange={(event) => setValue(maskaraBR(name, event.target.value))}
          />
        </label>
        <MiniResults
          rows={[
            ["masked", masked || '""'],
            ["raw", stringify(raw) || '""'],
          ]}
        />
      </div>
      <CodeBlock code={codeSnippets.brPresets} />
    </article>
  );
}

function RecipeCopy({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <div className="grid gap-2.5">
      <span className="font-mono text-xs font-black text-teal">{eyebrow}</span>
      <h3 className="m-0 text-2xl leading-[1.05] text-ink">{title}</h3>
      <p className="m-0 leading-[1.5] text-muted">{text}</p>
    </div>
  );
}

function MiniResults({ rows }: { rows: Array<[string, string]> }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {rows.map(([label, value]) => (
        <output
          className="grid gap-1 rounded-lg border border-line bg-surface-soft p-3"
          key={label}
        >
          <span className="text-[11px] font-black uppercase text-muted">
            {label}
          </span>
          <code className="bg-transparent p-0 text-ink">{value}</code>
        </output>
      ))}
    </div>
  );
}

function SyntaxIntro({ locale }: { locale: Locale }) {
  const t = content[locale].syntax;
  return (
    <section className={cn(shell, "py-8 sm:py-10")}>
      <div className={calmBand}>
        <SectionHeading
          compact
          eyebrow={t.eyebrow}
          title={t.title}
          text={t.text}
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          {t.rows.map(([name, title, kind, description]) => (
            <article
              className={cn(
                "grid min-h-[150px] content-start gap-2 rounded-lg border p-4 shadow-maskara-soft",
                kind === "slot" &&
                "border-[var(--language-slot-line)] bg-[linear-gradient(180deg,var(--language-slot-soft),var(--surface))]",
                kind === "literal" &&
                "border-[var(--language-literal-line)] bg-[linear-gradient(180deg,var(--language-literal-soft),var(--surface))]",
                kind === "expr" &&
                "border-[var(--language-expr-line)] bg-[linear-gradient(180deg,var(--language-expr-soft),var(--surface))]",
                kind === "custom" &&
                "border-[#b5c6e8] bg-[linear-gradient(180deg,color-mix(in_srgb,#6b8cff_12%,var(--surface)),var(--surface))]",
              )}
              key={name}
            >
              <code
                className={cn(
                  "flex min-h-[34px] w-fit items-center rounded-md px-2.5 py-0 font-mono text-[15px] font-black",
                  kind === "slot" &&
                  "bg-language-slot text-[var(--language-slot-ink)]",
                  kind === "literal" &&
                  "bg-language-literal text-[var(--language-literal-ink)]",
                  kind === "expr" &&
                  "bg-language-expr text-[var(--language-expr-ink)]",
                  kind === "custom" && "bg-[#dce7ff] text-[#162c63]",
                )}
              >
                {name}
              </code>
              <strong className="text-[15px] text-ink">{title}</strong>
              <span className="text-[13px] leading-[1.4] text-muted">
                {description}
              </span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function WhyMaskSection({ locale }: { locale: Locale }) {
  const t = content[locale].why;
  return (
    <section className={section}>
      <div className={calmBand}>
        <SectionHeading eyebrow={t.eyebrow} title={t.title} text={t.text} />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {t.reasons.map(([title, text], index) => (
            <article className={cn(cardClass, "grid gap-2")} key={title}>
              <span className="font-mono text-xs font-black text-teal">
                {String(index + 1).padStart(2, "0")}
              </span>
              <h3 className="m-0 text-xl text-ink">{title}</h3>
              <p className="m-0 leading-[1.5] text-muted">{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function BenchmarkSection({ locale }: { locale: Locale }) {
  const t = content[locale].benchmark;
  return (
    <section className={section} id="benchmark">
      <div className={warmBand}>
        <SectionHeading eyebrow={t.eyebrow} title={t.title} text={t.text} />
        <div className="grid gap-3 md:grid-cols-3">
          {t.rows.map(([name, ops, note]) => (
            <article className={cardClass} key={name}>
              <span className="font-mono text-xs font-black uppercase text-muted">
                {name}
              </span>
              <strong className="mt-2 block text-3xl text-ink">{ops}</strong>
              <p className="m-0 mt-2 leading-[1.45] text-muted">{note}</p>
            </article>
          ))}
        </div>
        <CodeBlock
          className="mt-4"
          code={`const iterations = 200000\nfor (let i = 0; i < iterations; i++) {\n  maskara('###[.]###[.]###[-]##', '12345678909')\n}`}
        />
      </div>
    </section>
  );
}

function ApiDocsSection({ locale }: { locale: Locale }) {
  const t = content[locale].api;
  const topics = useMemo(() => buildDocumentation(locale), [locale]);
  const [activeId, setActiveId] = useState(topics[0].id);
  const activeTopic =
    topics.find((topic) => topic.id === activeId) ?? topics[0];
  return (
    <section className={section} id="docs">
      <div className={softBand}>
        <SectionHeading eyebrow={t.eyebrow} title={t.title} text={t.text} />
        <div className="mb-4 grid gap-3 md:grid-cols-3">
          {t.flow.map(([title, text]) => (
            <div className={cardClass} key={title}>
              <strong className="block text-ink">{title}</strong>
              <span className="mt-1 block text-sm leading-[1.45] text-muted">
                {text}
              </span>
            </div>
          ))}
        </div>
        <div
          className={cn(
            borderedPanel,
            "grid overflow-hidden lg:grid-cols-[260px_minmax(0,1fr)]",
          )}
        >
          <nav
            className="grid content-start gap-2 border-b border-line p-3 lg:border-r lg:border-b-0"
            aria-label={
              locale === "pt-BR" ? "Menu da documentacao" : "Documentation menu"
            }
          >
            {topics.map((topic) => (
              <button
                className={cn(
                  "rounded-lg border border-line bg-surface p-3 text-left",
                  activeTopic.id === topic.id &&
                  "border-teal bg-[color-mix(in_srgb,var(--teal)_12%,var(--surface))]",
                )}
                key={topic.id}
                type="button"
                aria-pressed={activeTopic.id === topic.id}
                onClick={() => setActiveId(topic.id)}
              >
                <span className="block font-mono text-[11px] font-black uppercase text-teal">
                  {topic.eyebrow}
                </span>
                <strong className="mt-1 block text-sm text-ink">
                  {topic.menu}
                </strong>
              </button>
            ))}
          </nav>
          <article className="grid gap-4 p-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)]">
            <div className="grid content-start gap-3">
              <span className="w-fit rounded-full bg-language-slot px-2.5 py-1 font-mono text-xs font-black text-[var(--language-slot-ink)]">
                {activeTopic.eyebrow}
              </span>
              <h3 className="m-0 text-[clamp(26px,3vw,40px)] leading-none text-ink">
                {activeTopic.title}
              </h3>
              <p className="m-0 leading-[1.55] text-muted">
                {activeTopic.description}
              </p>
              <ul className="m-0 grid gap-2 pl-5 text-muted">
                {activeTopic.bullets.map((bullet) => (
                  <li className="pl-1" key={bullet}>
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>
            <CodeBlock code={activeTopic.code} />
          </article>
        </div>
      </div>
    </section>
  );
}

function ReactFormsSection({ locale }: { locale: Locale }) {
  const t = content[locale].reactForms;
  const examples = buildHookExamples(locale);

  return (
    <section className={section} id="react-forms">
      <div className={calmBand}>
        <SectionHeading eyebrow={t.eyebrow} title={t.title} text={t.text} />
        <div className="grid gap-3">
          {examples.map((example, index) => (
            <article
              className={cn(
                cardClass,
                "grid gap-4 lg:grid-cols-[320px_minmax(0,1fr)]",
                example.soon && "opacity-75",
              )}
              key={`${example.framework}-${example.title}`}
            >
              <div className="grid content-start gap-2.5">
                <span className={eyebrowClass}>
                  {String(index + 1).padStart(2, "0")} · {example.framework}
                </span>
                <h3 className="m-0 text-3xl leading-none text-ink">
                  {example.title}
                </h3>
                <p className="m-0 leading-[1.5] text-muted">
                  {example.description}
                </p>
                {example.soon ? (
                  <strong className={eyebrowClass}>{t.soon}</strong>
                ) : null}
              </div>
              {example.code ? (
                <CodeBlock code={example.code} />
              ) : (
                <div className="grid min-h-40 place-items-center rounded-lg border border-dashed border-line bg-surface-soft text-center">
                  <code>{example.title}</code>
                  <span className="text-sm font-black text-muted">
                    {t.soon}
                  </span>
                </div>
              )}
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function App() {
  const [locale, setLocale] = useState<Locale>(
    () =>
      (window.localStorage.getItem("maskarajs-locale") as Locale) || "pt-BR",
  );
  const [theme, setTheme] = useState<Theme>(() => {
    const savedTheme = window.localStorage.getItem("maskarajs-theme");
    return savedTheme === "dark" || savedTheme === "light"
      ? savedTheme
      : "light";
  });
  const [framework, setFramework] = useState<Framework>("React");
  const [donationOpen, setDonationOpen] = useState(false);
  const t = content[locale];
  const presets = useMemo(() => buildPresets(locale), [locale]);
  const examples = useMemo(() => buildExamples(locale), [locale]);

  useEffect(() => {
    window.localStorage.setItem("maskarajs-locale", locale);
  }, [locale]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem("maskarajs-theme", theme);
  }, [theme]);

  useEffect(() => {
    if (window.sessionStorage.getItem("maskarajs-donation-seen")) return;
    const timer = window.setTimeout(() => {
      setDonationOpen(true);
      window.sessionStorage.setItem("maskarajs-donation-seen", "true");
    }, 2200);
    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main
      className="relative isolate overflow-x-clip pb-10 before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:-z-10 before:h-[760px] before:bg-[radial-gradient(circle_at_18%_12%,color-mix(in_srgb,var(--language-slot-bg)_30%,transparent),transparent_30%),radial-gradient(circle_at_86%_8%,color-mix(in_srgb,var(--amber)_28%,transparent),transparent_26%)]"
      id="top"
      data-theme={theme}
    >
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
      <DonationSupport
        locale={locale}
        open={donationOpen}
        onClose={() => setDonationOpen(false)}
      />
      <section
        className={cn(
          shell,
          "grid min-h-[86svh] items-center gap-8 pt-24 pb-8 lg:grid-cols-[minmax(0,0.95fr)_minmax(390px,0.9fr)] lg:pt-20",
        )}
      >
        <div className="grid max-w-[780px] gap-4">
          <p className={eyebrowClass}>{t.hero.eyebrow}</p>
          <h1 className="m-0 max-w-[780px] text-[clamp(54px,7vw,104px)] leading-[0.9] tracking-normal text-ink">
            {t.hero.title}
          </h1>
          <p className="m-0 max-w-[690px] text-[clamp(18px,2vw,22px)] leading-[1.45] text-muted">
            {t.hero.text}
          </p>
          <InstallCommands locale={locale} />
          <div className="flex flex-wrap gap-2.5">
            <a
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-transparent bg-ink px-4 font-bold text-ink-contrast no-underline"
              href="#playground"
            >
              {t.hero.primary}
            </a>
            <a
              className="inline-flex min-h-11 items-center justify-center rounded-lg border border-line bg-surface px-4 font-bold text-ink no-underline"
              href="#benchmark"
            >
              {t.hero.secondary}
            </a>
          </div>
          <div
            className="grid max-w-[760px] grid-cols-1 gap-2.5 sm:grid-cols-3"
            aria-label="Maskarajs"
          >
            {t.hero.stats.map(([title, text]) => (
              <div
                className="rounded-xl border border-line bg-surface/82 p-3 shadow-[0_10px_26px_var(--shadow-soft)] backdrop-blur"
                key={title}
              >
                <strong className="block text-2xl text-ink">{title}</strong>
                <span className="mt-1 block text-xs leading-[1.35] text-muted">
                  {text}
                </span>
              </div>
            ))}
          </div>
        </div>
        <div
          className="grid min-h-[560px] content-start gap-3 rounded-2xl border border-line bg-[linear-gradient(145deg,color-mix(in_srgb,var(--teal)_11%,var(--surface)),var(--surface)_52%,color-mix(in_srgb,var(--amber)_14%,var(--surface)))] p-4 shadow-[0_22px_54px_var(--shadow-soft)]"
          aria-label="Mask example"
        >
          <div
            className="grid min-h-[250px] grid-cols-1 items-end gap-3 md:grid-cols-[1fr_240px]"
            aria-hidden="true"
          >
            <div className="relative grid min-h-[190px] content-center gap-2.5 overflow-hidden rounded-[10px_8px_12px_8px] border-[8px] border-[#6f4a2d] bg-[#12372f] p-[22px_22px_26px] text-[#ecfff7] shadow-[0_22px_44px_rgb(0_0_0_/_24%),inset_0_0_0_2px_rgb(255_255_255_/_8%),inset_0_-18px_36px_rgb(0_0_0_/_14%)] rotate-[-1.2deg]">
              <span className="relative z-[1] w-fit rounded-full bg-language-slot px-2 py-[3px] text-[11px] font-black uppercase text-[var(--language-slot-ink)]">
                pattern
              </span>
              <div
                className="relative z-[1] grid w-[min(100%,430px)] gap-[7px]"
                aria-label="pattern para valor mascarado"
              >
                <div className="flex flex-wrap items-center gap-1 font-mono">
                  <span className="grid min-h-8 min-w-7 place-items-center rounded-[8px_6px_9px_6px] border border-dashed border-language-slot/60 bg-white/5 font-mono text-[clamp(14px,1.6vw,20px)] font-black leading-none text-language-slot animate-[chalk-token-morph_5.8s_ease-in-out_infinite]">
                    #
                  </span>
                  <span className="grid min-h-8 min-w-7 place-items-center rounded-[8px_6px_9px_6px] border border-dashed border-language-slot/60 bg-white/5 font-mono text-[clamp(14px,1.6vw,20px)] font-black leading-none text-language-slot animate-[chalk-token-morph_5.8s_ease-in-out_infinite] [animation-delay:0.08s]">
                    #
                  </span>
                  <span className="grid min-h-8 min-w-7 place-items-center rounded-[8px_6px_9px_6px] border border-dashed border-language-literal/60 bg-white/5 font-mono text-[clamp(14px,1.6vw,20px)] font-black leading-none text-language-literal animate-[chalk-token-morph_5.8s_ease-in-out_infinite] [animation-delay:0.16s]">
                    /
                  </span>
                  <span className="grid min-h-8 min-w-[68px] place-items-center rounded-[8px_6px_9px_6px] border border-dashed border-language-expr/70 bg-white/5 font-mono text-[clamp(14px,1.6vw,20px)] font-black leading-none text-language-expr animate-[chalk-token-morph_5.8s_ease-in-out_infinite] [animation-delay:0.24s]">
                    {"{0-1}"}
                  </span>
                  <span className="grid min-h-8 min-w-7 place-items-center rounded-[8px_6px_9px_6px] border border-dashed border-language-slot/60 bg-white/5 font-mono text-[clamp(14px,1.6vw,20px)] font-black leading-none text-language-slot animate-[chalk-token-morph_5.8s_ease-in-out_infinite] [animation-delay:0.32s]">
                    #
                  </span>
                  <span className="grid min-h-8 min-w-7 place-items-center rounded-[8px_6px_9px_6px] border border-dashed border-language-literal/60 bg-white/5 font-mono text-[clamp(14px,1.6vw,20px)] font-black leading-none text-language-literal animate-[chalk-token-morph_5.8s_ease-in-out_infinite] [animation-delay:0.4s]">
                    /
                  </span>
                  <span className="grid min-h-8 min-w-7 place-items-center rounded-[8px_6px_9px_6px] border border-dashed border-language-slot/60 bg-white/5 font-mono text-[clamp(14px,1.6vw,20px)] font-black leading-none text-language-slot animate-[chalk-token-morph_5.8s_ease-in-out_infinite] [animation-delay:0.48s]">
                    #
                  </span>
                  <span className="grid min-h-8 min-w-7 place-items-center rounded-[8px_6px_9px_6px] border border-dashed border-language-slot/60 bg-white/5 font-mono text-[clamp(14px,1.6vw,20px)] font-black leading-none text-language-slot animate-[chalk-token-morph_5.8s_ease-in-out_infinite] [animation-delay:0.56s]">
                    #
                  </span>
                  <span className="grid min-h-8 min-w-7 place-items-center rounded-[8px_6px_9px_6px] border border-dashed border-language-slot/60 bg-white/5 font-mono text-[clamp(14px,1.6vw,20px)] font-black leading-none text-language-slot animate-[chalk-token-morph_5.8s_ease-in-out_infinite] [animation-delay:0.64s]">
                    #
                  </span>
                  <span className="grid min-h-8 min-w-7 place-items-center rounded-[8px_6px_9px_6px] border border-dashed border-language-slot/60 bg-white/5 font-mono text-[clamp(14px,1.6vw,20px)] font-black leading-none text-language-slot animate-[chalk-token-morph_5.8s_ease-in-out_infinite] [animation-delay:0.72s]">
                    #
                  </span>
                </div>
                <div className="w-fit font-mono text-lg font-black leading-none text-language-slot animate-[chalk-arrow-pulse_5.8s_ease-in-out_infinite]">
                  →
                </div>
                <div className="flex flex-wrap items-center gap-1 font-mono">
                  {["0", "1", "/", "1", "2", "/", "2", "0", "2", "5"].map(
                    (value, index) => (
                      <span
                        className="grid min-h-8 min-w-7 place-items-center rounded-[8px_6px_9px_6px] bg-[#ecfff7] font-mono text-[clamp(14px,1.6vw,20px)] font-black leading-none text-[#0d241f] opacity-0 shadow-[0_0_0_1px_rgb(255_255_255_/_50%),0_8px_20px_rgb(188_235_221_/_20%)] animate-[chalk-value-pop_5.8s_ease-in-out_infinite]"
                        style={{ animationDelay: `${index * 0.08}s` }}
                        key={`${value}-${index}`}
                      >
                        {value}
                      </span>
                    ),
                  )}
                </div>
              </div>
              <small className="relative z-[1] font-mono text-xs text-[#ecfff7]/75">
                raw: 01122025 → 01/12/2025
              </small>
              <i className="absolute bottom-[46px] left-[22px] z-[1] h-0.5 w-[44%] rounded-full bg-[#ecfff7]/60 blur-[0.2px] rotate-[-1deg]" />
              <i className="absolute bottom-[35px] left-[22px] z-[1] h-0.5 w-[28%] rounded-full bg-[#ecfff7]/60 opacity-70 blur-[0.2px] rotate-[1.2deg]" />
            </div>
            <div className="relative grid aspect-square w-[min(235px,100%)] place-items-center justify-self-center rounded-[28px_18px_26px_18px] border border-white/15 bg-[radial-gradient(circle_at_50%_48%,rgb(244_185_66_/_30%),transparent_54%),linear-gradient(145deg,rgb(255_255_255_/_10%),rgb(255_255_255_/_2%))] shadow-[0_24px_60px_rgb(0_0_0_/_24%),inset_0_0_0_1px_rgb(255_255_255_/_8%)] animate-[mascot-float_6s_ease-in-out_infinite]">
              <span className="absolute left-[-12px] top-[12%] z-[2] grid min-h-[34px] min-w-[38px] place-items-center rounded-full border border-white/20 bg-amber px-2.5 font-mono text-[13px] font-black text-[#101917] shadow-[0_12px_24px_rgb(0_0_0_/_18%)] animate-[rune-drift_5.5s_ease-in-out_infinite]">
                #
              </span>
              <span className="absolute right-[-18px] bottom-[30%] z-[2] grid min-h-[34px] min-w-[38px] place-items-center rounded-full border border-white/20 bg-language-slot px-2.5 font-mono text-[13px] font-black text-[#101917] shadow-[0_12px_24px_rgb(0_0_0_/_18%)] animate-[rune-drift_6.4s_ease-in-out_infinite_reverse]">
                {"{N}"}
              </span>
              <span className="absolute bottom-[-12px] left-[18%] z-[2] grid min-h-[34px] min-w-[38px] place-items-center rounded-full border border-white/20 bg-language-literal px-2.5 font-mono text-[13px] font-black text-[#101917] shadow-[0_12px_24px_rgb(0_0_0_/_18%)] animate-[rune-drift_5.8s_ease-in-out_infinite]">
                []
              </span>
              <img
                className="relative z-[1] aspect-square w-[min(230px,86%)] rounded-[22px] object-cover [filter:drop-shadow(0_18px_24px_rgb(0_0_0_/_28%))_saturate(1.08)]"
                src={mascotLogo}
                alt=""
              />
            </div>
          </div>
          <PatternVisualizer patternText="##[/]{0-1}#[/]####" locale={locale} />
          <CodeBlock
            code={`maskara.define('month', {\n  pattern: '{0-1}#',\n  validate: raw => Number(raw) <= 12\n})\n\nmaskara('month', '19') // '1'`}
          />
        </div>
      </section>
      <SyntaxIntro locale={locale} />
      <Playground locale={locale} presets={presets} />
      <CustomLab locale={locale} />
      <ExampleGallery locale={locale} examples={examples} />
      <section className={section} id="implementacao">
        <div className={softBand}>
          <SectionHeading
            eyebrow={t.docs.eyebrow}
            title={t.docs.title}
            text={t.docs.text}
          />
          <div className={cn(borderedPanel, "grid gap-3 p-4")}>
            <div
              className="flex flex-wrap gap-2"
              role="tablist"
              aria-label="Frameworks"
            >
              {(
                [
                  "React",
                  "Vue",
                  "Angular",
                  "React Native",
                  "Vanilla",
                ] as Framework[]
              ).map((item) => (
                <button
                  className={cn(
                    pillButtonClass,
                    framework === item && activePillClass,
                  )}
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
        </div>
      </section>
      <ReactFormsSection locale={locale} />
      <section className={section} id="receitas">
        <div className={warmBand}>
          <SectionHeading
            eyebrow={t.recipes.eyebrow}
            title={t.recipes.title}
            text={t.recipes.text}
          />
          <div className="grid gap-3 lg:grid-cols-2">
            <ValidateDemo locale={locale} />
            <ConditionalDemo locale={locale} />
            <BrazilPresetsDemo locale={locale} />
            <CustomSlotsDemo locale={locale} />
            <DefineDemo locale={locale} />
            <CreateDemo locale={locale} />
          </div>
        </div>
      </section>
      <WhyMaskSection locale={locale} />
      <BenchmarkSection locale={locale} />
      <ApiDocsSection locale={locale} />
      <section className={section}>
        <div
          className={cn(
            softBand,
            "flex flex-col items-start justify-between gap-4 md:flex-row md:items-center",
          )}
        >
          <div>
            <span className={eyebrowClass}>{t.final.eyebrow}</span>
            <h2 className={sectionTitleClass}>{t.final.title}</h2>
          </div>
          <CodeBlock
            className="md:min-w-[360px]"
            code="npm install maskarajs"
          />
        </div>
      </section>
    </main>
  );
}

export default App;

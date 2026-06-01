import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import maskara, { mask, maskara as namedMaskara } from '../src/core/mask.mjs'
import maskaraDirective, { createMaskaraDirective, createMaskaraPlugin, vMaskara } from '../src/adapters/vue/index.mjs'

const require = createRequire(import.meta.url)
const cjsMaskara = require('../src/core/mask.cjs.js')
const cjsVue = require('../src/adapters/vue/index.cjs.js')

const test = (name, fn) => {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (error) {
    console.error(`not ok - ${name}`)
    throw error
  }
}

test('exports default and named aliases', () => {
  assert.equal(maskara, mask)
  assert.equal(maskara, namedMaskara)
  assert.equal(cjsMaskara, cjsMaskara.mask)
  assert.equal(cjsMaskara, cjsMaskara.maskara)
  assert.equal(cjsMaskara, cjsMaskara.default)
  assert.equal(maskaraDirective, vMaskara)
  assert.equal(cjsVue, cjsVue.maskaraDirective)
  assert.equal(cjsVue, cjsVue.default)
})

test('applies a single pattern and strips literals in raw', () => {
  const cpf = '###[.]###[.]###[-]##'
  assert.equal(maskara(cpf, '12345678909'), '123.456.789-09')
  assert.equal(maskara.raw(cpf, '123.456.789-09'), '12345678909')
  assert.equal(maskara.is(cpf, '123.456.789-09'), true)
  assert.equal(maskara.hint(cpf), '000.000.000-00')
  assert.equal(maskara.rawLength(cpf, '123.456'), 6)
  assert.equal(maskara.patternLength(cpf), 14)
})

test('keeps old dynamic string arrays by input size', () => {
  const phone = ['[(]##[)] ####[-]####', '[(]##[)] #####[-]####']
  assert.equal(maskara(phone, '1134567890'), '(11) 3456-7890')
  assert.equal(maskara(phone, '11987654321'), '(11) 98765-4321')
  assert.equal(maskara.patternLength(phone), 15)
})

test('supports expression slots', () => {
  assert.equal(maskara('{4}### #### #### ####', '4111111111111111'), '4111 1111 1111 1111')
  assert.equal(maskara('{4}### #### #### ####', '5111111111111111'), '')
  assert.equal(maskara('{[0-9a-fA-F]}{[0-9a-fA-F]}{[0-9a-fA-F]}', '1z2'), '12')
})

test('supports validate and transform on named masks', () => {
  maskara.define('testMonth', {
    pattern: '{0-1}#',
    validate: (raw, _masked, complete) => !complete || (Number(raw) >= 1 && Number(raw) <= 12),
  })

  maskara.define('testMoney', {
    pattern: '########[,]##',
    transform: raw => Number.parseInt(raw || '0', 10) / 100,
  })

  assert.equal(maskara('testMonth', '12'), '12')
  assert.equal(maskara('testMonth', '19'), '1')
  assert.equal(maskara.raw('testMoney', '1299,90'), 1299.9)

  maskara.undefine('testMonth')
  maskara.undefine('testMoney')
})

test('supports conditional named masks with patterns/select', () => {
  maskara.define('testDocument', {
    patterns: {
      cpf: '###[.]###[.]###[-]##',
      cnpj: '##[.]###[.]###[/]####[-]##',
    },
    select: raw => raw.includes('123') ? 'cnpj' : 'cpf',
  })

  assert.equal(maskara('testDocument', '98765432100'), '987.654.321-00')
  assert.equal(maskara('testDocument', '12345678000199'), '12.345.678/0001-99')
  assert.equal(maskara.raw('testDocument', '12.345.678/0001-99'), '12345678000199')
  assert.equal(maskara.patternLength('testDocument'), 18)
  assert.equal(maskara.is('testDocument', '12.345.678/0001-99'), true)

  maskara.undefine('testDocument')
})

test('throws when conditional select returns an unknown pattern key', () => {
  maskara.define('testBrokenSelect', {
    patterns: { cpf: '###[.]###[.]###[-]##' },
    select: () => 'cnpj',
  })

  assert.throws(() => maskara('testBrokenSelect', '123'), /não existe em patterns/)
  maskara.undefine('testBrokenSelect')
})

test('supports custom slots globally and inside isolated instances', () => {
  maskara.defineSlot('N', { test: ch => /\d/.test(ch), hint: '0' })
  assert.equal(maskara('NNN[-]NN', '12345'), '123-45')
  assert.equal(maskara.hint('NNN[-]NN'), '000-00')
  assert.ok(maskara.slots().includes('N'))
  maskara.undefineSlot('N')

  const forge = maskara.create()
  forge.define('testHexPair', { pattern: 'HH' })
  forge.undefine('testHexPair')
  forge.defineSlot('H', /[0-9a-f]/i)
  forge.defineSlot('V', ch => 'AEIOUaeiou'.includes(ch))
  assert.equal(forge('HHHHHH', '1a2b3c'), '1a2b3c')
  assert.equal(forge('VVV', 'maskarajs'), 'aaa')
})

test('keeps isolated registries separate', () => {
  const br = maskara.create({
    cpf: { pattern: '###[.]###[.]###[-]##' },
    document: {
      patterns: {
        cpf: '###[.]###[.]###[-]##',
        cnpj: '##[.]###[.]###[/]####[-]##',
      },
      select: raw => raw.length > 11 ? 'cnpj' : 'cpf',
    },
  })

  assert.equal(br('cpf', '12345678909'), '123.456.789-09')
  assert.equal(br('document', '11222333000181'), '11.222.333/0001-81')
  assert.equal(maskara.names().includes('cpf'), false)
})

test('binds to DOM-like inputs with maskara.on', () => {
  const listeners = new Map()
  const input = {
    value: '',
    selectionStart: 0,
    addEventListener(type, listener) {
      listeners.set(type, listener)
    },
    removeEventListener(type) {
      listeners.delete(type)
    },
    setSelectionRange(start) {
      this.selectionStart = start
    },
  }

  globalThis.requestAnimationFrame = callback => callback()

  let rawValue = ''
  let maskedValue = ''
  const off = maskara.on(input, '###[.]###[.]###[-]##', {
    onValue: value => { rawValue = value },
    onMaskara: value => { maskedValue = value },
  })

  input.value = '12345678909'
  input.selectionStart = input.value.length
  listeners.get('input')({ target: input })

  assert.equal(input.value, '123.456.789-09')
  assert.equal(rawValue, '12345678909')
  assert.equal(maskedValue, '123.456.789-09')

  off()
  assert.equal(listeners.size, 0)
})

test('provides a Vue 3 directive for v-maskara', () => {
  const listeners = new Map()
  const input = {
    value: '12345678909',
    selectionStart: 11,
    addEventListener(type, listener, options) {
      listeners.set(`${type}:${options === true ? 'capture' : 'bubble'}`, listener)
    },
    removeEventListener(type, listener, options) {
      const key = `${type}:${options === true ? 'capture' : 'bubble'}`
      if (listeners.get(key) === listener) listeners.delete(key)
    },
    setSelectionRange(start) {
      this.selectionStart = start
    },
  }

  let rawValue = ''
  let maskedValue = ''
  const directive = createMaskaraDirective()

  directive.mounted(input, {
    value: {
      pattern: '###[.]###[.]###[-]##',
      onValue: value => { rawValue = value },
      onMaskara: value => { maskedValue = value },
    },
  })

  assert.equal(input.value, '123.456.789-09')
  assert.equal(listeners.has('input:capture'), true)
  assert.equal(listeners.has('keydown:bubble'), true)

  input.value = '98765432100'
  input.selectionStart = input.value.length
  listeners.get('input:capture')({ target: input })

  assert.equal(input.value, '987.654.321-00')
  assert.equal(rawValue, '98765432100')
  assert.equal(maskedValue, '987.654.321-00')

  directive.beforeUnmount(input)
  assert.equal(listeners.size, 0)
})

test('provides a Vue plugin that registers v-maskara by default', () => {
  const calls = []
  const app = {
    directive(name, directive) {
      calls.push([name, directive])
    },
  }

  createMaskaraPlugin().install(app)
  createMaskaraPlugin({ name: 'maskara-br', engine: maskara.create() }).install(app)

  assert.equal(calls[0][0], 'maskara')
  assert.equal(typeof calls[0][1].mounted, 'function')
  assert.equal(calls[1][0], 'maskara-br')
})

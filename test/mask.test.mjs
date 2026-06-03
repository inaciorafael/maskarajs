import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import maskara, { mask, maskara as namedMaskara } from '../src/core/mask.mjs'
import maskaraMin from '../src/core/mask.min.mjs'
import maskaraDirective, { createMaskaraDirective, createMaskaraPlugin, vMaskara } from '../src/adapters/vue/index.mjs'
import payment from '../src/presets/payment.mjs'
import datePreset from '../src/presets/date.mjs'
import br from '../src/presets/br.mjs'

const require = createRequire(import.meta.url)
const cjsMaskara = require('../src/core/mask.cjs.js')
const cjsMaskaraMin = require('../src/core/mask.min.cjs.js')
const cjsVue = require('../src/adapters/vue/index.cjs.js')
const cjsPayment = require('../src/presets/payment.cjs.js')
const cjsDatePreset = require('../src/presets/date.cjs.js')
const cjsBR = require('../src/presets/br.cjs.js')

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
  assert.equal(maskaraMin('###[.]###', '123456'), '123.456')
  assert.equal(cjsMaskaraMin('###[.]###', '123456'), '123.456')
  assert.equal(maskaraDirective, vMaskara)
  assert.equal(cjsVue, cjsVue.maskaraDirective)
  assert.equal(cjsVue, cjsVue.default)
})

test('applies a single pattern and strips literals in raw', () => {
  const cpf = '###[.]###[.]###[-]##'
  assert.equal(maskara(cpf, '12345678909'), '123.456.789-09')
  assert.equal(maskara.raw(cpf, '123.456.789-09'), '12345678909')
  assert.equal(maskara.unmask(cpf, '123.456.789-09'), '12345678909')
  assert.equal(maskara.is(cpf, '123.456.789-09'), true)
  assert.equal(maskara.hint(cpf), '000.000.000-00')
  assert.equal(maskara.rawLength(cpf, '123.456'), 6)
  assert.equal(maskara.patternLength(cpf), 14)
})

test('keeps trailing literals only when all slots are filled', () => {
  const suffix = '###[BR]'
  assert.equal(maskara(suffix, ''), '')
  assert.equal(maskara(suffix, '12'), '12')
  assert.equal(maskara(suffix, '123'), '123BR')
  assert.equal(maskara(suffix, '123B'), '12')
  assert.equal(maskara.raw(suffix, '123BR'), '123')
  assert.equal(maskara.raw(suffix, '123B'), '12')
  assert.equal(maskara.is(suffix, '123B'), false)
  assert.equal(maskara.is(suffix, '123'), true)
  assert.equal(maskara.patternLength(suffix), 5)

  const middle = '##[-]##'
  assert.equal(maskara(middle, '12'), '12')
  assert.equal(maskara(middle, '1234'), '12-34')
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

test('supports apply with rich metadata', () => {
  const cpf = '###[.]###[.]###[-]##'
  assert.deepEqual(maskara.apply(cpf, '12345678909'), {
    value: '123.456.789-09',
    masked: '123.456.789-09',
    raw: '12345678909',
    complete: true,
    hint: '000.000.000-00',
    placeholder: '000.000.000-00',
    rawLength: 11,
    patternLength: 14,
  })

  maskara.define('testApplyMoney', {
    pattern: '########[,]##',
    transform: raw => Number.parseInt(raw || '0', 10) / 100,
  })

  const money = maskara.apply('testApplyMoney', '129990')
  assert.equal(money.masked, '129990')
  assert.equal(money.value, money.masked)
  assert.equal(money.raw, 1299.9)
  assert.equal(money.complete, false)
  assert.equal(money.hint, '00000000,00')
  assert.equal(money.placeholder, money.hint)
  assert.equal(money.rawLength, 6)
  assert.equal(money.patternLength, 11)

  maskara.undefine('testApplyMoney')
})

test('explains patterns for playgrounds and docs', () => {
  const explanation = maskara.explain('###[.]##{0-9}')

  assert.equal(explanation.hint, '000.000')
  assert.equal(explanation.rawLength, 6)
  assert.equal(explanation.patternLength, 7)
  assert.equal(explanation.variants.length, 1)
  assert.deepEqual(explanation.variants[0].tokens.map(token => token.type), [
    'slot',
    'slot',
    'slot',
    'literal',
    'slot',
    'slot',
    'expression',
  ])
  assert.deepEqual(explanation.variants[0].tokens[3], {
    type: 'literal',
    index: 3,
    value: '.',
    length: 1,
  })
})

test('provides reusable transform helpers', () => {
  maskara.define('testTransformCents', {
    pattern: '########[,]##',
    transform: maskara.transforms.cents,
  })

  maskara.define('testTransformDate', {
    pattern: '##[/]##[/]####',
    transform: maskara.transforms.dateBR,
  })

  maskara.define('testTransformParts', {
    pattern: '##[/]##[/]####',
    transform: maskara.transforms.parts({
      day: [0, 2],
      month: [2, 4],
      year: [4, 8],
    }),
  })

  assert.equal(maskara.raw('testTransformCents', '129990'), 1299.9)
  assert.equal(maskara.raw('testTransformDate', '31/12/2026')?.getFullYear(), 2026)
  assert.equal(maskara.raw('testTransformDate', '31/02/2026'), null)
  assert.deepEqual(maskara.raw('testTransformParts', '31/12/2026'), {
    raw: '31122026',
    masked: '31/12/2026',
    complete: true,
    day: '31',
    month: '12',
    year: '2026',
  })

  maskara.undefine('testTransformCents')
  maskara.undefine('testTransformDate')
  maskara.undefine('testTransformParts')
})

test('supports field helpers for lightweight form state', () => {
  const field = maskara.field('###[.]###[.]###[-]##', '123')
  assert.equal(field.value, '123')
  assert.equal(field.placeholder, '000.000.000-00')
  assert.equal(field.complete, false)
  assert.equal(field.inputProps.value, '123')

  const result = field.set('12345678909')
  assert.equal(result.value, '123.456.789-09')
  assert.equal(field.raw, '12345678909')
  assert.equal(field.complete, true)

  const event = { target: { value: '98765432100' } }
  field.onChange(event)
  assert.equal(event.target.value, '987.654.321-00')
  assert.equal(field.value, '987.654.321-00')

  field.reset()
  assert.equal(field.value, '')

  const masks = maskara.create({
    money: {
      pattern: '########[,]##',
      transform: raw => Number.parseInt(raw || '0', 10) / 100,
    },
  })
  const money = masks.field('money')
  money.onInput('129990')
  assert.equal(money.raw, 1299.9)
})

test('supports check with form-friendly reasons', () => {
  const cpf = '###[.]###[.]###[-]##'
  assert.equal(maskara.check(cpf, '').reason, 'empty')
  assert.equal(maskara.check(cpf, '123').reason, 'incomplete')
  assert.equal(maskara.check(cpf, '12345678909').valid, true)
  assert.equal(maskara.check(cpf, 'abc').reason, 'invalid')

  maskara.define('testCheckMonth', {
    pattern: '{0-1}#',
    validate: (raw, _masked, complete) => !complete || (Number(raw) >= 1 && Number(raw) <= 12),
  })

  const invalidMonth = maskara.check('testCheckMonth', '19')
  assert.equal(invalidMonth.valid, false)
  assert.equal(invalidMonth.reason, 'invalid')
  assert.equal(invalidMonth.masked, '1')

  const masks = maskara.create({
    month: {
      pattern: '{0-1}#',
      validate: (raw, _masked, complete) => !complete || (Number(raw) >= 1 && Number(raw) <= 12),
    },
  })
  assert.equal(masks.check('month', '12').reason, 'complete')

  maskara.undefine('testCheckMonth')
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
  assert.equal(br.unmask('cpf', '123.456.789-09'), '12345678909')
  assert.equal(maskara.names().includes('cpf'), false)
})

test('supports strict mode on isolated instances', () => {
  const loose = maskara.create()
  const strict = maskara.create({}, { strict: true })

  assert.equal(loose('###', '1a2'), '12')
  assert.equal(strict('###', '1a2'), '1')
  assert.equal(strict.raw('###', '1a2'), '1')
  assert.equal(strict.check('###', '1a2').reason, 'invalid')

  const strictMonth = maskara.create({
    month: {
      pattern: '{0-1}#',
      validate: (raw, _masked, complete) => !complete || (Number(raw) >= 1 && Number(raw) <= 12),
    },
  }, { strict: true })

  assert.equal(strictMonth('month', '19'), '1')
  assert.equal(strictMonth.check('month', '19').reason, 'invalid')
})

test('provides optional payment and date presets', () => {
  assert.equal(cjsPayment.default, cjsPayment.payment)
  assert.equal(cjsDatePreset.default, cjsDatePreset.date)
  assert.equal(cjsBR.default, cjsBR.br)

  const pay = maskara.create(payment)
  assert.equal(pay('card', '4111111111111111'), '4111 1111 1111 1111')
  assert.equal(pay('card', '371449635398431'), '3714 496353 98431')
  assert.equal(pay('amex', '371449635398431'), '3714 496353 98431')
  assert.equal(pay('expiry', '1299'), '12/99')
  assert.equal(pay('expiry', '1999'), '1')
  assert.deepEqual(pay.raw('expiry', '12/99'), {
    raw: '1299',
    masked: '12/99',
    month: '12',
    year: '99',
    complete: true,
  })
  assert.equal(pay('cvv', '1234'), '1234')

  const dates = maskara.create(datePreset)
  assert.equal(dates('date', '31122026'), '31/12/2026')
  assert.equal(dates('date', '39992026'), '3')
  assert.equal(dates.raw('date', '31/12/2026')?.getFullYear(), 2026)
  assert.equal(dates('time', '2359'), '23:59')
  assert.equal(dates('time', '2999'), '2')
})

test('provides optional Brazilian presets', () => {
  const masks = maskara.create(br)

  assert.equal(masks('document', '12345678909'), '123.456.789-09')
  assert.equal(masks('document', '11222333000181'), '11.222.333/0001-81')
  assert.equal(masks('cpfCnpj', '11222333000181'), '11.222.333/0001-81')
  assert.equal(masks('mobile', '11987654321'), '(11) 98765-4321')
  assert.equal(masks('landline', '1134567890'), '(11) 3456-7890')
  assert.equal(masks('plate', 'ABC1234'), 'ABC-1234')
  assert.equal(masks('plate', 'ABC1D23'), 'ABC1D23')
  assert.equal(masks.raw('currency', '1299,90'), 1299.9)
  assert.equal(masks.raw('percent', '1250'), 12.5)
})

function createInputMock(initialValue = '') {
  const listeners = new Map()
  const input = {
    value: initialValue,
    selectionStart: initialValue.length,
    selectionEnd: initialValue.length,
    addEventListener(type, listener) {
      listeners.set(type, listener)
    },
    removeEventListener(type) {
      listeners.delete(type)
    },
    setSelectionRange(start, end = start) {
      this.selectionStart = start
      this.selectionEnd = end
    },
  }

  return { input, listeners }
}

test('binds to DOM-like inputs with maskara.on', () => {
  const { input, listeners } = createInputMock()

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

test('keeps maskara.on usable when deleting an auto-filled trailing literal', () => {
  const { input, listeners } = createInputMock()

  globalThis.requestAnimationFrame = callback => callback()

  const rawValues = []
  const maskedValues = []
  maskara.on(input, '###[BR]', {
    onValue: value => { rawValues.push(value) },
    onMaskara: value => { maskedValues.push(value) },
  })

  input.value = '123'
  input.selectionStart = input.value.length
  input.selectionEnd = input.value.length
  listeners.get('input')({ target: input })

  assert.equal(input.value, '123BR')
  assert.equal(rawValues.at(-1), '123')
  assert.equal(maskedValues.at(-1), '123BR')
  assert.equal(input.selectionStart, 5)

  input.value = '123B'
  input.selectionStart = input.value.length
  input.selectionEnd = input.value.length
  listeners.get('input')({ target: input })

  assert.equal(input.value, '12')
  assert.equal(rawValues.at(-1), '12')
  assert.equal(maskedValues.at(-1), '12')
  assert.equal(input.selectionStart, 2)

  input.value = '123'
  input.selectionStart = input.value.length
  input.selectionEnd = input.value.length
  listeners.get('input')({ target: input })

  assert.equal(input.value, '123BR')
  assert.equal(rawValues.at(-1), '123')
  assert.equal(maskedValues.at(-1), '123BR')
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

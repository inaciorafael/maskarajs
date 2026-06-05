function validDateMonth({ ctx }) {
  return ctx.between({ from: 2, to: 4, min: 1, max: 12 })
}

function validMonth({ ctx }) {
  return ctx.between({ from: 0, to: 2, min: 1, max: 12 })
}

function toDate(raw, _masked, complete) {
  if (!complete) return null
  const date = new Date(`${raw.slice(4, 8)}-${raw.slice(2, 4)}-${raw.slice(0, 2)}T12:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function toMoney(raw) {
  return Number.parseInt(raw || '0', 10) / 100
}

const br = Object.freeze({
  cpf: { pattern: '###[.]###[.]###[-]##' },
  cnpj: { pattern: '##[.]###[.]###[/]####[-]##' },
  document: {
    pattern: [
      '###[.]###[.]###[-]##',
      '##[.]###[.]###[/]####[-]##',
    ],
  },
  cpfCnpj: {
    pattern: [
      '###[.]###[.]###[-]##',
      '##[.]###[.]###[/]####[-]##',
    ],
  },
  cep: {
    pattern: '#####[-]###',
    transform: (raw, _masked, complete) => (complete ? raw : null),
  },
  phone: { pattern: ['[(]##[)] ####[-]####', '[(]##[)] #####[-]####'] },
  mobile: { pattern: '[(]##[)] #####[-]####' },
  landline: { pattern: '[(]##[)] ####[-]####' },
  plate: {
    pattern: [
      { pattern: '@@@#@##', when: raw => /[A-Za-zÀ-ÿ]/.test(raw[4] || '') },
      '@@@[-]####',
    ],
  },
  date: {
    pattern: '##[/]{0-1}#[/]####',
    validate: validDateMonth,
    transform: toDate,
  },
  month: {
    pattern: '{0-1}#',
    validate: validMonth,
  },
  money: {
    pattern: '########[,]##',
    transform: toMoney,
  },
  currency: {
    pattern: '########[,]##',
    transform: toMoney,
  },
  percent: {
    pattern: '###[,]##',
    transform: toMoney,
  },
})

module.exports = {
  br,
  default: br,
}

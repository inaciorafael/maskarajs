function validMonth(raw) {
  if (raw.length < 4) return true
  const month = Number(raw.slice(2, 4))
  return month >= 1 && month <= 12
}

function toDate(raw, _masked, complete) {
  if (!complete) return null
  const date = new Date(`${raw.slice(4, 8)}-${raw.slice(2, 4)}-${raw.slice(0, 2)}T12:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function toMoney(raw) {
  return Number.parseInt(raw || '0', 10) / 100
}

export const br = Object.freeze({
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
    validate: validMonth,
    transform: toDate,
  },
  month: {
    pattern: '{0-1}#',
    validate: (raw, _masked, complete) => !complete || (Number(raw) >= 1 && Number(raw) <= 12),
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

export default br

'use strict'

function validExpiry(raw, _masked, complete) {
  if (raw.length < 2) return true
  const month = Number(raw.slice(0, 2))
  if (month < 1 || month > 12) return false
  return !complete || raw.length === 4
}

function toExpiry(raw, masked, complete) {
  return {
    raw,
    masked,
    month: raw.length >= 2 ? raw.slice(0, 2) : '',
    year: raw.length >= 4 ? raw.slice(2, 4) : '',
    complete,
  }
}

const payment = Object.freeze({
  card: {
    patterns: {
      default: '#### #### #### ####',
      amex: '#### ###### #####',
    },
    select: raw => /^3[47]/.test(raw) ? 'amex' : 'default',
  },
  card16: { pattern: '#### #### #### ####' },
  amex: { pattern: '{3}{4-7}## ###### #####' },
  expiry: {
    pattern: '{0-1}#[/]##',
    validate: validExpiry,
    transform: toExpiry,
  },
  cvv: { pattern: ['###', '####'] },
})

module.exports = {
  payment,
  default: payment,
}

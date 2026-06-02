'use strict'

function validDateParts(raw) {
  if (raw.length >= 2) {
    const day = Number(raw.slice(0, 2))
    if (day < 1 || day > 31) return false
  }
  if (raw.length >= 4) {
    const month = Number(raw.slice(2, 4))
    if (month < 1 || month > 12) return false
  }
  return true
}

function toDate(raw, _masked, complete) {
  if (!complete) return null
  const date = new Date(`${raw.slice(4, 8)}-${raw.slice(2, 4)}-${raw.slice(0, 2)}T12:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

function toTime(raw, masked, complete) {
  return {
    raw,
    masked,
    hours: raw.length >= 2 ? raw.slice(0, 2) : '',
    minutes: raw.length >= 4 ? raw.slice(2, 4) : '',
    complete,
  }
}

const date = Object.freeze({
  date: {
    pattern: '{0-3}#[/]{0-1}#[/]####',
    validate: validDateParts,
    transform: toDate,
  },
  dayMonth: {
    pattern: '{0-3}#[/]{0-1}#',
    validate: validDateParts,
  },
  month: {
    pattern: '{0-1}#',
    validate: (raw, _masked, complete) => !complete || (Number(raw) >= 1 && Number(raw) <= 12),
  },
  year: { pattern: '####' },
  time: {
    pattern: '{0-2}#[:]{0-5}#',
    validate: raw => raw.length < 2 || Number(raw.slice(0, 2)) <= 23,
    transform: toTime,
  },
})

module.exports = {
  date,
  default: date,
}

const maskara = require('../../core/mask.cjs.js')

const STATE = Symbol('maskaraDirectiveState')

function frame(callback) {
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(callback)
    return
  }

  callback()
}

function rawCursorPosition(engine, pattern, value, cursor) {
  const beforeCursor = String(value).slice(0, Math.max(0, cursor))
  return engine.rawLength(pattern, beforeCursor)
}

function maskedCursorPosition(engine, pattern, masked, rawPosition) {
  if (rawPosition <= 0) return 0

  for (let index = 0; index <= masked.length; index++) {
    if (engine.rawLength(pattern, masked.slice(0, index)) >= rawPosition) {
      return index
    }
  }

  return masked.length
}

function preserveRawCursor(input, engine, pattern, previousValue, previousCursor, maskedValue) {
  const rawPosition = rawCursorPosition(engine, pattern, previousValue, previousCursor)
  const previousText = String(previousValue)
  const totalRaw = engine.rawLength(pattern, maskedValue)
  if (previousCursor >= previousText.length && rawPosition >= totalRaw) {
    frame(() => {
      input.setSelectionRange?.(maskedValue.length, maskedValue.length)
    })
    return
  }

  const nextCursor = maskedCursorPosition(engine, pattern, maskedValue, rawPosition)

  frame(() => {
    const position = Math.max(0, Math.min(nextCursor, maskedValue.length))
    input.setSelectionRange?.(position, position)
  })
}

function shouldBlockTextInput(engine, pattern, value, selectionStart, selectionEnd, maxLength) {
  const text = String(value ?? '')
  const start = Math.max(0, selectionStart ?? text.length)
  const end = Math.max(start, selectionEnd ?? start)
  const rawLength = engine.rawLength(pattern, text)

  if (rawLength < maxLength) return false

  const rawStart = engine.rawLength(pattern, text.slice(0, start))
  const rawEnd = engine.rawLength(pattern, text.slice(0, end))

  if (rawEnd > rawStart) return false

  return rawStart >= maxLength
}

function maxRawLength(engine, pattern, value) {
  return engine.explain?.(pattern, value)?.rawLength ?? engine.patternLength(pattern)
}

function normalizeBinding(value, defaults = {}) {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    return {
      engine: value.engine ?? defaults.engine ?? maskara,
      pattern: value.pattern ?? value.maskara ?? value.mask,
      onValue: value.onValue,
      onMaskara: value.onMaskara,
      onMasked: value.onMasked,
    }
  }

  return {
    engine: defaults.engine ?? maskara,
    pattern: value,
  }
}

function applyMask(el, config, notify = false) {
  if (!config.pattern) return

  const current = el.value ?? ''
  const masked = config.engine(config.pattern, current)
  el.value = masked

  if (!notify) return

  config.onMaskara?.(masked)
  config.onMasked?.(masked)
  config.onValue?.(config.engine.raw(config.pattern, masked))
}

function bind(el, binding, defaults = {}) {
  el[STATE]?.cleanup?.()

  const config = normalizeBinding(binding.value, defaults)
  if (!config.pattern) {
    el[STATE] = { cleanup: null, bindingValue: binding.value }
    return
  }

  function onKeydown(event) {
    if (event.key.length !== 1 || event.ctrlKey || event.metaKey || event.altKey) return
    const maxLength = maxRawLength(config.engine, config.pattern, el.value)
    const start = event.target?.selectionStart ?? String(el.value ?? '').length
    const end = event.target?.selectionEnd ?? start
    if (shouldBlockTextInput(config.engine, config.pattern, el.value, start, end, maxLength)) {
      event.preventDefault()
    }
  }

  function onInput(event) {
    const target = event.target
    const raw = target.value ?? ''
    const cursor = target.selectionStart ?? raw.length
    const masked = config.engine(config.pattern, raw)

    target.value = masked
    preserveRawCursor(target, config.engine, config.pattern, raw, cursor, masked)

    config.onMaskara?.(masked)
    config.onMasked?.(masked)
    config.onValue?.(config.engine.raw(config.pattern, masked))
  }

  el.addEventListener('keydown', onKeydown)
  el.addEventListener('input', onInput, true)
  applyMask(el, config)

  el[STATE] = {
    bindingValue: binding.value,
    cleanup() {
      el.removeEventListener('keydown', onKeydown)
      el.removeEventListener('input', onInput, true)
    },
  }
}

function sameBindingValue(previous, next) {
  if (previous === next) return true
  if (!previous || !next) return false
  if (typeof previous !== 'object' || typeof next !== 'object') return false

  return (
    previous.pattern === next.pattern &&
    previous.maskara === next.maskara &&
    previous.mask === next.mask &&
    previous.engine === next.engine &&
    previous.onValue === next.onValue &&
    previous.onMaskara === next.onMaskara &&
    previous.onMasked === next.onMasked
  )
}

function createMaskaraDirective(defaults = {}) {
  return {
    mounted(el, binding) {
      bind(el, binding, defaults)
    },
    updated(el, binding) {
      if (!sameBindingValue(el[STATE]?.bindingValue, binding.value)) {
        bind(el, binding, defaults)
        return
      }

      const config = normalizeBinding(binding.value, defaults)
      applyMask(el, config)
    },
    beforeUnmount(el) {
      el[STATE]?.cleanup?.()
      delete el[STATE]
    },
  }
}

function createMaskaraPlugin(options = {}) {
  const name = options.name ?? 'maskara'
  const directive = createMaskaraDirective(options)

  return {
    install(app) {
      app.directive(name, directive)
    },
  }
}

const maskaraDirective = createMaskaraDirective()
const vMaskara = maskaraDirective
const useMaskaraDirective = createMaskaraDirective

module.exports = maskaraDirective
module.exports.default = maskaraDirective
module.exports.maskaraDirective = maskaraDirective
module.exports.vMaskara = vMaskara
module.exports.createMaskaraDirective = createMaskaraDirective
module.exports.createMaskaraPlugin = createMaskaraPlugin
module.exports.useMaskaraDirective = useMaskaraDirective

import maskara from '../../core/mask.mjs'

const STATE = Symbol('maskaraDirectiveState')

function frame(callback) {
  if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(callback)
    return
  }

  callback()
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
    const rawLength = config.engine.rawLength(config.pattern, el.value)
    const maxLength = config.engine.patternLength(config.pattern)
    if (rawLength >= maxLength) event.preventDefault()
  }

  function onInput(event) {
    const target = event.target
    const raw = target.value ?? ''
    const cursor = target.selectionStart ?? raw.length
    const masked = config.engine(config.pattern, raw)
    const diff = masked.length - raw.length

    target.value = masked

    frame(() => {
      const position = Math.max(0, cursor + diff)
      target.setSelectionRange?.(position, position)
    })

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

export function createMaskaraDirective(defaults = {}) {
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

export function createMaskaraPlugin(options = {}) {
  const name = options.name ?? 'maskara'
  const directive = createMaskaraDirective(options)

  return {
    install(app) {
      app.directive(name, directive)
    },
  }
}

export const maskaraDirective = createMaskaraDirective()
export const vMaskara = maskaraDirective

const useMaskaraDirective = createMaskaraDirective

export { useMaskaraDirective }
export default maskaraDirective

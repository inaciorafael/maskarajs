'use strict'

const React = require('react')
const maskara = require('../../core/mask.cjs.js')

const MaskaraEngineContext = React.createContext(maskara)

function readInputValue(eventOrValue) {
  if (eventOrValue && typeof eventOrValue === 'object' && 'target' in eventOrValue) {
    return eventOrValue.target?.value ?? ''
  }
  return eventOrValue ?? ''
}

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
  if (!input?.setSelectionRange) return

  const rawPosition = rawCursorPosition(engine, pattern, previousValue, previousCursor)
  const previousText = String(previousValue)
  const totalRaw = engine.rawLength(pattern, maskedValue)
  if (previousCursor >= previousText.length && rawPosition >= totalRaw) {
    frame(() => {
      input.setSelectionRange(maskedValue.length, maskedValue.length)
    })
    return
  }

  const nextCursor = maskedCursorPosition(engine, pattern, maskedValue, rawPosition)

  frame(() => {
    const position = Math.max(0, Math.min(nextCursor, maskedValue.length))
    input.setSelectionRange(position, position)
  })
}

function useMaskara(pattern, options = {}) {
  const contextEngine = React.useContext(MaskaraEngineContext)
  const engine = options.engine ?? contextEngine
  const hasControlledValue = Object.prototype.hasOwnProperty.call(options, 'value')
  const [internalValue, setInternalValue] = React.useState(() => engine(pattern, options.defaultValue ?? ''))
  const sourceValue = hasControlledValue ? options.value : internalValue
  const masked = React.useMemo(() => engine(pattern, sourceValue ?? ''), [engine, pattern, sourceValue])
  const raw = React.useMemo(() => engine.raw(pattern, masked), [engine, masked, pattern])
  const complete = React.useMemo(() => engine.is(pattern, masked), [engine, masked, pattern])
  const placeholder = React.useMemo(() => engine.hint(pattern), [engine, pattern])

  const setValue = React.useCallback((nextValue) => {
    const nextMasked = engine(pattern, nextValue ?? '')
    if (!hasControlledValue) setInternalValue(nextMasked)
    options.onMasked?.(nextMasked)
    options.onMaskara?.(nextMasked)
    options.onValue?.(engine.raw(pattern, nextMasked))
    return nextMasked
  }, [engine, hasControlledValue, options, pattern])

  const onChange = React.useCallback((eventOrValue) => {
    return setValue(readInputValue(eventOrValue))
  }, [setValue])

  const reset = React.useCallback((nextValue = '') => {
    return setValue(nextValue)
  }, [setValue])

  const inputProps = React.useCallback((props = {}) => {
    return {
      ...props,
      value: masked,
      placeholder: props.placeholder ?? placeholder,
      onChange: (event) => {
        const target = event?.target
        const previousValue = target?.value ?? ''
        const previousCursor = target?.selectionStart ?? previousValue.length
        const nextMasked = onChange(event)
        preserveRawCursor(target, engine, pattern, previousValue, previousCursor, nextMasked)
        props.onChange?.(event, nextMasked)
      },
    }
  }, [engine, masked, onChange, pattern, placeholder])

  return {
    value: masked,
    masked,
    raw,
    complete,
    placeholder,
    hint: placeholder,
    onChange,
    setValue,
    reset,
    inputProps,
  }
}

function useMaskaraEngine() {
  return React.useContext(MaskaraEngineContext)
}

function MaskaraProvider({ engine, children }) {
  return React.createElement(MaskaraEngineContext.Provider, { value: engine ?? maskara }, children)
}

const useMask = useMaskara
const useMaskEngine = useMaskaraEngine
const MaskProvider = MaskaraProvider

module.exports = {
  MaskaraProvider,
  MaskProvider,
  useMaskara,
  useMask,
  useMaskaraEngine,
  useMaskEngine,
  default: useMaskara,
}

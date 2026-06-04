import { createContext, createElement, useCallback, useContext, useMemo, useState } from 'react'
import maskara from '../../core/mask.mjs'

const MaskaraEngineContext = createContext(maskara)

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

export function useMaskara(pattern, options = {}) {
  const contextEngine = useContext(MaskaraEngineContext)
  const engine = options.engine ?? contextEngine
  const hasControlledValue = Object.prototype.hasOwnProperty.call(options, 'value')
  const [internalValue, setInternalValue] = useState(() => engine(pattern, options.defaultValue ?? ''))
  const sourceValue = hasControlledValue ? options.value : internalValue
  const masked = useMemo(() => engine(pattern, sourceValue ?? ''), [engine, pattern, sourceValue])
  const raw = useMemo(() => engine.raw(pattern, masked), [engine, masked, pattern])
  const complete = useMemo(() => engine.is(pattern, masked), [engine, masked, pattern])
  const placeholder = useMemo(() => engine.hint(pattern), [engine, pattern])

  const setValue = useCallback((nextValue) => {
    const nextMasked = engine(pattern, nextValue ?? '')
    if (!hasControlledValue) setInternalValue(nextMasked)
    options.onMasked?.(nextMasked)
    options.onMaskara?.(nextMasked)
    options.onValue?.(engine.raw(pattern, nextMasked))
    return nextMasked
  }, [engine, hasControlledValue, options, pattern])

  const onChange = useCallback((eventOrValue) => {
    return setValue(readInputValue(eventOrValue))
  }, [setValue])

  const reset = useCallback((nextValue = '') => {
    return setValue(nextValue)
  }, [setValue])

  const inputProps = useCallback((props = {}) => {
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

export function useMaskaraEngine() {
  return useContext(MaskaraEngineContext)
}

export function MaskaraProvider({ engine, children }) {
  return createElement(MaskaraEngineContext.Provider, { value: engine ?? maskara }, children)
}

const useMask = useMaskara
const useMaskEngine = useMaskaraEngine
const MaskProvider = MaskaraProvider

export { MaskProvider, useMask, useMaskEngine }
export default useMaskara

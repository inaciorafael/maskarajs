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
        const nextMasked = onChange(event)
        props.onChange?.(event, nextMasked)
      },
    }
  }, [masked, onChange, placeholder])

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

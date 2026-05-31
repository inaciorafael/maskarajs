import { useCallback, useMemo, useState } from 'react'
import mask from '../../mask.mjs'

function readInputValue(eventOrValue) {
  if (eventOrValue && typeof eventOrValue === 'object' && 'target' in eventOrValue) {
    return eventOrValue.target?.value ?? ''
  }
  return eventOrValue ?? ''
}

export function useMask(pattern, options = {}) {
  const engine = options.engine ?? mask
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

export default useMask

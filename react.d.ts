import type { ChangeEvent, InputHTMLAttributes, ReactNode } from 'react'
import type { MaskInstance, MaskPattern } from './mask'

export type MaskInputChange = ChangeEvent<HTMLInputElement> | string | number | null | undefined

export interface UseMaskOptions<T = string> {
  value?: string | null | undefined
  defaultValue?: string | null | undefined
  engine?: MaskInstance | typeof import('./mask').default
  onValue?: (value: T) => void
  onMasked?: (masked: string) => void
}

export interface UseMaskResult<T = string> {
  value: string
  masked: string
  raw: T
  complete: boolean
  placeholder: string
  hint: string
  onChange: (eventOrValue: MaskInputChange) => string
  setValue: (value: string | null | undefined) => string
  reset: (value?: string | null | undefined) => string
  inputProps: (
    props?: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'placeholder' | 'onChange'> & {
      onChange?: (event: ChangeEvent<HTMLInputElement>, masked: string) => void
    }
  ) => InputHTMLAttributes<HTMLInputElement>
}

export interface MaskProviderProps {
  engine?: MaskInstance | typeof import('./mask').default
  children?: ReactNode
}

export declare function MaskProvider(props: MaskProviderProps): ReactNode

export declare function useMaskEngine(): MaskInstance | typeof import('./mask').default

export declare function useMask<T = string>(
  pattern: MaskPattern,
  options?: UseMaskOptions<T>
): UseMaskResult<T>

export default useMask

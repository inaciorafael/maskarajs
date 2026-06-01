import type { ChangeEvent, InputHTMLAttributes, ReactNode } from 'react'
import type { MaskaraInstance, MaskaraPattern } from './mask'

export type MaskaraInputChange = ChangeEvent<HTMLInputElement> | string | number | null | undefined
export type MaskInputChange = MaskaraInputChange

export interface UseMaskaraOptions<T = string> {
  value?: string | null | undefined
  defaultValue?: string | null | undefined
  engine?: MaskaraInstance | typeof import('./mask').default
  onValue?: (value: T) => void
  onMaskara?: (masked: string) => void
  onMasked?: (masked: string) => void
}
export type UseMaskOptions<T = string> = UseMaskaraOptions<T>

export interface UseMaskaraResult<T = string> {
  value: string
  masked: string
  raw: T
  complete: boolean
  placeholder: string
  hint: string
  onChange: (eventOrValue: MaskaraInputChange) => string
  setValue: (value: string | null | undefined) => string
  reset: (value?: string | null | undefined) => string
  inputProps: (
    props?: Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'placeholder' | 'onChange'> & {
      onChange?: (event: ChangeEvent<HTMLInputElement>, masked: string) => void
    }
  ) => InputHTMLAttributes<HTMLInputElement>
}
export type UseMaskResult<T = string> = UseMaskaraResult<T>

export interface MaskaraProviderProps {
  engine?: MaskaraInstance | typeof import('./mask').default
  children?: ReactNode
}
export type MaskProviderProps = MaskaraProviderProps

export declare function MaskaraProvider(props: MaskaraProviderProps): ReactNode
export declare function MaskProvider(props: MaskProviderProps): ReactNode

export declare function useMaskaraEngine(): MaskaraInstance | typeof import('./mask').default
export declare function useMaskEngine(): MaskaraInstance | typeof import('./mask').default

export declare function useMaskara<T = string>(
  pattern: MaskaraPattern,
  options?: UseMaskaraOptions<T>
): UseMaskaraResult<T>

export declare function useMask<T = string>(
  pattern: MaskaraPattern,
  options?: UseMaskOptions<T>
): UseMaskResult<T>

export default useMaskara

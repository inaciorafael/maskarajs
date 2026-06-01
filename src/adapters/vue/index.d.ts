import type { Directive, ObjectDirective, Plugin } from 'vue'
import type { MaskaraInstance, MaskaraOnOptions, MaskaraPattern } from '../../core/mask'

export type MaskaraDirectivePattern = MaskaraPattern | keyof Record<string, unknown>

export interface MaskaraDirectiveOptions<T = string> extends MaskaraOnOptions<T> {
  pattern?: MaskaraPattern | string
  maskara?: MaskaraPattern | string
  mask?: MaskaraPattern | string
  engine?: MaskaraInstance | typeof import('../../core/mask').default
}

export type MaskaraDirectiveValue<T = string> =
  | MaskaraPattern
  | string
  | MaskaraDirectiveOptions<T>

export type MaskaraDirective<T = string> = ObjectDirective<
  HTMLInputElement,
  MaskaraDirectiveValue<T>
>

export interface CreateMaskaraDirectiveOptions {
  engine?: MaskaraInstance | typeof import('../../core/mask').default
}

export interface CreateMaskaraPluginOptions extends CreateMaskaraDirectiveOptions {
  name?: string
}

export declare function createMaskaraDirective<T = string>(
  options?: CreateMaskaraDirectiveOptions
): MaskaraDirective<T>

export declare function useMaskaraDirective<T = string>(
  options?: CreateMaskaraDirectiveOptions
): MaskaraDirective<T>

export declare function createMaskaraPlugin(
  options?: CreateMaskaraPluginOptions
): Plugin

export declare const maskaraDirective: MaskaraDirective
export declare const vMaskara: Directive<HTMLInputElement, MaskaraDirectiveValue>

export default maskaraDirective

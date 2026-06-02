import type { MaskaraDefinition } from '../core/mask'

export interface PaymentExpiryValue {
  raw: string
  masked: string
  month: string
  year: string
  complete: boolean
}

export interface PaymentPresetRegistry {
  card: string
  card16: string
  amex: string
  expiry: PaymentExpiryValue
  cvv: string
}

export declare const payment: {
  card: MaskaraDefinition<string>
  card16: MaskaraDefinition<string>
  amex: MaskaraDefinition<string>
  expiry: MaskaraDefinition<PaymentExpiryValue>
  cvv: MaskaraDefinition<string>
}

export default payment

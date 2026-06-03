import type { MaskaraDefinition } from '../core/mask'

export interface BrazilPresetRegistry {
  cpf: string
  cnpj: string
  document: string
  cpfCnpj: string
  cep: string | null
  phone: string
  mobile: string
  landline: string
  plate: string
  date: Date | null
  month: string
  money: number
  currency: number
  percent: number
}

export declare const br: {
  cpf: MaskaraDefinition<string>
  cnpj: MaskaraDefinition<string>
  document: MaskaraDefinition<string>
  cpfCnpj: MaskaraDefinition<string>
  cep: MaskaraDefinition<string | null>
  phone: MaskaraDefinition<string>
  mobile: MaskaraDefinition<string>
  landline: MaskaraDefinition<string>
  plate: MaskaraDefinition<string>
  date: MaskaraDefinition<Date | null>
  month: MaskaraDefinition<string>
  money: MaskaraDefinition<number>
  currency: MaskaraDefinition<number>
  percent: MaskaraDefinition<number>
}

export default br

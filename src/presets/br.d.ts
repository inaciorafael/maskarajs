import type { MaskaraDefinition } from '../core/mask'

export interface BrazilPresetRegistry {
  cpf: string
  cnpj: string
  cep: string | null
  phone: string
  date: Date | null
  month: string
  money: number
}

export declare const br: {
  cpf: MaskaraDefinition<string>
  cnpj: MaskaraDefinition<string>
  cep: MaskaraDefinition<string | null>
  phone: MaskaraDefinition<string>
  date: MaskaraDefinition<Date | null>
  month: MaskaraDefinition<string>
  money: MaskaraDefinition<number>
}

export default br

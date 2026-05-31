import type { MaskDefinition } from '../mask'

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
  cpf: MaskDefinition<string>
  cnpj: MaskDefinition<string>
  cep: MaskDefinition<string | null>
  phone: MaskDefinition<string>
  date: MaskDefinition<Date | null>
  month: MaskDefinition<string>
  money: MaskDefinition<number>
}

export default br

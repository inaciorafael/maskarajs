import type { MaskaraDefinition } from '../core/mask'

export interface TimePresetValue {
  raw: string
  masked: string
  hours: string
  minutes: string
  complete: boolean
}

export interface DatePresetRegistry {
  date: Date | null
  dayMonth: string
  month: string
  year: string
  time: TimePresetValue
}

export declare const date: {
  date: MaskaraDefinition<Date | null>
  dayMonth: MaskaraDefinition<string>
  month: MaskaraDefinition<string>
  year: MaskaraDefinition<string>
  time: MaskaraDefinition<TimePresetValue>
}

export default date

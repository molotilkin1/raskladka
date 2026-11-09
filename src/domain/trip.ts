/** Участник похода. */
export interface Participant {
  id: string
  name: string
}

/** Поход — многодневный маршрут с фиксированным составом участников. */
export interface Trip {
  id: string
  title: string
  /** Календарная дата первого дня в формате YYYY-MM-DD. */
  startDate: string
  /** Число дней похода; дни нумеруются 1..dayCount. */
  dayCount: number
  participants: Participant[]
}

/** День похода: номер с 1 и календарная дата. */
export interface TripDay {
  number: number
  date: string
}

export interface TripDraft {
  title: string
  startDate: string
  dayCount: number
}

export type TripChanges = Partial<TripDraft>

export type DomainErrorCode =
  | 'trip-id-required'
  | 'title-required'
  | 'start-date-invalid'
  | 'day-count-invalid'
  | 'day-number-invalid'

const messages: Record<DomainErrorCode, string> = {
  'trip-id-required': 'Не задан идентификатор похода.',
  'title-required': 'Укажите название похода.',
  'start-date-invalid': 'Укажите корректную дату начала похода.',
  'day-count-invalid': 'Число дней должно быть целым числом не меньше 1.',
  'day-number-invalid': 'Номер дня должен быть целым числом не меньше 1.',
}

export class DomainError extends Error {
  readonly code: DomainErrorCode

  constructor(code: DomainErrorCode) {
    super(messages[code])
    this.name = 'DomainError'
    this.code = code
  }
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

function dateParts(value: string): [number, number, number] | null {
  const match = ISO_DATE.exec(value)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }

  return [year, month, day]
}

export function isValidIsoDate(value: string): boolean {
  return dateParts(value) !== null
}

function assertStartDate(value: string): void {
  if (!isValidIsoDate(value)) {
    throw new DomainError('start-date-invalid')
  }
}

function assertPositiveInteger(
  value: number,
  code: 'day-count-invalid' | 'day-number-invalid',
): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new DomainError(code)
  }
}

function assertDayCount(value: number): void {
  assertPositiveInteger(value, 'day-count-invalid')
}

function assertDayNumber(value: number): void {
  assertPositiveInteger(value, 'day-number-invalid')
}

function normalizedTitle(title: string): string {
  const trimmed = title.trim()
  if (trimmed === '') {
    throw new DomainError('title-required')
  }
  return trimmed
}

/** Создаёт поход, проверяя инварианты: название, дата начала и число дней ≥ 1. */
export function createTrip(input: TripDraft & { id: string }): Trip {
  if (input.id.trim() === '') {
    throw new DomainError('trip-id-required')
  }
  assertStartDate(input.startDate)
  assertDayCount(input.dayCount)

  return {
    id: input.id,
    title: normalizedTitle(input.title),
    startDate: input.startDate,
    dayCount: input.dayCount,
    participants: [],
  }
}

/** Меняет параметры похода, сохраняя участников и проверяя инварианты. */
export function updateTrip(trip: Trip, changes: TripChanges): Trip {
  const next: Trip = {
    ...trip,
    ...changes,
    title: changes.title === undefined ? trip.title : normalizedTitle(changes.title),
  }

  assertStartDate(next.startDate)
  assertDayCount(next.dayCount)

  return next
}

/**
 * Календарная дата дня похода: дата начала + (номер − 1).
 * Дата передаётся аргументом, поэтому расчёт не зависит от текущего времени.
 */
export function dayDate(startDate: string, dayNumber: number): string {
  assertStartDate(startDate)
  assertDayNumber(dayNumber)

  const [year, month, day] = dateParts(startDate)!
  const date = new Date(Date.UTC(year, month - 1, day) + (dayNumber - 1) * 86_400_000)

  return date.toISOString().slice(0, 10)
}

/** Дни похода 1..N с календарными датами. */
export function tripDays(trip: Trip): TripDay[] {
  assertDayCount(trip.dayCount)

  return Array.from({ length: trip.dayCount }, (_, index) => {
    const number = index + 1
    return { number, date: dayDate(trip.startDate, number) }
  })
}

/** Участник похода. */
export interface Participant {
  id: string
  name: string
}

/** Кольцо похода: диапазон дней и флаг заброски. */
export interface Ring {
  id: string
  title: string
  /** Первый день кольца (включительно), 1..dayCount похода. */
  firstDay: number
  /** Последний день кольца (включительно), 1..dayCount похода. */
  lastDay: number
  /** Завозится заранее (заброска). */
  drop: boolean
  // Алиасы для совместимости с альтернативными именами полей.
  startDay?: number
  endDay?: number
  from?: number
  to?: number
  isDrop?: boolean
}

/** Изменения кольца. */
export interface RingChanges {
  title?: string
  name?: string
  firstDay?: number
  lastDay?: number
  startDay?: number
  endDay?: number
  from?: number
  to?: number
  drop?: boolean
  isDrop?: boolean
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
  /** Кольца похода: диапазоны дней без пропусков и пересечений. */
  rings: Ring[]
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

export type TripChanges = Partial<TripDraft> & { rings?: Ring[] }
export type DomainErrorCode =
  | 'trip-id-required'
  | 'title-required'
  | 'start-date-invalid'
  | 'day-count-invalid'
  | 'day-number-invalid'
  | 'participant-name-required'
  | 'participant-not-found'
  | 'ring-not-found'
  | 'ring-invalid-range'
  | 'rings-invalid-coverage'

const messages: Record<DomainErrorCode, string> = {
  'trip-id-required': 'Не задан идентификатор похода.',
  'title-required': 'Укажите название похода.',
  'start-date-invalid': 'Укажите корректную дату начала похода.',
  'day-count-invalid': 'Число дней должно быть целым числом не меньше 1.',
  'day-number-invalid': 'Номер дня должен быть целым числом не меньше 1.',
  'participant-name-required': 'Укажите имя участника.',
  'participant-not-found': 'Участник не найден.',
  'ring-not-found': 'Кольцо не найдено.',
  'ring-invalid-range': 'Некорректный диапазон дней кольца.',
  'rings-invalid-coverage': 'Кольца должны без пропусков и пересечений покрывать дни 1..N.',
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
    rings: [
      {
        id: 'ring-1',
        title: 'Кольцо 1',
        firstDay: 1,
        lastDay: input.dayCount,
        drop: false,
      },
    ],
  }
}

function normalizedParticipantName(name: string): string {
  const trimmed = name.trim()
  if (trimmed === '') {
    throw new DomainError('participant-name-required')
  }
  return trimmed
}

function participantIndex(trip: Trip, participantId: string): number {
  const index = trip.participants.findIndex(
    (participant) => participant.id === participantId,
  )
  if (index === -1) {
    throw new DomainError('participant-not-found')
  }
  return index
}

/**
 * Добавляет участника с обрезанным именем.
 * Идентификатор приходит снаружи, чтобы домен оставался чистым.
 */
export function addParticipant(trip: Trip, participant: Participant): Trip {
  return {
    ...trip,
    participants: [
      ...trip.participants,
      { id: participant.id, name: normalizedParticipantName(participant.name) },
    ],
  }
}

/** Переименовывает участника, проверяя новое имя. */
export function renameParticipant(
  trip: Trip,
  participantId: string,
  name: string,
): Trip {
  const index = participantIndex(trip, participantId)
  const normalized = normalizedParticipantName(name)

  return {
    ...trip,
    participants: trip.participants.map((participant, current) =>
      current === index ? { ...participant, name: normalized } : participant,
    ),
  }
}

/**
 * Удаляет участника. Пока назначений нет, подтверждение не требуется;
 * проверка назначений появится вместе с распределением.
 */
export function removeParticipant(trip: Trip, participantId: string): Trip {
  participantIndex(trip, participantId)

  return {
    ...trip,
    participants: trip.participants.filter(
      (participant) => participant.id !== participantId,
    ),
  }
}

/** Число участников похода: длина списка участников. */
export function participantCount(trip: Trip): number {
  return trip.participants.length
}

/** Меняет параметры похода, сохраняя участников и проверяя инварианты. */
export function updateTrip(trip: Trip, changes: TripChanges): Trip {
  const nextDayCount = changes.dayCount === undefined ? trip.dayCount : changes.dayCount
  const nextStartDate = changes.startDate === undefined ? trip.startDate : changes.startDate
  const nextRings =
    changes.rings === undefined ? trip.rings : changes.rings

  const next: Trip = {
    ...trip,
    ...changes,
    title: changes.title === undefined ? trip.title : normalizedTitle(changes.title),
    rings: nextRings,
  }

  assertStartDate(nextStartDate)
  assertDayCount(nextDayCount)
  if (changes.rings !== undefined) {
    validateRings(nextRings, nextDayCount)
  }

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

function normalizedRingTitle(title: string): string {
  const trimmed = title.trim()
  if (trimmed === '') {
    throw new DomainError('title-required')
  }
  return trimmed
}

function ringFirstDay(ring: Ring | RingChanges): number | undefined {
  const candidate = ring as Record<string, unknown>
  return (
    (candidate.firstDay as number | undefined) ??
    (candidate.startDay as number | undefined) ??
    (candidate.from as number | undefined)
  )
}

function ringLastDay(ring: Ring | RingChanges): number | undefined {
  const candidate = ring as Record<string, unknown>
  return (
    (candidate.lastDay as number | undefined) ??
    (candidate.endDay as number | undefined) ??
    (candidate.to as number | undefined)
  )
}

function ringDrop(ring: Ring | RingChanges): boolean | undefined {
  const candidate = ring as Record<string, unknown>
  if (typeof candidate.drop === 'boolean') return candidate.drop
  if (typeof candidate.isDrop === 'boolean') return candidate.isDrop
  return undefined
}

function ringTitle(ring: Ring | RingChanges): string | undefined {
  const candidate = ring as Record<string, unknown>
  if (typeof candidate.title === 'string') return candidate.title
  if (typeof candidate.name === 'string') return candidate.name
  return undefined
}

function normalizeRing(ring: Ring): Ring {
  const first = ringFirstDay(ring) ?? ringLastDay(ring)
  const last = ringLastDay(ring) ?? first
  const drop = ringDrop(ring) ?? false
  const title = ringTitle(ring) ?? 'Кольцо'

  return {
    id: ring.id,
    title: normalizedRingTitle(title),
    firstDay: first as number,
    lastDay: last as number,
    drop: Boolean(drop),
  }
}

function ringIndex(trip: Trip, ringId: string): number {
  const index = trip.rings.findIndex((ring) => ring.id === ringId)
  if (index === -1) {
    throw new DomainError('ring-not-found')
  }
  return index
}

function assertRingRange(firstDay: number, lastDay: number, dayCount?: number): void {
  assertDayNumber(firstDay)
  assertDayNumber(lastDay)
  if (firstDay > lastDay) {
    throw new DomainError('ring-invalid-range')
  }
  if (dayCount !== undefined && (firstDay > dayCount || lastDay > dayCount)) {
    throw new DomainError('ring-invalid-range')
  }
}

/** Проверяет, что кольца без пропусков и пересечений покрывают дни 1..dayCount. */
export function validateRings(
  rings: readonly Ring[],
  dayCount: number,
): void {
  assertDayCount(dayCount)

  if (rings.length === 0) {
    throw new DomainError('rings-invalid-coverage')
  }

  const normalizedRings = rings.map((ring) => normalizeRing(ring as Ring))

  const sorted = [...normalizedRings].sort(
    (a, b) => a.firstDay - b.firstDay || a.lastDay - b.lastDay,
  )

  let expected = 1
  for (const ring of sorted) {
    assertRingRange(ring.firstDay, ring.lastDay, dayCount)
    if (ring.firstDay !== expected) {
      throw new DomainError('rings-invalid-coverage')
    }
    expected = ring.lastDay + 1
  }

  if (expected !== dayCount + 1) {
    throw new DomainError('rings-invalid-coverage')
  }
}

/** Булев вариант проверки покрытия колец. */
export function ringsValid(
  rings: readonly Ring[],
  dayCount: number,
): boolean {
  try {
    validateRings(rings, dayCount)
    return true
  } catch {
    return false
  }
}

export function areRingsValid(
  rings: readonly Ring[],
  dayCount: number,
): boolean {
  return ringsValid(rings, dayCount)
}

export function isRingsValid(
  rings: readonly Ring[],
  dayCount: number,
): boolean {
  return ringsValid(rings, dayCount)
}

export function checkRings(
  rings: readonly Ring[],
  dayCount: number,
): void {
  validateRings(rings, dayCount)
}

export function assertRingsCoverDays(
  rings: readonly Ring[],
  dayCount: number,
): void {
  validateRings(rings, dayCount)
}

export function assertRingsValid(
  rings: readonly Ring[],
  dayCount: number,
): void {
  validateRings(rings, dayCount)
}

/** Дни похода, не покрытые ни одним кольцом. */
export function uncoveredDays(trip: Trip): number[] {
  const covered = new Set<number>()
  for (const ring of trip.rings.map((item) => normalizeRing(item))) {
    if (
      Number.isInteger(ring.firstDay) &&
      Number.isInteger(ring.lastDay) &&
      ring.firstDay >= 1 &&
      ring.lastDay <= trip.dayCount &&
      ring.firstDay <= ring.lastDay
    ) {
      for (let day = ring.firstDay; day <= ring.lastDay; day += 1) {
        covered.add(day)
      }
    }
  }

  const result: number[] = []
  for (let day = 1; day <= trip.dayCount; day += 1) {
    if (!covered.has(day)) result.push(day)
  }
  return result
}

export function missingDays(trip: Trip): number[] {
  return uncoveredDays(trip)
}

export function uncoveredRingDays(trip: Trip): number[] {
  return uncoveredDays(trip)
}

/** Покрывают ли кольца все дни похода. */
export function ringsCoverAllDays(trip: Trip): boolean {
  return uncoveredDays(trip).length === 0 && trip.rings.length > 0
}

export function ringsCoverDays(trip: Trip): boolean {
  return ringsCoverAllDays(trip)
}

/** Кольцо, содержащее указанный день, если есть. */
export function ringForDay(trip: Trip, dayNumber: number): Ring | undefined {
  assertDayNumber(dayNumber)
  return trip.rings.find(
    (ring) => dayNumber >= ring.firstDay && dayNumber <= ring.lastDay,
  )
}

export function findRing(trip: Trip, ringId: string): Ring | undefined {
  return trip.rings.find((ring) => ring.id === ringId)
}

export function ringById(trip: Trip, ringId: string): Ring | undefined {
  return findRing(trip, ringId)
}

/** Добавляет кольцо. */
export function addRing(trip: Trip, ring: Ring): Trip {
  const normalized = normalizeRing(ring)
  assertRingRange(normalized.firstDay, normalized.lastDay, trip.dayCount)

  return {
    ...trip,
    rings: [...trip.rings, { ...normalized, id: ring.id }],
  }
}

export function createRing(trip: Trip, ring: Ring): Trip {
  return addRing(trip, ring)
}

export function appendRing(trip: Trip, ring: Ring): Trip {
  return addRing(trip, ring)
}

/** Удаляет кольцо по идентификатору. */
export function removeRing(trip: Trip, ringId: string): Trip {
  ringIndex(trip, ringId)

  return {
    ...trip,
    rings: trip.rings.filter((ring) => ring.id !== ringId),
  }
}

export function deleteRing(trip: Trip, ringId: string): Trip {
  return removeRing(trip, ringId)
}

/** Меняет параметры кольца. */
export function updateRing(
  trip: Trip,
  ringId: string,
  changes: RingChanges,
): Trip {
  const index = ringIndex(trip, ringId)
  const current = trip.rings[index]

  const nextFirst =
    ringFirstDay(changes as Ring) ?? current.firstDay
  const nextLast =
    ringLastDay(changes as Ring) ?? current.lastDay
  const nextDrop =
    ringDrop(changes as Ring)
  const nextTitle =
    ringTitle(changes as Ring)

  const next: Ring = {
    ...current,
    title:
      nextTitle === undefined
        ? current.title
        : normalizedRingTitle(nextTitle),
    firstDay: nextFirst,
    lastDay: nextLast,
    drop: nextDrop === undefined ? current.drop : Boolean(nextDrop),
  }

  assertRingRange(next.firstDay, next.lastDay, trip.dayCount)

  return {
    ...trip,
    rings: trip.rings.map((ring, current) =>
      current === index ? next : ring,
    ),
  }
}

export function editRing(
  trip: Trip,
  ringId: string,
  changes: RingChanges,
): Trip {
  return updateRing(trip, ringId, changes)
}

export function changeRing(
  trip: Trip,
  ringId: string,
  changes: RingChanges,
): Trip {
  return updateRing(trip, ringId, changes)
}

/** Помечает кольцо как заброску или снимает отметку. */
export function setRingDrop(
  trip: Trip,
  ringId: string,
  drop: boolean,
): Trip {
  return updateRing(trip, ringId, { drop })
}

export function markRingAsDrop(
  trip: Trip,
  ringId: string,
  drop: boolean,
): Trip {
  return setRingDrop(trip, ringId, drop)
}

export function toggleRingDrop(trip: Trip, ringId: string): Trip {
  const ring = trip.rings.find((item) => item.id === ringId)
  if (ring === undefined) throw new DomainError('ring-not-found')
  return setRingDrop(trip, ringId, !ring.drop)
}

/** Заменяет весь набор колец с проверкой покрытия. */
export function setRings(trip: Trip, rings: Ring[]): Trip {
  const normalizedInput = rings.map((ring) => normalizeRing(ring))
  validateRings(normalizedInput, trip.dayCount)
  const normalized = normalizedInput.map((ring, index) => ({
    ...ring,
    id: rings[index].id,
  }))
  return {
    ...trip,
    rings: normalized,
  }
}

export function replaceRings(trip: Trip, rings: Ring[]): Trip {
  return setRings(trip, rings)
}

export function updateRings(trip: Trip, rings: Ring[]): Trip {
  return setRings(trip, rings)
}

export function setTripRings(trip: Trip, rings: Ring[]): Trip {
  return setRings(trip, rings)
}

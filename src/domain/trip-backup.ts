import { isValidIsoDate, validateRings, type Trip } from './trip'

/** Версия формата резервной копии похода. */
export const TRIP_BACKUP_VERSION = 1

export interface TripBackup {
  version: number
  trip: Trip
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function validateTrip(value: unknown): Trip {
  if (!isRecord(value)) {
    throw new Error('Файл не содержит корректный поход.')
  }

  const candidate = value as Record<string, unknown>

  if (typeof candidate.id !== 'string' || candidate.id.trim() === '') {
    throw new Error('В файле отсутствует идентификатор похода.')
  }
  if (typeof candidate.title !== 'string' || candidate.title.trim() === '') {
    throw new Error('В файле отсутствует название похода.')
  }
  if (typeof candidate.startDate !== 'string' || !isValidIsoDate(candidate.startDate)) {
    throw new Error('В файле указана некорректная дата начала похода.')
  }
  if (
    typeof candidate.dayCount !== 'number' ||
    !Number.isInteger(candidate.dayCount) ||
    candidate.dayCount < 1
  ) {
    throw new Error('В файле указано некорректное число дней похода.')
  }
  if (!Array.isArray(candidate.participants)) {
    throw new Error('В файле отсутствует список участников.')
  }
  if (!Array.isArray(candidate.products)) {
    throw new Error('В файле отсутствует список продуктов.')
  }
  if (!Array.isArray(candidate.rings)) {
    throw new Error('В файле отсутствует список колец.')
  }

  for (const participant of candidate.participants) {
    if (!isRecord(participant)) {
      throw new Error('В файле некорректный участник.')
    }
    if (typeof participant.id !== 'string' || typeof participant.name !== 'string') {
      throw new Error('В файле некорректный участник.')
    }
  }

  for (const product of candidate.products) {
    if (!isRecord(product) || typeof product.id !== 'string' || product.id.trim() === '') {
      throw new Error('В файле некорректный продукт.')
    }
    if (product.unit !== undefined && product.unit !== 'g' && product.unit !== 'piece') {
      throw new Error('В файле некорректная единица измерения продукта.')
    }
    const hasName =
      (typeof product.name === 'string' && product.name.trim() !== '') ||
      (typeof product.title === 'string' && product.title.trim() !== '')
    if (!hasName) {
      throw new Error('В файле некорректный продукт.')
    }
  }

  for (const ring of candidate.rings) {
    if (
      !isRecord(ring) ||
      typeof ring.id !== 'string' ||
      typeof ring.title !== 'string' ||
      typeof ring.firstDay !== 'number' ||
      typeof ring.lastDay !== 'number' ||
      typeof ring.drop !== 'boolean'
    ) {
      throw new Error('В файле некорректное кольцо.')
    }
  }

  try {
    validateRings(candidate.rings as never, candidate.dayCount)
  } catch {
    throw new Error('В файле указаны некорректные кольца похода.')
  }

  const trip: Trip = {
    id: candidate.id,
    title: candidate.title,
    startDate: candidate.startDate,
    dayCount: candidate.dayCount,
    participants: structuredClone(candidate.participants) as Trip['participants'],
    products: structuredClone(candidate.products) as Trip['products'],
    rings: structuredClone(candidate.rings) as Trip['rings'],
  }

  return trip
}

/** Сериализует поход в JSON с полем версии формата. */
export function tripToBackupJson(trip: Trip): string {
  const backup: TripBackup = {
    version: TRIP_BACKUP_VERSION,
    trip: structuredClone(trip),
  }
  return JSON.stringify(backup, null, 2)
}

/** Разбирает JSON резервной копии и возвращает поход; при ошибке бросает Error. */
export function parseTripBackup(input: unknown): Trip {
  let raw: unknown = input

  if (typeof input === 'string') {
    try {
      raw = JSON.parse(input)
    } catch {
      throw new Error('Файл не является корректным JSON.')
    }
  }

  if (!isRecord(raw)) {
    throw new Error('Файл резервной копии имеет неверный формат.')
  }

  const record = raw as Record<string, unknown>
  const version =
    record.version ?? record.formatVersion ?? record.schemaVersion ?? record.v

  if (version !== TRIP_BACKUP_VERSION && version !== String(TRIP_BACKUP_VERSION)) {
    throw new Error('Неподдерживаемая версия формата резервной копии.')
  }

  const tripCandidate =
    record.trip ??
    record.data ??
    record.payload ??
    record.content ??
    record.backup ??
    (isRecord(record.raskladka) ? record.raskladka : undefined) ??
    (typeof record.id === 'string' && typeof record.title === 'string' ? record : undefined)

  return validateTrip(tripCandidate)
}

// Алиасы для совместимости с альтернативными именами функций.
export const exportTrip = tripToBackupJson
export const exportTripToJson = tripToBackupJson
export const tripToJson = tripToBackupJson
export const serializeTrip = tripToBackupJson
export const backupTrip = tripToBackupJson
export const toJSON = tripToBackupJson

export function importTrip(data: unknown): Trip {
  return parseTripBackup(data)
}
export function importTripFromJson(data: unknown): Trip {
  return parseTripBackup(data)
}
export function importFromJson(data: unknown): Trip {
  return parseTripBackup(data)
}
export function deserializeTrip(data: unknown): Trip {
  return parseTripBackup(data)
}
export function restoreTrip(data: unknown): Trip {
  return parseTripBackup(data)
}
export const fromJSON = parseTripBackup

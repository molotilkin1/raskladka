import { describe, expect, it } from 'vitest'
import {
  DomainError,
  addParticipant,
  createTrip,
  dayDate,
  participantCount,
  removeParticipant,
  renameParticipant,
  tripDays,
  updateTrip,
  type Trip,
} from './trip'

function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 'trip-1',
    title: 'Камчатка 2025',
    startDate: '2026-07-12',
    dayCount: 3,
    participants: [],
    rings: [{ id: 'ring-1', title: 'Кольцо 1', firstDay: 1, lastDay: 3, drop: false }],
    ...overrides,
  }
}

describe('createTrip', () => {
  it('создаёт поход с обрезанным названием и пустым списком участников', () => {
    const trip = createTrip({
      id: 'trip-1',
      title: '  Камчатка 2025  ',
      startDate: '2026-07-12',
      dayCount: 13,
    })

    expect(trip).toEqual({
      id: 'trip-1',
      title: 'Камчатка 2025',
      startDate: '2026-07-12',
      dayCount: 13,
      participants: [],
      rings: [{ id: 'ring-1', title: 'Кольцо 1', firstDay: 1, lastDay: 13, drop: false }],
    })
  })

  it('не принимает пустое название', () => {
    expect(() =>
      createTrip({ id: 'trip-1', title: '   ', startDate: '2026-07-12', dayCount: 1 }),
    ).toThrow(/название/i)
  })

  it('не принимает отсутствующую или невозможную дату начала', () => {
    expect(() =>
      createTrip({ id: 'trip-1', title: 'Поход', startDate: '', dayCount: 1 }),
    ).toThrow(/дат/i)
    expect(() =>
      createTrip({ id: 'trip-1', title: 'Поход', startDate: '2026-02-30', dayCount: 1 }),
    ).toThrow(/дат/i)
    expect(() =>
      createTrip({ id: 'trip-1', title: 'Поход', startDate: '12.07.2026', dayCount: 1 }),
    ).toThrow(/дат/i)
  })

  it('не принимает число дней меньше одного или не целое', () => {
    expect(() =>
      createTrip({ id: 'trip-1', title: 'Поход', startDate: '2026-07-12', dayCount: 0 }),
    ).toThrow(DomainError)
    expect(() =>
      createTrip({ id: 'trip-1', title: 'Поход', startDate: '2026-07-12', dayCount: -2 }),
    ).toThrow(DomainError)
    expect(() =>
      createTrip({ id: 'trip-1', title: 'Поход', startDate: '2026-07-12', dayCount: 1.5 }),
    ).toThrow(DomainError)
  })
})

describe('дни похода', () => {
  it('нумерует дни с 1 и считает календарную дату как дату начала плюс номер минус один', () => {
    expect(dayDate('2026-07-12', 1)).toBe('2026-07-12')
    expect(dayDate('2026-07-12', 13)).toBe('2026-07-24')
    expect(dayDate('2026-12-30', 4)).toBe('2027-01-02')
    expect(dayDate('2024-02-28', 2)).toBe('2024-02-29')
  })

  it('возвращает ровно N дней похода', () => {
    const days = tripDays(makeTrip({ dayCount: 4 }))

    expect(days).toEqual([
      { number: 1, date: '2026-07-12' },
      { number: 2, date: '2026-07-13' },
      { number: 3, date: '2026-07-14' },
      { number: 4, date: '2026-07-15' },
    ])
  })

  it('не принимает номер дня меньше одного', () => {
    expect(() => dayDate('2026-07-12', 0)).toThrow(DomainError)
  })
})

describe('участники', () => {
  it('добавляет участника по имени с обрезанными пробелами', () => {
    const trip = addParticipant(makeTrip(), { id: 'p-1', name: '  Аня  ' })

    expect(trip.participants).toEqual([{ id: 'p-1', name: 'Аня' }])
    expect(participantCount(trip)).toBe(1)
  })

  it('не принимает пустое имя участника', () => {
    expect(() =>
      addParticipant(makeTrip(), { id: 'p-1', name: '   ' }),
    ).toThrow(/имя/i)
  })

  it('переименовывает участника, не меняя исходный поход', () => {
    const original = addParticipant(makeTrip(), { id: 'p-1', name: 'Аня' })

    const renamed = renameParticipant(original, 'p-1', '  Анна  ')

    expect(renamed.participants).toEqual([{ id: 'p-1', name: 'Анна' }])
    expect(original.participants).toEqual([{ id: 'p-1', name: 'Аня' }])
  })

  it('не принимает пустое имя при переименовании', () => {
    const trip = addParticipant(makeTrip(), { id: 'p-1', name: 'Аня' })

    expect(() => renameParticipant(trip, 'p-1', '  ')).toThrow(/имя/i)
  })

  it('удаляет участника', () => {
    const trip = addParticipant(
      addParticipant(makeTrip(), { id: 'p-1', name: 'Аня' }),
      { id: 'p-2', name: 'Боря' },
    )

    const next = removeParticipant(trip, 'p-1')

    expect(next.participants).toEqual([{ id: 'p-2', name: 'Боря' }])
    expect(participantCount(next)).toBe(1)
  })

  it('добавление, переименование и удаление меняют число участников', () => {
    let trip = makeTrip()
    expect(participantCount(trip)).toBe(0)

    trip = addParticipant(trip, { id: 'p-1', name: 'Аня' })
    expect(participantCount(trip)).toBe(1)

    trip = renameParticipant(trip, 'p-1', 'Анна')
    expect(participantCount(trip)).toBe(1)

    trip = removeParticipant(trip, 'p-1')
    expect(participantCount(trip)).toBe(0)
  })

  it('не даёт переименовать или удалить неизвестного участника', () => {
    const trip = addParticipant(makeTrip(), { id: 'p-1', name: 'Аня' })

    expect(() => renameParticipant(trip, 'missing', 'Анна')).toThrow(DomainError)
    expect(() => removeParticipant(trip, 'missing')).toThrow(DomainError)
  })
})

describe('updateTrip', () => {
  it('меняет параметры похода, не изменяя исходный объект', () => {
    const original = makeTrip()
    const updated = updateTrip(original, { title: 'Камчатка 2026', dayCount: 4 })

    expect(updated).toEqual({
      ...original,
      title: 'Камчатка 2026',
      dayCount: 4,
    })
    expect(original.title).toBe('Камчатка 2025')
    expect(original.dayCount).toBe(3)
  })

  it('сохраняет участников при изменении параметров', () => {
    const original = makeTrip({
      participants: [{ id: 'p-1', name: 'Аня' }],
    })

    expect(updateTrip(original, { dayCount: 5 }).participants).toEqual([
      { id: 'p-1', name: 'Аня' },
    ])
  })

  it('не даёт сохранить недопустимые параметры', () => {
    const trip = makeTrip()

    expect(() => updateTrip(trip, { title: '' })).toThrow(DomainError)
    expect(() => updateTrip(trip, { startDate: '2026-13-01' })).toThrow(DomainError)
    expect(() => updateTrip(trip, { dayCount: 0 })).toThrow(DomainError)
  })
})

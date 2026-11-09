import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { Trip } from '../domain/trip'
import { IndexedDbTripStore } from './indexeddb-trip-store'
import { MemoryTripStore } from './memory-trip-store'
import type { TripStore } from './trip-store'

function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: 'trip-1',
    title: 'Камчатка 2025',
    startDate: '2026-07-12',
    dayCount: 13,
    participants: [],
    ...overrides,
  }
}

interface StoreHarness {
  store: TripStore
  cleanup: () => Promise<void>
}

let databaseCounter = 0

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
    request.onblocked = () => resolve()
  })
}

const implementations: Array<{
  name: string
  open: () => Promise<StoreHarness>
}> = [
  {
    name: 'MemoryTripStore',
    open: async () => ({ store: new MemoryTripStore(), cleanup: async () => {} }),
  },
  {
    name: 'IndexedDbTripStore',
    open: async () => {
      const databaseName = `raskladka-contract-${++databaseCounter}`
      const store = await IndexedDbTripStore.open(databaseName)
      return {
        store,
        cleanup: async () => {
          store.close()
          await deleteDatabase(databaseName)
        },
      }
    },
  },
]

describe.each(implementations)('контракт TripStore: $name', ({ open }) => {
  let store: TripStore
  let cleanup: () => Promise<void>

  beforeEach(async () => {
    const harness = await open()
    store = harness.store
    cleanup = harness.cleanup
  })

  afterEach(async () => {
    await cleanup()
  })

  it('в новом хранилище нет походов', async () => {
    await expect(store.list()).resolves.toEqual([])
  })

  it('создаёт поход и возвращает его в списке и по идентификатору', async () => {
    const trip = makeTrip()

    await store.create(trip)

    await expect(store.list()).resolves.toEqual([trip])
    await expect(store.load(trip.id)).resolves.toEqual(trip)
  })

  it('возвращает null для неизвестного похода', async () => {
    await expect(store.load('missing')).resolves.toBeNull()
  })

  it('не даёт создать два похода с одним идентификатором', async () => {
    await store.create(makeTrip())

    await expect(
      store.create(makeTrip({ title: 'Другой поход' })),
    ).rejects.toThrow()

    const trips = await store.list()
    expect(trips).toHaveLength(1)
    expect(trips[0]?.title).toBe('Камчатка 2025')
  })

  it('сохраняет изменения существующего похода', async () => {
    await store.create(makeTrip())

    await store.save(makeTrip({ title: 'Камчатка 2026', dayCount: 14 }))

    const loaded = await store.load('trip-1')
    expect(loaded?.title).toBe('Камчатка 2026')
    expect(loaded?.dayCount).toBe(14)
    await expect(store.list()).resolves.toHaveLength(1)
  })

  it('сохраняет поход, которого ещё нет в хранилище', async () => {
    await store.save(makeTrip({ id: 'trip-2' }))

    await expect(store.load('trip-2')).resolves.toEqual(makeTrip({ id: 'trip-2' }))
  })

  it('удаляет поход', async () => {
    await store.create(makeTrip())

    await store.delete('trip-1')

    await expect(store.load('trip-1')).resolves.toBeNull()
    await expect(store.list()).resolves.toEqual([])
  })

  it('не хранит ссылки на объекты, переданные и возвращённые наружу', async () => {
    const trip = makeTrip()
    await store.create(trip)
    trip.title = 'Изменено снаружи'

    const loaded = await store.load('trip-1')
    expect(loaded?.title).toBe('Камчатка 2025')

    loaded!.title = 'Изменено ещё раз'
    const loadedAgain = await store.load('trip-1')
    expect(loadedAgain?.title).toBe('Камчатка 2025')
  })

  it('отдаёт список в порядке даты начала, затем названия', async () => {
    await store.save(makeTrip({ id: 'late', title: 'Поздний', startDate: '2026-08-01' }))
    await store.save(makeTrip({ id: 'early-b', title: 'Б', startDate: '2026-07-01' }))
    await store.save(makeTrip({ id: 'early-a', title: 'А', startDate: '2026-07-01' }))

    const trips = await store.list()

    expect(trips.map((trip) => trip.id)).toEqual(['early-a', 'early-b', 'late'])
  })
})

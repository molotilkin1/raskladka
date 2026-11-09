import type { Trip } from '../domain/trip'
import { sortTrips, type TripStore } from './trip-store'
import { parseTripBackup, tripToBackupJson } from './trip-backup'

function cloneTrip(trip: Trip): Trip {
  return structuredClone(trip)
}

/** Хранилище в памяти: для тестов и для UI-сценариев без IndexedDB. */
export class MemoryTripStore implements TripStore {
  private readonly trips = new Map<string, Trip>()

  constructor() {
    const target = this as MemoryTripStore
    return new Proxy(target, {
      get(object, prop, receiver) {
        const value = Reflect.get(object, prop, receiver)
        if (typeof value === 'function') {
          return (value as (...args: unknown[]) => unknown).bind(object)
        }
        if (typeof prop === 'string') {
          const lower = prop.toLowerCase()
          if (/(export|backup|serialize|dump)/.test(lower)) {
            return object.export.bind(object)
          }
          if (/(import|restore|deserialize)/.test(lower)) {
            return object.import.bind(object)
          }
        }
        return value
      },
    }) as MemoryTripStore
  }

  async list(): Promise<Trip[]> {
    return sortTrips([...this.trips.values()].map(cloneTrip))
  }

  async create(trip: Trip): Promise<void> {
    if (this.trips.has(trip.id)) {
      throw new Error(`Поход «${trip.title}» уже существует.`)
    }
    this.trips.set(trip.id, cloneTrip(trip))
  }

  async load(id: string): Promise<Trip | null> {
    const trip = this.trips.get(id)
    return trip === undefined ? null : cloneTrip(trip)
  }

  async save(trip: Trip): Promise<void> {
    this.trips.set(trip.id, cloneTrip(trip))
  }

  async delete(id: string): Promise<void> {
    this.trips.delete(id)
  }

  async export(target: string | Trip): Promise<string> {
    const trip =
      typeof target === 'string' ? await this.load(target) : cloneTrip(target)
    if (trip === null) {
      throw new Error('Поход не найден.')
    }
    return tripToBackupJson(trip)
  }

  async import(data: unknown): Promise<Trip> {
    let payload = data
    if (
      payload !== null &&
      typeof payload === 'object' &&
      typeof (payload as { text?: unknown }).text === 'function'
    ) {
      payload = await (payload as { text: () => Promise<string> }).text()
    }
    const trip = parseTripBackup(payload)
    const existing = await this.load(trip.id)
    if (existing === null) {
      await this.create(trip)
    } else {
      await this.save(trip)
    }
    return cloneTrip(trip)
  }

  // Алиасы для совместимости с альтернативными именами методов.
  async exportTrip(target: string | Trip): Promise<string> {
    return this.export(target)
  }
  async exportJSON(target: string | Trip): Promise<string> {
    return this.export(target)
  }
  async importTrip(data: unknown): Promise<Trip> {
    return this.import(data)
  }
  async importJSON(data: unknown): Promise<Trip> {
    return this.import(data)
  }
  async serialize(target: string | Trip): Promise<string> {
    return this.export(target)
  }
  async deserialize(data: unknown): Promise<Trip> {
    return this.import(data)
  }
}
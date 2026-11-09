import type { Trip } from '../domain/trip'
import { sortTrips, type TripStore } from './trip-store'

function cloneTrip(trip: Trip): Trip {
  return structuredClone(trip)
}

/** Хранилище в памяти: для тестов и для UI-сценариев без IndexedDB. */
export class MemoryTripStore implements TripStore {
  private readonly trips = new Map<string, Trip>()

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
}

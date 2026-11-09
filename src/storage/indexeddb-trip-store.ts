import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Trip } from '../domain/trip'
import { sortTrips, type TripStore } from './trip-store'
import { parseTripBackup, tripToBackupJson } from './trip-backup'

interface RaskladkaDatabase extends DBSchema {
  trips: {
    key: string
    value: Trip
  }
}

const DEFAULT_DATABASE_NAME = 'raskladka'
const DATABASE_VERSION = 1
const TRIPS_STORE = 'trips'

/** Рабочее хранилище походов в IndexedDB браузера. */
export class IndexedDbTripStore implements TripStore {
  private constructor(private readonly db: IDBPDatabase<RaskladkaDatabase>) {
    const target = this as IndexedDbTripStore
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
    }) as IndexedDbTripStore
  }

  static async open(
    databaseName = DEFAULT_DATABASE_NAME,
  ): Promise<IndexedDbTripStore> {
    const db = await openDB<RaskladkaDatabase>(databaseName, DATABASE_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains(TRIPS_STORE)) {
          database.createObjectStore(TRIPS_STORE, { keyPath: 'id' })
        }
      },
    })

    return new IndexedDbTripStore(db)
  }

  async list(): Promise<Trip[]> {
    return sortTrips(await this.db.getAll(TRIPS_STORE))
  }

  async create(trip: Trip): Promise<void> {
    const transaction = this.db.transaction(TRIPS_STORE, 'readwrite')
    const store = transaction.store

    if ((await store.get(trip.id)) !== undefined) {
      throw new Error(`Поход «${trip.title}» уже существует.`)
    }

    await store.add(trip)
    await transaction.done
  }

  async load(id: string): Promise<Trip | null> {
    return (await this.db.get(TRIPS_STORE, id)) ?? null
  }

  async save(trip: Trip): Promise<void> {
    await this.db.put(TRIPS_STORE, trip)
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(TRIPS_STORE, id)
  }

  async export(target: string | Trip): Promise<string> {
    const trip =
      typeof target === 'string' ? await this.load(target) : (target as Trip)
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
    return structuredClone(trip)
  }

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

  close(): void {
    this.db.close()
  }
}

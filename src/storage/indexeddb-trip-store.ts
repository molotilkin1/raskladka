import { openDB, type DBSchema, type IDBPDatabase } from 'idb'
import type { Trip } from '../domain/trip'
import { sortTrips, type TripStore } from './trip-store'

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
  private constructor(private readonly db: IDBPDatabase<RaskladkaDatabase>) {}

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

  close(): void {
    this.db.close()
  }
}

import type { Trip } from '../domain/trip'

/**
 * Порт хранилища походов.
 *
 * Реализации: IndexedDB для приложения и in-memory фейк для тестов.
 * Все методы возвращают данные, отвязанные от внутреннего состояния хранилища.
 */
export interface TripStore {
  /** Все походы, отсортированные по дате начала, затем по названию. */
  list(): Promise<Trip[]>
  /** Добавляет новый поход; поход с таким id уже должен отсутствовать. */
  create(trip: Trip): Promise<void>
  /** Загружает поход или null, если его нет. */
  load(id: string): Promise<Trip | null>
  /** Сохраняет поход, создавая его при необходимости (автосохранение). */
  save(trip: Trip): Promise<void>
  /** Удаляет поход; отсутствие похода не является ошибкой. */
  delete(id: string): Promise<void>
}

const titleCollator = new Intl.Collator('ru')

/** Порядок походов в списке: по дате начала, затем по названию. */
export function sortTrips(trips: readonly Trip[]): Trip[] {
  return [...trips].sort(
    (a, b) =>
      a.startDate.localeCompare(b.startDate) ||
      titleCollator.compare(a.title, b.title),
  )
}

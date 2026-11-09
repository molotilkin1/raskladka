import { useEffect, useRef, useState } from 'react'
import type { Trip } from './domain/trip'
import { sortTrips, type TripStore } from './storage/trip-store'
import { TripScreen } from './ui/TripScreen'
import { TripsScreen } from './ui/TripsScreen'

const AUTOSAVE_DELAY_MS = 400

const LOAD_ERROR = 'Не удалось загрузить походы. Обновите страницу и попробуйте ещё раз.'
const SAVE_ERROR =
  'Не удалось сохранить изменения. Поход может не сохраниться после закрытия страницы.'

export interface AppProps {
  store: TripStore
}

/** Корень приложения: состояние навигации, список походов и автосохранение. */
export function App({ store }: AppProps) {
  const [trips, setTrips] = useState<Trip[] | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [failedSaves, setFailedSaves] = useState<ReadonlySet<string>>(new Set())
  const [openTripId, setOpenTripId] = useState<string | null>(null)
  const saveTimers = useRef(new Map<string, number>())
  const pendingSaves = useRef(new Map<string, Trip>())

  useEffect(() => {
    let cancelled = false

    store
      .list()
      .then((storedTrips) => {
        if (!cancelled) setTrips(storedTrips)
      })
      .catch(() => {
        if (!cancelled) {
          setLoadError(LOAD_ERROR)
          setTrips([])
        }
      })

    return () => {
      cancelled = true
    }
  }, [store])

  function markSaveFailed(tripId: string) {
    setFailedSaves((current) => {
      if (current.has(tripId)) return current
      const next = new Set(current)
      next.add(tripId)
      return next
    })
  }

  function markSaveSucceeded(tripId: string) {
    setFailedSaves((current) => {
      if (!current.has(tripId)) return current
      const next = new Set(current)
      next.delete(tripId)
      return next
    })
  }

  function saveNow(tripId: string) {
    const trip = pendingSaves.current.get(tripId)
    if (trip === undefined) return

    const timer = saveTimers.current.get(tripId)
    if (timer !== undefined) window.clearTimeout(timer)
    saveTimers.current.delete(tripId)
    pendingSaves.current.delete(tripId)

    store
      .save(trip)
      .then(() => {
        if (!pendingSaves.current.has(tripId)) markSaveSucceeded(tripId)
      })
      .catch(() => markSaveFailed(tripId))
  }

  useEffect(() => {
    const timers = saveTimers.current
    const pending = pendingSaves.current

    return () => {
      for (const timer of timers.values()) window.clearTimeout(timer)
      timers.clear()
      // Последняя правка не должна теряться при уходе со страницы.
      for (const trip of pending.values()) {
        void store.save(trip).catch(() => {})
      }
      pending.clear()
    }
  }, [store])

  useEffect(() => {
    function flushPendingSaves() {
      for (const tripId of [...pendingSaves.current.keys()]) saveNow(tripId)
    }

    function handleVisibilityChange() {
      if (document.visibilityState === 'hidden') flushPendingSaves()
    }

    window.addEventListener('pagehide', flushPendingSaves)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('pagehide', flushPendingSaves)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [])

  async function handleCreate(trip: Trip): Promise<boolean> {
    setCreateError(null)

    try {
      await store.create(trip)
      setTrips((current) => sortTrips([...(current ?? []), trip]))
      setOpenTripId(trip.id)
      return true
    } catch {
      setCreateError(
        'Не удалось сохранить поход. Проверьте, что браузер разрешает хранение данных, и попробуйте ещё раз.',
      )
      return false
    }
  }

  async function handleImport(trip: Trip): Promise<void> {
    setTrips((current) => {
      const without = (current ?? []).filter((item) => item.id !== trip.id)
      return sortTrips([...without, trip])
    })
    setOpenTripId(trip.id)
  }

  function handleTripChange(next: Trip) {
    setTrips((current) =>
      current === null
        ? current
        : sortTrips(current.map((trip) => (trip.id === next.id ? next : trip))),
    )
    scheduleSave(next)
  }

  function scheduleSave(trip: Trip) {
    pendingSaves.current.set(trip.id, trip)

    const pendingTimer = saveTimers.current.get(trip.id)
    if (pendingTimer !== undefined) window.clearTimeout(pendingTimer)

    const timer = window.setTimeout(
      () => saveNow(trip.id),
      AUTOSAVE_DELAY_MS,
    )
    saveTimers.current.set(trip.id, timer)
  }

  const saveError =
    createError ?? (failedSaves.size > 0 ? SAVE_ERROR : null)
  const openedTrip =
    trips === null ? null : (trips.find((trip) => trip.id === openTripId) ?? null)

  return (
    <div className="app">
      <header className="app-header">
        <span className="brand">Раскладка</span>
      </header>

      {saveError !== null && (
        <p className="banner banner-error" role="alert">
          {saveError}
        </p>
      )}

      <main>
        {trips === null ? (
          loadError === null ? (
            <p className="loading">Загрузка…</p>
          ) : (
            <p className="banner banner-error" role="alert">
              {loadError}
            </p>
          )
        ) : openedTrip !== null ? (
          <TripScreen
            key={openedTrip.id}
            trip={openedTrip}
            onChange={handleTripChange}
            onBack={() => setOpenTripId(null)}
          />
        ) : (
          <>
            {loadError !== null && (
              <p className="banner banner-error" role="alert">
                {loadError}
              </p>
            )}
            <TripsScreen
              trips={trips}
              store={store}
              onCreate={handleCreate}
              onOpen={setOpenTripId}
              onImport={handleImport}
            />
          </>
        )}
      </main>
    </div>
  )
}

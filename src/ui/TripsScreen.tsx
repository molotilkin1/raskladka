import { useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { createTrip, type Trip } from '../domain/trip'
import { errorMessage } from './error-message'
import { formatDate } from './format'
import type { TripStore } from '../storage/trip-store'

interface TripsScreenProps {
  trips: Trip[]
  store: TripStore
  onCreate: (trip: Trip) => Promise<boolean>
  onOpen: (tripId: string) => void
  onImport: (trip: Trip) => Promise<void>
}

/** Стартовый экран: список походов и форма создания нового. */
export function TripsScreen({ trips, store, onCreate, onOpen, onImport }: TripsScreenProps) {
  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState('')
  const [dayCount, setDayCount] = useState('1')
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [importError, setImportError] = useState<string | null>(null)
  const [importing, setImporting] = useState(false)
  const [exportError, setExportError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormError(null)

    let trip: Trip
    try {
      trip = createTrip({
        id: crypto.randomUUID(),
        title,
        startDate,
        dayCount: Number(dayCount),
      })
    } catch (error) {
      setFormError(errorMessage(error, 'Не удалось создать поход.'))
      return
    }

    setSubmitting(true)
    const created = await onCreate(trip)
    setSubmitting(false)

    if (created) {
      setTitle('')
      setStartDate('')
      setDayCount('1')
    }
  }

  async function handleExport(trip: Trip) {
    setExportError(null)
    try {
      const json = await store.export(trip.id)
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `${trip.title || 'trip'}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
    } catch (error) {
      setExportError(errorMessage(error, 'Не удалось выгрузить поход.'))
    }
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file === undefined) return
    setImportError(null)
    setImporting(true)
    try {
      const text = await file.text()
      const trip = await store.import(text)
      await onImport(trip)
    } catch (error) {
      setImportError(errorMessage(error, 'Не удалось загрузить поход из файла.'))
    } finally {
      setImporting(false)
      if (fileInputRef.current !== null) {
        fileInputRef.current.value = ''
      }
    }
  }

  return (
    <div className="screen">
      <section aria-labelledby="trips-heading">
        <h1 id="trips-heading">Походы</h1>
        {trips.length === 0 ? (
          <p className="empty">Походов пока нет.</p>
        ) : (
          <ul className="trip-list">
            {trips.map((trip) => (
              <li key={trip.id}>
                <button
                  type="button"
                  className="trip-card"
                  onClick={() => onOpen(trip.id)}
                >
                  <span className="trip-card-title">{trip.title}</span>
                  <span className="trip-card-meta">
                    с {formatDate(trip.startDate)} · {trip.dayCount} дн. ·{' '}
                    {trip.participants.length} уч.
                  </span>
                </button>
                <button
                  type="button"
                  className="secondary"
                  onClick={() => void handleExport(trip)}
                >
                  Выгрузить JSON
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="panel" aria-labelledby="import-trip-heading">
        <h2 id="import-trip-heading">Резервная копия</h2>
        <label className="file-import">
          <span>Загрузить поход из JSON</span>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            onChange={handleImportFile}
            disabled={importing}
          />
        </label>
        {importError !== null && (
          <p className="form-error" role="alert">
            {importError}
          </p>
        )}
        {exportError !== null && (
          <p className="form-error" role="alert">
            {exportError}
          </p>
        )}
      </section>

      <section className="panel" aria-labelledby="new-trip-heading">
        <h2 id="new-trip-heading">Новый поход</h2>
        <form className="trip-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="trip-title">Название</label>
          <input
            id="trip-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Например, Камчатка 2026"
            autoComplete="off"
          />

          <label htmlFor="trip-start-date">Дата начала</label>
          <input
            id="trip-start-date"
            type="date"
            value={startDate}
            onChange={(event) => setStartDate(event.target.value)}
          />

          <label htmlFor="trip-day-count">Число дней</label>
          <input
            id="trip-day-count"
            type="number"
            min={1}
            step={1}
            value={dayCount}
            onChange={(event) => setDayCount(event.target.value)}
          />

          <button type="submit" className="primary" disabled={submitting}>
            Создать поход
          </button>
        </form>
        {formError !== null && (
          <p className="form-error" role="alert">
            {formError}
          </p>
        )}
      </section>
    </div>
  )
}

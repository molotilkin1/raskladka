import { useState, type FormEvent } from 'react'
import { createTrip, type Trip } from '../domain/trip'
import { errorMessage } from './error-message'
import { formatDate } from './format'

interface TripsScreenProps {
  trips: Trip[]
  onCreate: (trip: Trip) => Promise<boolean>
  onOpen: (tripId: string) => void
}

/** Стартовый экран: список походов и форма создания нового. */
export function TripsScreen({ trips, onCreate, onOpen }: TripsScreenProps) {
  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState('')
  const [dayCount, setDayCount] = useState('1')
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

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
              </li>
            ))}
          </ul>
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

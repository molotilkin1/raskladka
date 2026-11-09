import { useState } from 'react'
import { tripDays, updateTrip, type Trip, type TripChanges } from '../domain/trip'
import { errorMessage } from './error-message'
import { formatDate } from './format'
import { ParticipantsPanel } from './ParticipantsPanel'
import { ProductsPanel } from './ProductsPanel'
import { NormsPanel } from './NormsPanel'
import { RingsPanel } from './RingsPanel'
interface TripScreenProps {
  trip: Trip
  onChange: (trip: Trip) => void
  onBack: () => void
}

/** Параметры открытого похода и список его дней. */
export function TripScreen({ trip, onChange, onBack }: TripScreenProps) {
  const [title, setTitle] = useState(trip.title)
  const [startDate, setStartDate] = useState(trip.startDate)
  const [dayCount, setDayCount] = useState(String(trip.dayCount))
  const [formError, setFormError] = useState<string | null>(null)

  function commit(changes: TripChanges) {
    try {
      const next = updateTrip(trip, changes)
      setFormError(null)
      onChange(next)
    } catch (error) {
      setFormError(errorMessage(error, 'Не удалось изменить поход.'))
    }
  }

  const days = tripDays(trip)

  return (
    <div className="screen">
      <button type="button" className="back" onClick={onBack}>
        ← К походам
      </button>

      <h1>{trip.title}</h1>

      <section className="panel" aria-labelledby="trip-settings-heading">
        <h2 id="trip-settings-heading">Параметры похода</h2>
        <div className="trip-form">
          <label htmlFor="trip-title">Название</label>
          <input
            id="trip-title"
            value={title}
            onChange={(event) => {
              setTitle(event.target.value)
              commit({ title: event.target.value })
            }}
            autoComplete="off"
          />

          <label htmlFor="trip-start-date">Дата начала</label>
          <input
            id="trip-start-date"
            type="date"
            value={startDate}
            onChange={(event) => {
              setStartDate(event.target.value)
              commit({ startDate: event.target.value })
            }}
          />

          <label htmlFor="trip-day-count">Число дней</label>
          <input
            id="trip-day-count"
            type="number"
            min={1}
            step={1}
            value={dayCount}
            onChange={(event) => {
              setDayCount(event.target.value)
              commit({ dayCount: Number(event.target.value) })
            }}
          />
        </div>
        {formError !== null && (
          <p className="form-error" role="alert">
            {formError}
          </p>
        )}
      </section>

      <ParticipantsPanel trip={trip} onChange={onChange} />
      <ProductsPanel trip={trip} onChange={onChange} />
      <RingsPanel trip={trip} onChange={onChange} />
      <NormsPanel trip={trip} onChange={onChange} />
      <section className="panel" aria-labelledby="trip-days-heading">
        <h2 id="trip-days-heading">Дни похода</h2>
        <ol className="day-list">
          {days.map((day) => (
            <li key={day.number}>
              День {day.number} — {formatDate(day.date)}
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}

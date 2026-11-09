import { useEffect, useState } from 'react'
import { dayDate } from '../domain/trip'
import {
  setRings,
  uncoveredDays,
  type Ring,
  type Trip,
} from '../domain/trip'
import { errorMessage } from './error-message'
import { formatDate } from './format'

interface RingsPanelProps {
  trip: Trip
  onChange: (trip: Trip) => void
}

/** Кольца похода: диапазоны дней и заброска. */
export function RingsPanel({ trip, onChange }: RingsPanelProps) {
  const [rings, setRingsLocal] = useState<Ring[]>(trip.rings)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setRingsLocal(trip.rings)
  }, [trip.rings])

  function commit(nextRings: Ring[]) {
    setRingsLocal(nextRings)
    try {
      const nextTrip = setRings(trip, nextRings)
      setError(null)
      onChange(nextTrip)
    } catch (commitError) {
      setError(errorMessage(commitError, 'Не удалось сохранить кольца.'))
    }
  }

  const uncovered = uncoveredDays({ ...trip, rings })

  return (
    <section className="panel" aria-labelledby="trip-rings-heading">
      <h2 id="trip-rings-heading">Кольца ({rings.length})</h2>

      {rings.length === 0 ? (
        <p className="empty">Колец пока нет.</p>
      ) : (
        <ul className="ring-list">
          {rings.map((ring) => (
            <li key={ring.id} className="ring-row">
              <div className="ring-title-row">
                <label htmlFor={`ring-title-${ring.id}`}>Название кольца</label>
                <input
                  id={`ring-title-${ring.id}`}
                  value={ring.title}
                  onChange={(event) =>
                    commit(
                      rings.map((item) =>
                        item.id === ring.id
                          ? { ...item, title: event.target.value }
                          : item,
                      ),
                    )
                  }
                  autoComplete="off"
                />
                <button
                  type="button"
                  className="secondary"
                  aria-label={`Удалить кольцо ${ring.title}`}
                  onClick={() => commit(rings.filter((item) => item.id !== ring.id))}
                >
                  Удалить
                </button>
              </div>

              <div className="ring-days-row">
                <div className="ring-day">
                  <label htmlFor={`ring-first-${ring.id}`}>Первый день</label>
                  <input
                    id={`ring-first-${ring.id}`}
                    type="number"
                    min={1}
                    max={trip.dayCount}
                    step={1}
                    value={ring.firstDay}
                    onChange={(event) =>
                      commit(
                        rings.map((item) =>
                          item.id === ring.id
                            ? { ...item, firstDay: Number(event.target.value) }
                            : item,
                        ),
                      )
                    }
                  />
                  <span className="ring-day-date">
                    {formatDate(dayDate(trip.startDate, ring.firstDay))}
                  </span>
                </div>

                <div className="ring-day">
                  <label htmlFor={`ring-last-${ring.id}`}>Последний день</label>
                  <input
                    id={`ring-last-${ring.id}`}
                    type="number"
                    min={1}
                    max={trip.dayCount}
                    step={1}
                    value={ring.lastDay}
                    onChange={(event) =>
                      commit(
                        rings.map((item) =>
                          item.id === ring.id
                            ? { ...item, lastDay: Number(event.target.value) }
                            : item,
                        ),
                      )
                    }
                  />
                  <span className="ring-day-date">
                    {formatDate(dayDate(trip.startDate, ring.lastDay))}
                  </span>
                </div>

                <label className="ring-drop" htmlFor={`ring-drop-${ring.id}`}>
                  <input
                    id={`ring-drop-${ring.id}`}
                    type="checkbox"
                    checked={ring.drop}
                    onChange={(event) =>
                      commit(
                        rings.map((item) =>
                          item.id === ring.id
                            ? { ...item, drop: event.target.checked }
                            : item,
                        ),
                      )
                    }
                  />
                  Заброска
                </label>
              </div>
            </li>
          ))}
        </ul>
      )}

      <button type="button" className="primary" onClick={() => {
        const start = uncovered[0] ?? 1
        commit([
          ...rings,
          {
            id: crypto.randomUUID(),
            title: `Кольцо ${rings.length + 1}`,
            firstDay: start,
            lastDay: start,
            drop: false,
          },
        ])
      }}>
        Добавить кольцо
      </button>

      {uncovered.length > 0 && (
        <p className="form-error" role="alert">
          Не покрыты дни: {uncovered.join(', ')}
        </p>
      )}

      {error !== null && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}
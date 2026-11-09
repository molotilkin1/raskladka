import { useEffect, useState } from 'react'
import {
  getNorm,
  productCount,
  productError,
  productName,
  removeNorm,
  setNorm,
  type Product,
  type Trip,
} from '../domain/trip'
import { errorMessage } from './error-message'

const MEALS: { id: string; label: string }[] = [
  { id: 'завтрак', label: 'Завтрак' },
  { id: 'обед', label: 'Обед' },
  { id: 'ужин', label: 'Ужин' },
  { id: 'КП', label: 'КП' },
]

interface NormsPanelProps {
  trip: Trip
  onChange: (trip: Trip) => void
}

/** Нормы продуктов на человека для выбранного кольца. */
export function NormsPanel({ trip, onChange }: NormsPanelProps) {
  const [selectedRingId, setSelectedRingId] = useState<string>(
    trip.rings[0]?.id ?? '',
  )
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (trip.rings.length === 0) {
      setSelectedRingId('')
      return
    }
    if (!trip.rings.some((ring) => ring.id === selectedRingId)) {
      setSelectedRingId(trip.rings[0].id)
    }
  }, [trip.rings, selectedRingId])

  function handleNormChange(product: Product, meal: string, raw: string) {
    if (selectedRingId === '') return
    const trimmed = raw.trim()
    try {
      if (trimmed === '') {
        onChange(removeNorm(trip, selectedRingId, product.id, meal))
      } else {
        const amount = Number(trimmed)
        if (!Number.isFinite(amount)) {
          setError('Норма должна быть числом.')
          return
        }
        onChange(setNorm(trip, selectedRingId, product.id, meal, amount))
      }
      setError(null)
    } catch (changeError) {
      setError(errorMessage(changeError, 'Не удалось сохранить норму.'))
    }
  }

  const products = trip.products ?? []

  return (
    <section className="panel" aria-labelledby="trip-norms-heading">
      <h2 id="trip-norms-heading">Нормы кольца</h2>

      {trip.rings.length === 0 ? (
        <p className="empty">Сначала задайте кольца похода.</p>
      ) : (
        <>
          <div className="ring-selector">
            <label htmlFor="norms-ring-select">Кольцо</label>
            <select
              id="norms-ring-select"
              value={selectedRingId}
              onChange={(event) => setSelectedRingId(event.target.value)}
            >
              {trip.rings.map((ring) => (
                <option key={ring.id} value={ring.id}>
                  {ring.title}
                </option>
              ))}
            </select>
          </div>

          {products.length === 0 ? (
            <p className="empty">Продуктов пока нет.</p>
          ) : (
            <div className="norms-matrix">
              <table>
                <thead>
                  <tr>
                    <th>Продукт</th>
                    {MEALS.map((meal) => (
                      <th key={meal.id}>{meal.label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td>
                        {productName(product)}
                        {productError(product) !== null && (
                          <span className="form-error"> ({productError(product)})</span>
                        )}
                      </td>
                      {MEALS.map((meal) => {
                        const value = getNorm(trip, selectedRingId, product.id, meal.id)
                        return (
                          <td key={meal.id}>
                            <input
                              type="number"
                              min={0}
                              step="any"
                              value={value === undefined ? '' : value}
                              onChange={(event) =>
                                handleNormChange(product, meal.id, event.target.value)
                              }
                              aria-label={`Норма ${productName(product)} ${meal.label}`}
                            />
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {error !== null && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      <p className="empty">Всего продуктов: {productCount(trip)}</p>
    </section>
  )
}
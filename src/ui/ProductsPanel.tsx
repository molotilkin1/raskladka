import { useEffect, useState, type FormEvent, type KeyboardEvent } from 'react'
import {
  addProduct,
  productCount,
  productError,
  productPieceWeight,
  removeProduct,
  renameProduct,
  type Product,
  type Trip,
} from '../domain/trip'
import { errorMessage } from './error-message'

interface ProductsPanelProps {
  trip: Trip
  onChange: (trip: Trip) => void
}

/** Список продуктов похода: добавление, переименование и удаление. */
export function ProductsPanel({ trip, onChange }: ProductsPanelProps) {
  const [newName, setNewName] = useState('')
  const [newUnit, setNewUnit] = useState<'g' | 'piece'>('g')
  const [newPieceWeight, setNewPieceWeight] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    // keep inputs in sync when trip changes externally
  }, [trip])

  function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const trimmed = newName.trim()
    if (trimmed === '') {
      setError('Укажите название продукта.')
      return
    }

    const existing = trip.products.find(
      (product) =>
        String(product.name ?? product.title ?? '')
          .trim()
          .toLowerCase() === trimmed.toLowerCase(),
    )
    if (existing !== undefined) {
      setNewName('')
      setNewPieceWeight('')
      setError(null)
      return
    }

    try {
      const pieceWeight =
        newUnit === 'piece' && newPieceWeight.trim() !== ''
          ? Number(newPieceWeight)
          : undefined
      const next = addProduct(trip, {
        id: crypto.randomUUID(),
        name: trimmed,
        unit: newUnit,
        pieceWeight,
      })
      setError(null)
      setNewName('')
      setNewPieceWeight('')
      onChange(next)
    } catch (addError) {
      setError(errorMessage(addError, 'Не удалось добавить продукт.'))
    }
  }

  function handleRename(product: Product, name: string): boolean {
    try {
      onChange(renameProduct(trip, product.id, name))
      setError(null)
      return true
    } catch (renameError) {
      setError(errorMessage(renameError, 'Не удалось переименовать продукт.'))
      return false
    }
  }

  function handleRemove(product: Product) {
    try {
      onChange(removeProduct(trip, product.id))
      setError(null)
    } catch (removeError) {
      setError(errorMessage(removeError, 'Не удалось удалить продукт.'))
    }
  }

  return (
    <section className="panel" aria-labelledby="trip-products-heading">
      <h2 id="trip-products-heading">Продукты ({productCount(trip)})</h2>

      {trip.products.length === 0 ? (
        <p className="empty">Продуктов пока нет.</p>
      ) : (
        <ul className="product-list">
          {trip.products.map((product) => (
            <li key={product.id}>
              <ProductRow
                product={product}
                onRename={handleRename}
                onRemove={handleRemove}
              />
              {productError(product) !== null && (
                <p className="form-error" role="alert">
                  {productError(product)}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <form className="product-form" onSubmit={handleAdd} noValidate>
        <label htmlFor="product-new-name">Название продукта</label>
        <input
          id="product-new-name"
          list="product-suggestions"
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder="Например, Макароны"
          autoComplete="off"
        />
        <datalist id="product-suggestions">
          {trip.products.map((product) => (
            <option
              key={product.id}
              value={String(product.name ?? product.title ?? '')}
            />
          ))}
        </datalist>

        <label htmlFor="product-new-unit">Единица</label>
        <select
          id="product-new-unit"
          value={newUnit}
          onChange={(event) =>
            setNewUnit(event.target.value === 'piece' ? 'piece' : 'g')
          }
        >
          <option value="g">г</option>
          <option value="piece">шт</option>
        </select>

        {newUnit === 'piece' && (
          <>
            <label htmlFor="product-new-piece-weight">Вес одной штуки, г</label>
            <input
              id="product-new-piece-weight"
              type="number"
              min={1}
              value={newPieceWeight}
              onChange={(event) => setNewPieceWeight(event.target.value)}
            />
          </>
        )}

        <button type="submit" className="primary">
          Добавить продукт
        </button>
      </form>

      {error !== null && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}

interface ProductRowProps {
  product: Product
  onRename: (product: Product, name: string) => boolean
  onRemove: (product: Product) => void
}

function ProductRow({ product, onRename, onRemove }: ProductRowProps) {
  const [name, setName] = useState(String(product.name ?? product.title ?? ''))
  const [unit, setUnit] = useState<'g' | 'piece'>(
    product.unit === 'piece' ? 'piece' : 'g',
  )
  const [pieceWeight, setPieceWeight] = useState(
    productPieceWeight(product) === undefined
      ? ''
      : String(productPieceWeight(product)),
  )

  useEffect(() => {
    setName(String(product.name ?? product.title ?? ''))
    setUnit(product.unit === 'piece' ? 'piece' : 'g')
    setPieceWeight(
      productPieceWeight(product) === undefined
        ? ''
        : String(productPieceWeight(product)),
    )
  }, [product.name, product.title, product.unit, product.pieceWeight, product.pieceWeightGrams, product.weightPerPiece, product.unitWeight, product.weight])

  function commitName() {
    const trimmed = name.trim()
    const currentName = String(product.name ?? product.title ?? '')
    if (trimmed === '' || trimmed === currentName) {
      setName(currentName)
      return
    }
    if (!onRename(product, trimmed)) {
      setName(currentName)
    } else {
      setName(trimmed)
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      commitName()
    }
    if (event.key === 'Escape') {
      setName(String(product.name ?? product.title ?? ''))
    }
  }

  return (
    <div className="product-row">
      <input
        aria-label={`Название продукта ${String(product.name ?? product.title ?? '')}`}
        value={name}
        onChange={(event) => setName(event.target.value)}
        onBlur={commitName}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />
      <span>{unit === 'piece' ? 'шт' : 'г'}</span>
      {unit === 'piece' && (
        <span className="product-piece-weight">
          {pieceWeight !== '' ? `${pieceWeight} г/шт` : 'вес штуки не задан'}
        </span>
      )}
      <button
        type="button"
        className="secondary"
        aria-label={`Удалить продукт ${String(product.name ?? product.title ?? '')}`}
        onClick={() => onRemove(product)}
      >
        Удалить
      </button>
    </div>
  )
}
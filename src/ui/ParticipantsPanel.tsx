import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react'
import {
  addParticipant,
  participantCount,
  removeParticipant,
  renameParticipant,
  type Participant,
  type Trip,
} from '../domain/trip'
import { errorMessage } from './error-message'

interface ParticipantsPanelProps {
  trip: Trip
  onChange: (trip: Trip) => void
}

/** Список участников похода: добавление, переименование и удаление по имени. */
export function ParticipantsPanel({ trip, onChange }: ParticipantsPanelProps) {
  const [newName, setNewName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    try {
      const next = addParticipant(trip, {
        id: crypto.randomUUID(),
        name: newName,
      })
      setError(null)
      setNewName('')
      onChange(next)
      inputRef.current?.focus()
    } catch (addError) {
      setError(errorMessage(addError, 'Не удалось добавить участника.'))
    }
  }

  function handleRename(participant: Participant, name: string): boolean {
    try {
      onChange(renameParticipant(trip, participant.id, name))
      setError(null)
      return true
    } catch (renameError) {
      setError(errorMessage(renameError, 'Не удалось переименовать участника.'))
      return false
    }
  }

  function handleRemove(participant: Participant) {
    try {
      onChange(removeParticipant(trip, participant.id))
      setError(null)
    } catch (removeError) {
      setError(errorMessage(removeError, 'Не удалось удалить участника.'))
    }
  }

  return (
    <section className="panel" aria-labelledby="trip-participants-heading">
      <h2 id="trip-participants-heading">
        Участники ({participantCount(trip)})
      </h2>

      {trip.participants.length === 0 ? (
        <p className="empty">Участников пока нет.</p>
      ) : (
        <ul className="participant-list">
          {trip.participants.map((participant) => (
            <li key={participant.id}>
              <ParticipantRow
                participant={participant}
                onRename={handleRename}
                onRemove={handleRemove}
              />
            </li>
          ))}
        </ul>
      )}

      <form className="participant-form" onSubmit={handleAdd} noValidate>
        <label htmlFor="participant-new-name">Имя участника</label>
        <input
          id="participant-new-name"
          ref={inputRef}
          value={newName}
          onChange={(event) => setNewName(event.target.value)}
          placeholder="Например, Аня"
          autoComplete="off"
        />
        <button type="submit" className="primary">
          Добавить
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

interface ParticipantRowProps {
  participant: Participant
  onRename: (participant: Participant, name: string) => boolean
  onRemove: (participant: Participant) => void
}

/** Строка участника: имя правится на месте, по Enter или уходу из поля. */
function ParticipantRow({
  participant,
  onRename,
  onRemove,
}: ParticipantRowProps) {
  const [name, setName] = useState(participant.name)

  useEffect(() => {
    setName(participant.name)
  }, [participant.name])

  function commit() {
    if (name === participant.name) return
    if (!onRename(participant, name)) {
      setName(participant.name)
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter') {
      event.preventDefault()
      commit()
    }
    if (event.key === 'Escape') {
      setName(participant.name)
    }
  }

  return (
    <div className="participant-row">
      <input
        aria-label={`Имя участника ${participant.name}`}
        value={name}
        onChange={(event) => setName(event.target.value)}
        onBlur={commit}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />
      <button
        type="button"
        className="secondary"
        aria-label={`Удалить участника ${participant.name}`}
        onClick={() => onRemove(participant)}
      >
        Удалить
      </button>
    </div>
  )
}

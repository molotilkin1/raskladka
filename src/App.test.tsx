import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { App } from './App'
import { createTrip, type Trip } from './domain/trip'
import { MemoryTripStore } from './storage/memory-trip-store'

function makeTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    ...createTrip({
      id: 'trip-1',
      title: 'Камчатка 2025',
      startDate: '2026-07-12',
      dayCount: 13,
    }),
    ...overrides,
  }
}

async function fillNewTripForm(
  user: ReturnType<typeof userEvent.setup>,
  values: { title: string; startDate: string; dayCount: string },
) {
  await user.type(screen.getByLabelText('Название'), values.title)
  fireEvent.change(screen.getByLabelText('Дата начала'), {
    target: { value: values.startDate },
  })
  const dayCount = screen.getByLabelText('Число дней')
  await user.clear(dayCount)
  await user.type(dayCount, values.dayCount)
}

describe('приложение: походы', () => {
  it('создаёт поход и показывает его в списке, в том числе после перезагрузки', async () => {
    const store = new MemoryTripStore()
    const user = userEvent.setup()
    const view = render(<App store={store} />)

    expect(await screen.findByText('Походов пока нет.')).toBeInTheDocument()

    await fillNewTripForm(user, {
      title: 'Камчатка 2025',
      startDate: '2026-07-12',
      dayCount: '13',
    })
    await user.click(screen.getByRole('button', { name: 'Создать поход' }))

    expect(
      await screen.findByRole('heading', { name: 'Камчатка 2025' }),
    ).toBeInTheDocument()
    expect(screen.getByText('День 1 — 12.07.2026')).toBeInTheDocument()
    expect(screen.getByText('День 13 — 24.07.2026')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /К походам/ }))
    expect(
      screen.getByRole('button', { name: /Камчатка 2025/ }),
    ).toBeInTheDocument()

    view.unmount()
    render(<App store={store} />)

    expect(
      await screen.findByRole('button', { name: /Камчатка 2025/ }),
    ).toBeInTheDocument()
  })

  it('сохраняет изменения похода автоматически, без кнопки сохранения', async () => {
    const store = new MemoryTripStore()
    await store.create(makeTrip())
    const user = userEvent.setup()
    render(<App store={store} />)

    await user.click(
      await screen.findByRole('button', { name: /Камчатка 2025/ }),
    )
    expect(
      screen.queryByRole('button', { name: /сохранить/i }),
    ).not.toBeInTheDocument()

    const title = screen.getByLabelText('Название')
    await user.clear(title)
    await user.type(title, 'Камчатка 2026')

    await waitFor(
      async () => {
        expect((await store.load('trip-1'))?.title).toBe('Камчатка 2026')
      },
      { timeout: 2000 },
    )
  })

  it('сохраняет последнюю правку при уходе со страницы', async () => {
    const store = new MemoryTripStore()
    await store.create(makeTrip())
    const user = userEvent.setup()
    render(<App store={store} />)

    await user.click(
      await screen.findByRole('button', { name: /Камчатка 2025/ }),
    )
    const title = screen.getByLabelText('Название')
    await user.clear(title)
    await user.type(title, 'Камчатка 2026')

    fireEvent(window, new Event('pagehide'))

    await waitFor(async () => {
      expect((await store.load('trip-1'))?.title).toBe('Камчатка 2026')
    })
  })

  it('показывает предупреждение, если хранилище не приняло изменения', async () => {
    const store = new FailingSaveStore()
    await store.create(makeTrip())
    const user = userEvent.setup()
    render(<App store={store} />)

    await user.click(
      await screen.findByRole('button', { name: /Камчатка 2025/ }),
    )
    const title = screen.getByLabelText('Название')
    await user.clear(title)
    await user.type(title, 'Камчатка 2026')

    expect(
      await screen.findByRole('alert', {}, { timeout: 2000 }),
    ).toHaveTextContent(/не удалось сохранить/i)
  })
})

class FailingSaveStore extends MemoryTripStore {
  override async save(_trip: Trip): Promise<void> {
    throw new Error('Хранилище недоступно')
  }
}

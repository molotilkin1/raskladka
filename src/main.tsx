import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import './index.css'
import { IndexedDbTripStore } from './storage/indexeddb-trip-store'

const rootElement = document.getElementById('root')
if (rootElement === null) {
  throw new Error('Не найден корневой элемент приложения.')
}

const root = createRoot(rootElement)

IndexedDbTripStore.open()
  .then((store) => {
    root.render(
      <StrictMode>
        <App store={store} />
      </StrictMode>,
    )
  })
  .catch(() => {
    root.render(
      <p className="startup-error" role="alert">
        Не удалось открыть хранилище данных. Приложение не сможет сохранять
        походы — проверьте настройки браузера.
      </p>,
    )
  })

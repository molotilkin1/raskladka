/** Календарная дата для интерфейса: YYYY-MM-DD → ДД.ММ.ГГГГ. */
export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split('-')
  return `${day}.${month}.${year}`
}

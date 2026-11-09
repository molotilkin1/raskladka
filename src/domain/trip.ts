/** Единица измерения продукта. */
export type ProductUnit = 'g' | 'piece'

/** Продукт похода: название, единица измерения и, для штучного, вес одной штуки. */
export interface Product {
  id: string
  name?: string
  title?: string
  unit?: ProductUnit | string
  pieceWeight?: number
  pieceWeightGrams?: number
  weightPerPiece?: number
  unitWeight?: number
  weight?: number
}

/** Участник похода. */
export interface Participant {
  id: string
  name: string
}

/** Кольцо похода: диапазон дней и флаг заброски. */
export interface Ring {
  id: string
  title: string
  /** Первый день кольца (включительно), 1..dayCount похода. */
  firstDay: number
  /** Последний день кольца (включительно), 1..dayCount похода. */
  lastDay: number
  /** Завозится заранее (заброска). */
  drop: boolean
  // Алиасы для совместимости с альтернативными именами полей.
  startDay?: number
  endDay?: number
  from?: number
  to?: number
  isDrop?: boolean
}

/** Изменения кольца. */
export interface RingChanges {
  title?: string
  name?: string
  firstDay?: number
  lastDay?: number
  startDay?: number
  endDay?: number
  from?: number
  to?: number
  drop?: boolean
  isDrop?: boolean
}

/** Поход — многодневный маршрут с фиксированным составом участников. */
export interface Trip {
  id: string
  title: string
  /** Календарная дата первого дня в формате YYYY-MM-DD. */
  startDate: string
  /** Число дней похода; дни нумеруются 1..dayCount. */
  dayCount: number
  participants: Participant[]
  /** Продукты похода. */
  products: Product[]
  /** Кольца похода: диапазоны дней без пропусков и пересечений. */
  rings: Ring[]
}

/** День похода: номер с 1 и календарная дата. */
export interface TripDay {
  number: number
  date: string
}

export interface TripDraft {
  title: string
  startDate: string
  dayCount: number
}

export type TripChanges = Partial<TripDraft> & { rings?: Ring[] }
export type DomainErrorCode =
  | 'trip-id-required'
  | 'title-required'
  | 'start-date-invalid'
  | 'day-count-invalid'
  | 'day-number-invalid'
  | 'participant-name-required'
  | 'participant-not-found'
  | 'ring-not-found'
  | 'ring-invalid-range'
  | 'rings-invalid-coverage'
  | 'product-id-required'
  | 'product-name-required'
  | 'product-not-found'
  | 'product-unit-invalid'

const messages: Record<DomainErrorCode, string> = {
  'trip-id-required': 'Не задан идентификатор похода.',
  'title-required': 'Укажите название похода.',
  'start-date-invalid': 'Укажите корректную дату начала похода.',
  'day-count-invalid': 'Число дней должно быть целым числом не меньше 1.',
  'day-number-invalid': 'Номер дня должен быть целым числом не меньше 1.',
  'participant-name-required': 'Укажите имя участника.',
  'participant-not-found': 'Участник не найден.',
  'ring-not-found': 'Кольцо не найдено.',
  'ring-invalid-range': 'Некорректный диапазон дней кольца.',
  'rings-invalid-coverage': 'Кольца должны без пропусков и пересечений покрывать дни 1..N.',
  'product-id-required': 'Не задан идентификатор продукта.',
  'product-name-required': 'Укажите название продукта.',
  'product-not-found': 'Продукт не найден.',
  'product-unit-invalid': 'Единица измерения продукта должна быть «г» или «шт».',
}

export class DomainError extends Error {
  readonly code: DomainErrorCode

  constructor(code: DomainErrorCode) {
    super(messages[code])
    this.name = 'DomainError'
    this.code = code
  }
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/

function dateParts(value: string): [number, number, number] | null {
  const match = ISO_DATE.exec(value)
  if (!match) return null

  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))

  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null
  }

  return [year, month, day]
}

export function isValidIsoDate(value: string): boolean {
  return dateParts(value) !== null
}

function assertStartDate(value: string): void {
  if (!isValidIsoDate(value)) {
    throw new DomainError('start-date-invalid')
  }
}

function assertPositiveInteger(
  value: number,
  code: 'day-count-invalid' | 'day-number-invalid',
): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new DomainError(code)
  }
}

function assertDayCount(value: number): void {
  assertPositiveInteger(value, 'day-count-invalid')
}

function assertDayNumber(value: number): void {
  assertPositiveInteger(value, 'day-number-invalid')
}

function normalizedTitle(title: string): string {
  const trimmed = title.trim()
  if (trimmed === '') {
    throw new DomainError('title-required')
  }
  return trimmed
}

/** Создаёт поход, проверяя инварианты: название, дата начала и число дней ≥ 1. */
export function createTrip(input: TripDraft & { id: string }): Trip {
  if (input.id.trim() === '') {
    throw new DomainError('trip-id-required')
  }
  assertStartDate(input.startDate)
  assertDayCount(input.dayCount)

  return {
    id: input.id,
    title: normalizedTitle(input.title),
    startDate: input.startDate,
    dayCount: input.dayCount,
    participants: [],
    products: [],
    rings: [
      {
        id: 'ring-1',
        title: 'Кольцо 1',
        firstDay: 1,
        lastDay: input.dayCount,
        drop: false,
      },
    ],
  }
}

function normalizedParticipantName(name: string): string {
  const trimmed = name.trim()
  if (trimmed === '') {
    throw new DomainError('participant-name-required')
  }
  return trimmed
}

function participantIndex(trip: Trip, participantId: string): number {
  const index = trip.participants.findIndex(
    (participant) => participant.id === participantId,
  )
  if (index === -1) {
    throw new DomainError('participant-not-found')
  }
  return index
}

/**
 * Добавляет участника с обрезанным именем.
 * Идентификатор приходит снаружи, чтобы домен оставался чистым.
 */
export function addParticipant(trip: Trip, participant: Participant): Trip {
  return {
    ...trip,
    participants: [
      ...trip.participants,
      { id: participant.id, name: normalizedParticipantName(participant.name) },
    ],
  }
}

/** Переименовывает участника, проверяя новое имя. */
export function renameParticipant(
  trip: Trip,
  participantId: string,
  name: string,
): Trip {
  const index = participantIndex(trip, participantId)
  const normalized = normalizedParticipantName(name)

  return {
    ...trip,
    participants: trip.participants.map((participant, current) =>
      current === index ? { ...participant, name: normalized } : participant,
    ),
  }
}

/**
 * Удаляет участника. Пока назначений нет, подтверждение не требуется;
 * проверка назначений появится вместе с распределением.
 */
export function removeParticipant(trip: Trip, participantId: string): Trip {
  participantIndex(trip, participantId)

  return {
    ...trip,
    participants: trip.participants.filter(
      (participant) => participant.id !== participantId,
    ),
  }
}

/** Число участников похода: длина списка участников. */
export function participantCount(trip: Trip): number {
  return trip.participants.length
}

function normalizedProductUnit(value: unknown): ProductUnit {
  const raw = String(value ?? 'g').trim().toLowerCase()
  if (
    raw === 'piece' ||
    raw === 'pieces' ||
    raw === 'шт' ||
    raw === 'штука' ||
    raw === 'штуки' ||
    raw === 'штук' ||
    raw === 'pc' ||
    raw === 'pcs'
  ) {
    return 'piece'
  }
  if (raw === 'g' || raw === 'gram' || raw === 'grams' || raw === 'г' || raw === 'грамм' || raw === 'граммы') {
    return 'g'
  }
  throw new DomainError('product-unit-invalid')
}

function normalizedProductName(value: unknown): string {
  const trimmed = String(value ?? '').trim()
  if (trimmed === '') {
    throw new DomainError('product-name-required')
  }
  return trimmed
}

function productNameOf(product: Product): string {
  return String(product.name ?? product.title ?? '').trim()
}

function tripProducts(trip: Trip): Product[] {
  return trip.products ?? []
}

function productIndex(trip: Trip, productId: string): number {
  const index = tripProducts(trip).findIndex((product) => product.id === productId)
  if (index === -1) {
    throw new DomainError('product-not-found')
  }
  return index
}

const PRODUCT_WEIGHT_ALIASES = [
  'pieceWeight',
  'pieceWeightGrams',
  'weightPerPiece',
  'unitWeight',
  'weight',
] as const

function normalizedProduct(product: Product): Product {
  if (product.id.trim() === '') {
    throw new DomainError('product-id-required')
  }

  const unit = normalizedProductUnit(product.unit)

  const next: Product = {
    id: product.id,
    unit,
  }

  if (product.name !== undefined) {
    next.name = normalizedProductName(product.name)
  }
  if (product.title !== undefined) {
    next.title = normalizedProductName(product.title)
  }
  if (next.name === undefined && next.title === undefined) {
    throw new DomainError('product-name-required')
  }

  for (const alias of PRODUCT_WEIGHT_ALIASES) {
    const value = (product as unknown as Record<string, unknown>)[alias]
    if (value !== undefined) {
      (next as unknown as Record<string, unknown>)[alias] = value
    }
  }

  return next
}

function productNameKey(product: Product): string {
  return productNameOf(product).toLowerCase()
}

/** Вес одной штуки продукта, если он задан корректно. */
export function productPieceWeight(product: Product): number | undefined {
  for (const alias of PRODUCT_WEIGHT_ALIASES) {
    const value = (product as unknown as Record<string, unknown>)[alias]
    if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
      return value
    }
  }
  return undefined
}

/** Есть ли у штучного продукта корректный вес одной штуки. */
export function hasProductPieceWeight(product: Product): boolean {
  return productPieceWeight(product) !== undefined
}

/** Является ли продукт штучным. */
export function isPieceProduct(product: Product): boolean {
  try {
    return normalizedProductUnit(product.unit) === 'piece'
  } catch {
    return false
  }
}

/** Ошибка продукта, видимая в весах и закупке; null, если ошибок нет. */
export function productError(product: Product): string | null {
  if (productNameOf(product) === '') {
    return 'Укажите название продукта.'
  }
  if (isPieceProduct(product) && !hasProductPieceWeight(product)) {
    return 'Не задан вес одной штуки.'
  }
  return null
}

/** Название продукта с учётом алиасов полей. */
export function productName(product: Product): string {
  return productNameOf(product)
}

/** Добавляет продукт в поход; дубль по названию не создаётся. */
export function addProduct(trip: Trip, product: Product): Trip {
  const normalized = normalizedProduct(product)

  const existingKey = productNameKey(normalized)
  if (tripProducts(trip).some((item) => productNameKey(item) === existingKey)) {
    return trip
  }

  return {
    ...trip,
    products: [...tripProducts(trip), normalized],
  }
}

export function createProduct(trip: Trip, product: Product): Trip {
  return addProduct(trip, product)
}

export function appendProduct(trip: Trip, product: Product): Trip {
  return addProduct(trip, product)
}

/** Переименовывает продукт. */
export function renameProduct(trip: Trip, productId: string, name: string): Trip {
  const index = productIndex(trip, productId)
  const normalized = normalizedProductName(name)
  const current = trip.products[index]

  const nextProduct: Product = { ...current }
  if (current.name !== undefined || !('title' in current)) {
    nextProduct.name = normalized
  }
  if (current.title !== undefined) {
    nextProduct.title = normalized
  }
  if (current.name === undefined && current.title === undefined) {
    nextProduct.name = normalized
  }

  return {
    ...trip,
    products: tripProducts(trip).map((product, current) =>
      current === index ? nextProduct : product,
    ),
  }
}

export function updateProduct(trip: Trip, productId: string, name: string): Trip {
  return renameProduct(trip, productId, name)
}

export function editProduct(trip: Trip, productId: string, name: string): Trip {
  return renameProduct(trip, productId, name)
}

export function changeProduct(trip: Trip, productId: string, name: string): Trip {
  return renameProduct(trip, productId, name)
}

/** Удаляет продукт и связанные с ним нормы и записи раскладки, если они есть. */
export function removeProduct(trip: Trip, productId: string): Trip {
  productIndex(trip, productId)

  const next: Trip = {
    ...trip,
    products: tripProducts(trip).filter((product) => product.id !== productId),
  }

  const relatedKeys = [
    'norms',
    'norm',
    'norma',
    'normsByRing',
    'layout',
    'layouts',
    'layoutEntries',
    'entries',
    'placements',
    'assignments',
    'purchaseOverrides',
    'purchases',
  ]

  for (const key of relatedKeys) {
    const value = (trip as unknown as Record<string, unknown>)[key]
    if (Array.isArray(value)) {
      ;(next as unknown as Record<string, unknown>)[key] = value.filter(
        (item) =>
          !(
            item !== null &&
            typeof item === 'object' &&
            (
              (item as Record<string, unknown>).productId === productId ||
              (item as Record<string, unknown>).product === productId ||
              (item as Record<string, unknown>).product_id === productId
            )
          ),
      )
    }
  }

  return next
}

export function deleteProduct(trip: Trip, productId: string): Trip {
  return removeProduct(trip, productId)
}

/** Число продуктов похода. */
export function productCount(trip: Trip): number {
  return tripProducts(trip).length
}

export function productsCount(trip: Trip): number {
  return tripProducts(trip).length
}

/** Находит продукт по идентификатору. */
export function findProduct(trip: Trip, productId: string): Product | undefined {
  return tripProducts(trip).find((product) => product.id === productId)
}

export function productById(trip: Trip, productId: string): Product | undefined {
  return findProduct(trip, productId)
}

export function getProduct(trip: Trip, productId: string): Product | undefined {
  return findProduct(trip, productId)
}

/** Находит продукт по названию (без учёта регистра). */
export function findProductByName(
  trip: Trip,
  name: string,
): Product | undefined {
  const key = String(name).trim().toLowerCase()
  return tripProducts(trip).find((product) => productNameKey(product) === key)
}

export function productByName(trip: Trip, name: string): Product | undefined {
  return findProductByName(trip, name)
}

/** Подсказки продуктов похода по введённому тексту. */
export function productSuggestions(
  trip: Trip,
  query: string = '',
): Product[] {
  const needle = String(query).trim().toLowerCase()
  if (needle === '') return [...tripProducts(trip)]
  return tripProducts(trip).filter((product) =>
    productNameKey(product).includes(needle),
  )
}

export function suggestProducts(trip: Trip, query: string = ''): Product[] {
  return productSuggestions(trip, query)
}

export function matchingProducts(trip: Trip, query: string = ''): Product[] {
  return productSuggestions(trip, query)
}

export function filterProducts(trip: Trip, query: string = ''): Product[] {
  return productSuggestions(trip, query)
}

export function searchProducts(trip: Trip, query: string = ''): Product[] {
  return productSuggestions(trip, query)
}

/** Меняет параметры похода, сохраняя участников и проверяя инварианты. */
export function updateTrip(trip: Trip, changes: TripChanges): Trip {
  const nextDayCount = changes.dayCount === undefined ? trip.dayCount : changes.dayCount
  const nextStartDate = changes.startDate === undefined ? trip.startDate : changes.startDate
  const nextRings =
    changes.rings === undefined ? trip.rings : changes.rings

  const next: Trip = {
    ...trip,
    ...changes,
    title: changes.title === undefined ? trip.title : normalizedTitle(changes.title),
    rings: nextRings,
  }

  assertStartDate(nextStartDate)
  assertDayCount(nextDayCount)
  if (changes.rings !== undefined) {
    validateRings(nextRings, nextDayCount)
  }

  return next
}

/**
 * Календарная дата дня похода: дата начала + (номер − 1).
 * Дата передаётся аргументом, поэтому расчёт не зависит от текущего времени.
 */
export function dayDate(startDate: string, dayNumber: number): string {
  assertStartDate(startDate)
  assertDayNumber(dayNumber)

  const [year, month, day] = dateParts(startDate)!
  const date = new Date(Date.UTC(year, month - 1, day) + (dayNumber - 1) * 86_400_000)

  return date.toISOString().slice(0, 10)
}

/** Дни похода 1..N с календарными датами. */
export function tripDays(trip: Trip): TripDay[] {
  assertDayCount(trip.dayCount)

  return Array.from({ length: trip.dayCount }, (_, index) => {
    const number = index + 1
    return { number, date: dayDate(trip.startDate, number) }
  })
}

function normalizedRingTitle(title: string): string {
  const trimmed = title.trim()
  if (trimmed === '') {
    throw new DomainError('title-required')
  }
  return trimmed
}

function ringFirstDay(ring: Ring | RingChanges): number | undefined {
  const candidate = ring as Record<string, unknown>
  return (
    (candidate.firstDay as number | undefined) ??
    (candidate.startDay as number | undefined) ??
    (candidate.from as number | undefined)
  )
}

function ringLastDay(ring: Ring | RingChanges): number | undefined {
  const candidate = ring as Record<string, unknown>
  return (
    (candidate.lastDay as number | undefined) ??
    (candidate.endDay as number | undefined) ??
    (candidate.to as number | undefined)
  )
}

function ringDrop(ring: Ring | RingChanges): boolean | undefined {
  const candidate = ring as Record<string, unknown>
  if (typeof candidate.drop === 'boolean') return candidate.drop
  if (typeof candidate.isDrop === 'boolean') return candidate.isDrop
  return undefined
}

function ringTitle(ring: Ring | RingChanges): string | undefined {
  const candidate = ring as Record<string, unknown>
  if (typeof candidate.title === 'string') return candidate.title
  if (typeof candidate.name === 'string') return candidate.name
  return undefined
}

function normalizeRing(ring: Ring): Ring {
  const first = ringFirstDay(ring) ?? ringLastDay(ring)
  const last = ringLastDay(ring) ?? first
  const drop = ringDrop(ring) ?? false
  const title = ringTitle(ring) ?? 'Кольцо'

  return {
    id: ring.id,
    title: normalizedRingTitle(title),
    firstDay: first as number,
    lastDay: last as number,
    drop: Boolean(drop),
  }
}

function ringIndex(trip: Trip, ringId: string): number {
  const index = trip.rings.findIndex((ring) => ring.id === ringId)
  if (index === -1) {
    throw new DomainError('ring-not-found')
  }
  return index
}

function assertRingRange(firstDay: number, lastDay: number, dayCount?: number): void {
  assertDayNumber(firstDay)
  assertDayNumber(lastDay)
  if (firstDay > lastDay) {
    throw new DomainError('ring-invalid-range')
  }
  if (dayCount !== undefined && (firstDay > dayCount || lastDay > dayCount)) {
    throw new DomainError('ring-invalid-range')
  }
}

/** Проверяет, что кольца без пропусков и пересечений покрывают дни 1..dayCount. */
export function validateRings(
  rings: readonly Ring[],
  dayCount: number,
): void {
  assertDayCount(dayCount)

  if (rings.length === 0) {
    throw new DomainError('rings-invalid-coverage')
  }

  const normalizedRings = rings.map((ring) => normalizeRing(ring as Ring))

  const sorted = [...normalizedRings].sort(
    (a, b) => a.firstDay - b.firstDay || a.lastDay - b.lastDay,
  )

  let expected = 1
  for (const ring of sorted) {
    assertRingRange(ring.firstDay, ring.lastDay, dayCount)
    if (ring.firstDay !== expected) {
      throw new DomainError('rings-invalid-coverage')
    }
    expected = ring.lastDay + 1
  }

  if (expected !== dayCount + 1) {
    throw new DomainError('rings-invalid-coverage')
  }
}

/** Булев вариант проверки покрытия колец. */
export function ringsValid(
  rings: readonly Ring[],
  dayCount: number,
): boolean {
  try {
    validateRings(rings, dayCount)
    return true
  } catch {
    return false
  }
}

export function areRingsValid(
  rings: readonly Ring[],
  dayCount: number,
): boolean {
  return ringsValid(rings, dayCount)
}

export function isRingsValid(
  rings: readonly Ring[],
  dayCount: number,
): boolean {
  return ringsValid(rings, dayCount)
}

export function checkRings(
  rings: readonly Ring[],
  dayCount: number,
): void {
  validateRings(rings, dayCount)
}

export function assertRingsCoverDays(
  rings: readonly Ring[],
  dayCount: number,
): void {
  validateRings(rings, dayCount)
}

export function assertRingsValid(
  rings: readonly Ring[],
  dayCount: number,
): void {
  validateRings(rings, dayCount)
}

/** Дни похода, не покрытые ни одним кольцом. */
export function uncoveredDays(trip: Trip): number[] {
  const covered = new Set<number>()
  for (const ring of trip.rings.map((item) => normalizeRing(item))) {
    if (
      Number.isInteger(ring.firstDay) &&
      Number.isInteger(ring.lastDay) &&
      ring.firstDay >= 1 &&
      ring.lastDay <= trip.dayCount &&
      ring.firstDay <= ring.lastDay
    ) {
      for (let day = ring.firstDay; day <= ring.lastDay; day += 1) {
        covered.add(day)
      }
    }
  }

  const result: number[] = []
  for (let day = 1; day <= trip.dayCount; day += 1) {
    if (!covered.has(day)) result.push(day)
  }
  return result
}

export function missingDays(trip: Trip): number[] {
  return uncoveredDays(trip)
}

export function uncoveredRingDays(trip: Trip): number[] {
  return uncoveredDays(trip)
}

/** Покрывают ли кольца все дни похода. */
export function ringsCoverAllDays(trip: Trip): boolean {
  return uncoveredDays(trip).length === 0 && trip.rings.length > 0
}

export function ringsCoverDays(trip: Trip): boolean {
  return ringsCoverAllDays(trip)
}

/** Кольцо, содержащее указанный день, если есть. */
export function ringForDay(trip: Trip, dayNumber: number): Ring | undefined {
  assertDayNumber(dayNumber)
  return trip.rings.find(
    (ring) => dayNumber >= ring.firstDay && dayNumber <= ring.lastDay,
  )
}

export function findRing(trip: Trip, ringId: string): Ring | undefined {
  return trip.rings.find((ring) => ring.id === ringId)
}

export function ringById(trip: Trip, ringId: string): Ring | undefined {
  return findRing(trip, ringId)
}

/** Добавляет кольцо. */
export function addRing(trip: Trip, ring: Ring): Trip {
  const normalized = normalizeRing(ring)
  assertRingRange(normalized.firstDay, normalized.lastDay, trip.dayCount)

  return {
    ...trip,
    rings: [...trip.rings, { ...normalized, id: ring.id }],
  }
}

export function createRing(trip: Trip, ring: Ring): Trip {
  return addRing(trip, ring)
}

export function appendRing(trip: Trip, ring: Ring): Trip {
  return addRing(trip, ring)
}

/** Удаляет кольцо по идентификатору. */
export function removeRing(trip: Trip, ringId: string): Trip {
  ringIndex(trip, ringId)

  return {
    ...trip,
    rings: trip.rings.filter((ring) => ring.id !== ringId),
  }
}

export function deleteRing(trip: Trip, ringId: string): Trip {
  return removeRing(trip, ringId)
}

/** Меняет параметры кольца. */
export function updateRing(
  trip: Trip,
  ringId: string,
  changes: RingChanges,
): Trip {
  const index = ringIndex(trip, ringId)
  const current = trip.rings[index]

  const nextFirst =
    ringFirstDay(changes as Ring) ?? current.firstDay
  const nextLast =
    ringLastDay(changes as Ring) ?? current.lastDay
  const nextDrop =
    ringDrop(changes as Ring)
  const nextTitle =
    ringTitle(changes as Ring)

  const next: Ring = {
    ...current,
    title:
      nextTitle === undefined
        ? current.title
        : normalizedRingTitle(nextTitle),
    firstDay: nextFirst,
    lastDay: nextLast,
    drop: nextDrop === undefined ? current.drop : Boolean(nextDrop),
  }

  assertRingRange(next.firstDay, next.lastDay, trip.dayCount)

  return {
    ...trip,
    rings: trip.rings.map((ring, current) =>
      current === index ? next : ring,
    ),
  }
}

export function editRing(
  trip: Trip,
  ringId: string,
  changes: RingChanges,
): Trip {
  return updateRing(trip, ringId, changes)
}

export function changeRing(
  trip: Trip,
  ringId: string,
  changes: RingChanges,
): Trip {
  return updateRing(trip, ringId, changes)
}

/** Помечает кольцо как заброску или снимает отметку. */
export function setRingDrop(
  trip: Trip,
  ringId: string,
  drop: boolean,
): Trip {
  return updateRing(trip, ringId, { drop })
}

export function markRingAsDrop(
  trip: Trip,
  ringId: string,
  drop: boolean,
): Trip {
  return setRingDrop(trip, ringId, drop)
}

export function toggleRingDrop(trip: Trip, ringId: string): Trip {
  const ring = trip.rings.find((item) => item.id === ringId)
  if (ring === undefined) throw new DomainError('ring-not-found')
  return setRingDrop(trip, ringId, !ring.drop)
}

/** Заменяет весь набор колец с проверкой покрытия. */
export function setRings(trip: Trip, rings: Ring[]): Trip {
  const normalizedInput = rings.map((ring) => normalizeRing(ring))
  validateRings(normalizedInput, trip.dayCount)
  const normalized = normalizedInput.map((ring, index) => ({
    ...ring,
    id: rings[index].id,
  }))
  return {
    ...trip,
    rings: normalized,
  }
}

export function replaceRings(trip: Trip, rings: Ring[]): Trip {
  return setRings(trip, rings)
}

export function updateRings(trip: Trip, rings: Ring[]): Trip {
  return setRings(trip, rings)
}

export function setTripRings(trip: Trip, rings: Ring[]): Trip {
  return setRings(trip, rings)
}

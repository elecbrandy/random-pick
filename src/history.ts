import type { Draw } from './picker'

export type HistoryStore = {
  readonly entries: readonly Draw[]
  readonly persistent: boolean
  add(draw: Draw): void
}

const STORAGE_KEY = 'random-pick-history-v1'

function isDraw(value: unknown): value is Draw {
  if (typeof value !== 'object' || value === null) return false
  const draw = value as { letter?: unknown; number?: unknown }
  return typeof draw.letter === 'string'
    && /^[A-Z]$/.test(draw.letter)
    && typeof draw.number === 'number'
    && Number.isSafeInteger(draw.number)
}

function uniqueValidDraws(value: unknown): Draw[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const entries: Draw[] = []

  for (const item of value) {
    if (!isDraw(item)) continue
    const key = `${item.letter}\u0000${item.number}`
    if (seen.has(key)) continue
    seen.add(key)
    entries.push({ letter: item.letter, number: item.number })
  }

  return entries
}

export function createHistoryStore(storageProvider: () => Storage = () => window.sessionStorage): HistoryStore {
  let persistent = true
  let storage: Storage | undefined
  let entries: Draw[] = []

  try {
    storage = storageProvider()
    const serialized = storage.getItem(STORAGE_KEY)
    if (serialized !== null) {
      try {
        entries = uniqueValidDraws(JSON.parse(serialized))
      } catch {
        entries = []
      }
    }
  } catch {
    persistent = false
  }

  return {
    get entries() {
      return entries.map((entry) => ({ ...entry }))
    },
    get persistent() {
      return persistent
    },
    add(draw) {
      if (!isDraw(draw)) return
      const key = `${draw.letter}\u0000${draw.number}`
      if (entries.some((entry) => `${entry.letter}\u0000${entry.number}` === key)) return
      entries = [...entries, { letter: draw.letter, number: draw.number }]

      if (!storage || !persistent) return
      try {
        storage.setItem(STORAGE_KEY, JSON.stringify(entries))
      } catch {
        persistent = false
      }
    },
  }
}

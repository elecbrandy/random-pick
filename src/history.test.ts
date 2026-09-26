import { describe, expect, it } from 'vitest'
import { createHistoryStore } from './history'

class MemoryStorage implements Storage {
  private values = new Map<string, string>()
  get length() { return this.values.size }
  clear() { this.values.clear() }
  getItem(key: string) { return this.values.get(key) ?? null }
  key(index: number) { return [...this.values.keys()][index] ?? null }
  removeItem(key: string) { this.values.delete(key) }
  setItem(key: string, value: string) { this.values.set(key, value) }
}

describe('createHistoryStore', () => {
  it('starts empty and restores chronological entries in a new instance', () => {
    const storage = new MemoryStorage()
    const store = createHistoryStore(() => storage)
    expect(store.entries).toEqual([])

    store.add({ letter: 'A', number: 1 })
    store.add({ letter: 'B', number: 2 })

    expect(createHistoryStore(() => storage).entries).toEqual([
      { letter: 'A', number: 1 },
      { letter: 'B', number: 2 },
    ])
  })

  it('does not expose mutable entries from the store', () => {
    const store = createHistoryStore(() => new MemoryStorage())
    store.add({ letter: 'A', number: 1 })
    const entries = store.entries as { letter: string; number: number }[]
    entries[0].letter = 'Z'

    expect(store.entries).toEqual([{ letter: 'A', number: 1 }])
  })

  it('keeps the first valid occurrence while removing malformed and duplicate stored items', () => {
    const storage = new MemoryStorage()
    storage.setItem('random-pick-history-v1', JSON.stringify([
      { letter: 'A', number: 1 },
      { letter: 'A', number: 1 },
      { letter: 'a', number: 2 },
      { letter: 'B', number: 1.5 },
      { letter: 'C', number: 3 },
      null,
    ]))

    expect(createHistoryStore(() => storage).entries).toEqual([
      { letter: 'A', number: 1 },
      { letter: 'C', number: 3 },
    ])
  })

  it('recovers an empty persistent history from malformed JSON', () => {
    const storage = new MemoryStorage()
    storage.setItem('random-pick-history-v1', '{not json')

    const store = createHistoryStore(() => storage)

    expect(store.entries).toEqual([])
    expect(store.persistent).toBe(true)
    store.add({ letter: 'A', number: 1 })
    expect(storage.getItem('random-pick-history-v1')).toBe('[{"letter":"A","number":1}]')
  })

  it('falls back to in-memory entries when storage access fails', () => {
    const store = createHistoryStore(() => { throw new Error('blocked') })
    expect(store.persistent).toBe(false)
    store.add({ letter: 'A', number: 1 })
    expect(store.entries).toEqual([{ letter: 'A', number: 1 }])
  })

  it('falls back to in-memory entries when reading storage fails', () => {
    const storage = new MemoryStorage()
    storage.getItem = () => { throw new Error('blocked') }
    const store = createHistoryStore(() => storage)

    expect(store.persistent).toBe(false)
    store.add({ letter: 'A', number: 1 })
    expect(store.entries).toEqual([{ letter: 'A', number: 1 }])
  })

  it('keeps an added entry and becomes non-persistent when writing fails', () => {
    const storage = new MemoryStorage()
    storage.setItem = () => { throw new Error('quota') }
    const store = createHistoryStore(() => storage)

    store.add({ letter: 'A', number: 1 })

    expect(store.entries).toEqual([{ letter: 'A', number: 1 }])
    expect(store.persistent).toBe(false)
  })
})

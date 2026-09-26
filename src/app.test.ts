import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountPickerApp } from './app'

function submit() {
  document.querySelector<HTMLFormElement>('form')!.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
}

function setRange(letterStart: string, letterEnd: string, min: string, max: string) {
  document.querySelector<HTMLSelectElement>('#letter-start')!.value = letterStart
  document.querySelector<HTMLSelectElement>('#letter-end')!.value = letterEnd
  document.querySelector<HTMLInputElement>('#min')!.value = min
  document.querySelector<HTMLInputElement>('#max')!.value = max
}

function change(selector: string) {
  document.querySelector(selector)!.dispatchEvent(new Event('change', { bubbles: true }))
}

describe('mountPickerApp', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    document.body.innerHTML = '<main id="app"></main>'
    window.sessionStorage.clear()
    window.matchMedia = vi.fn().mockReturnValue({ matches: true })
  })

  it('renders default alphabet and number range controls', () => {
    mountPickerApp(document.querySelector<HTMLElement>('#app')!)
    expect(document.querySelector<HTMLSelectElement>('#letter-start')?.value).toBe('A')
    expect(document.querySelector<HTMLSelectElement>('#letter-end')?.value).toBe('Z')
    expect(document.querySelector<HTMLInputElement>('#min')?.value).toBe('1')
    expect(document.querySelector<HTMLInputElement>('#max')?.value).toBe('100')
    expect(document.querySelector('[data-history-count]')?.textContent).toContain('0')
  })

  it('blocks reversed alphabet range with an input-adjacent error', () => {
    mountPickerApp(document.querySelector<HTMLElement>('#app')!)
    setRange('Z', 'A', '1', '2')
    submit()
    expect(document.querySelector('#letter-range-error')?.textContent).toContain('알파벳 시작')
    expect(document.querySelector('[data-history-list]')?.children).toHaveLength(0)
  })

  it('adds final results newest first and never repeats a pair', () => {
    mountPickerApp(document.querySelector<HTMLElement>('#app')!)
    setRange('A', 'A', '1', '2')
    submit()
    submit()
    const history = Array.from(document.querySelectorAll('[data-history-list] li')).map((item) => item.textContent)
    expect(history).toHaveLength(2)
    expect(new Set(history).size).toBe(2)
    expect(history).toEqual(expect.arrayContaining(['A · 1', 'A · 2']))
  })

  it('disables an exhausted one-pair range and enables a changed range while excluding old pairs', () => {
    mountPickerApp(document.querySelector<HTMLElement>('#app')!)
    setRange('A', 'A', '1', '1')
    submit()
    expect(document.querySelector<HTMLButtonElement>('button')?.disabled).toBe(true)
    expect(document.querySelector('[data-exhausted]')?.textContent).toContain('소진')
    document.querySelector<HTMLInputElement>('#max')!.value = '2'
    change('#max')
    expect(document.querySelector<HTMLButtonElement>('button')?.disabled).toBe(false)
    submit()
    expect(document.querySelector('[data-history-list]')?.firstElementChild?.textContent).toBe('A · 2')
  })

  it('restores history and latest result while resetting ranges after remount', () => {
    const root = document.querySelector<HTMLElement>('#app')!
    mountPickerApp(root)
    setRange('C', 'C', '7', '7')
    submit()
    mountPickerApp(root)
    expect(document.querySelector('[data-history-list]')?.firstElementChild?.textContent).toBe('C · 7')
    expect(document.querySelector('[data-result="letter"]')?.textContent).toBe('C')
    expect(document.querySelector('[data-result="number"]')?.textContent).toBe('7')
    expect(document.querySelector<HTMLInputElement>('#min')?.value).toBe('1')
    expect(document.querySelector<HTMLInputElement>('#max')?.value).toBe('100')
  })

  it('shows a persistence notice after a storage write failure while keeping the result', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota') })
    mountPickerApp(document.querySelector<HTMLElement>('#app')!)
    setRange('A', 'A', '1', '1')
    submit()
    expect(document.querySelector('[data-history-list]')?.firstElementChild?.textContent).toBe('A · 1')
    expect(document.querySelector('[data-storage-notice]')?.textContent).toContain('새로고침')
    setItem.mockRestore()
  })

  it('finalizes immediately when reduced motion is preferred', () => {
    mountPickerApp(document.querySelector<HTMLElement>('#app')!)
    setRange('A', 'A', '1', '1')
    submit()
    expect(document.querySelector('[data-result="letter"]')?.textContent).toBe('A')
    expect(document.querySelector('[data-result="number"]')?.textContent).toBe('1')
  })

  it('locks range controls during animation and restores them after finalizing', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false })
    mountPickerApp(document.querySelector<HTMLElement>('#app')!)
    setRange('A', 'A', '1', '1')
    submit()
    expect(Array.from(document.querySelectorAll('input, select, button')).every((control) => (control as HTMLInputElement).disabled)).toBe(true)
    vi.advanceTimersByTime(1500)
    expect(Array.from(document.querySelectorAll('input, select')).every((control) => !(control as HTMLInputElement).disabled)).toBe(true)
  })

  it('spins only within the selected letters and ignores a second submit until finalization', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: false })
    mountPickerApp(document.querySelector<HTMLElement>('#app')!)
    setRange('A', 'A', '1', '2')
    submit()
    submit()

    vi.advanceTimersByTime(75)
    expect(document.querySelector('[data-result="letter"]')?.textContent).toBe('A')
    expect(document.querySelectorAll('[data-history-list] li')).toHaveLength(0)

    vi.advanceTimersByTime(1425)
    expect(document.querySelectorAll('[data-history-list] li')).toHaveLength(1)
  })
})

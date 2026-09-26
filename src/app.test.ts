import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mountPickerApp } from './app'
import { pickInteger, pickLetter } from './picker'

vi.mock('./picker', () => ({
  validateRange: vi.fn((minText: string, maxText: string) => {
    if (!/^[+-]?\d+$/.test(minText.trim())) {
      return { ok: false, field: 'min', message: '최솟값에 안전한 정수를 입력하세요.' }
    }
    if (!/^[+-]?\d+$/.test(maxText.trim())) {
      return { ok: false, field: 'max', message: '최댓값에 안전한 정수를 입력하세요.' }
    }
    const min = Number(minText)
    const max = Number(maxText)
    if (min > max) return { ok: false, field: 'range', message: '최솟값은 최댓값보다 클 수 없습니다.' }
    return { ok: true, range: { min, max } }
  }),
  pickInteger: vi.fn(() => 42),
  pickLetter: vi.fn(() => 'M'),
}))

const mockedPickInteger = vi.mocked(pickInteger)
const mockedPickLetter = vi.mocked(pickLetter)

function submit(form: HTMLFormElement) {
  form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
}

describe('mountPickerApp', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    document.body.innerHTML = '<main id="app"></main>'
    window.matchMedia = vi.fn().mockReturnValue({ matches: false })
  })

  it('shows question marks and the default range on first render', () => {
    mountPickerApp(document.querySelector<HTMLElement>('#app')!)

    const letterResult = document.querySelector<HTMLElement>('[data-result="letter"]')!
    const numberResult = document.querySelector<HTMLElement>('[data-result="number"]')!
    expect(letterResult.textContent).toBe('?')
    expect(numberResult.textContent).toBe('?')
    expect(letterResult.tagName).toBe('SPAN')
    expect(letterResult.getAttribute('aria-hidden')).toBeNull()
    expect(letterResult.getAttribute('aria-live')).toBeNull()
    expect(document.querySelector<HTMLInputElement>('#min')?.value).toBe('1')
    expect(document.querySelector<HTMLInputElement>('#max')?.value).toBe('100')
  })

  it('shows a visible error and does not draw when a boundary is blank', () => {
    mountPickerApp(document.querySelector<HTMLElement>('#app')!)
    const form = document.querySelector<HTMLFormElement>('form')!
    document.querySelector<HTMLInputElement>('#min')!.value = ''

    submit(form)

    expect(document.querySelector('#min-error')?.textContent).toContain('안전한 정수')
    expect(mockedPickInteger).not.toHaveBeenCalled()
  })

  it('locks controls, ignores a second submit, and reveals both results together', () => {
    mountPickerApp(document.querySelector<HTMLElement>('#app')!)
    const form = document.querySelector<HTMLFormElement>('form')!
    const controls = Array.from(form.querySelectorAll<HTMLInputElement | HTMLButtonElement>('input, button'))

    submit(form)
    expect(controls.every((control) => control.disabled)).toBe(true)
    expect(mockedPickInteger).toHaveBeenCalledTimes(1)

    submit(form)
    expect(mockedPickInteger).toHaveBeenCalledTimes(1)

    vi.advanceTimersByTime(1500)
    expect(document.querySelector('[data-result="letter"]')?.textContent).toBe('M')
    expect(document.querySelector('[data-result="number"]')?.textContent).toBe('42')
    expect(controls.every((control) => !control.disabled)).toBe(true)
  })

  it('shows final results immediately without timers when reduced motion is preferred', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true })
    mountPickerApp(document.querySelector<HTMLElement>('#app')!)

    submit(document.querySelector<HTMLFormElement>('form')!)

    expect(document.querySelector('[data-result="letter"]')?.textContent).toBe('M')
    expect(document.querySelector('[data-result="number"]')?.textContent).toBe('42')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('marks a long final number for compact rendering inside its card', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true })
    mockedPickInteger.mockReturnValueOnce(9007199254740991)
    mountPickerApp(document.querySelector<HTMLElement>('#app')!)

    submit(document.querySelector<HTMLFormElement>('form')!)

    expect(document.querySelector('[data-result="number"]')?.classList.contains('result-value--long')).toBe(true)
  })

  it('marks five-digit final numbers for responsive card sizing', () => {
    window.matchMedia = vi.fn().mockReturnValue({ matches: true })
    mockedPickInteger.mockReturnValueOnce(12345)
    mountPickerApp(document.querySelector<HTMLElement>('#app')!)

    submit(document.querySelector<HTMLFormElement>('form')!)

    expect(document.querySelector('[data-result="number"]')?.classList.contains('result-value--medium')).toBe(true)
  })
})

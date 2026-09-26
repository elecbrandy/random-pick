import { pickInteger, pickLetter, validateRange } from './picker'

const SPIN_DURATION_MS = 1500
const SPIN_INTERVAL_MS = 75

export function mountPickerApp(root: HTMLElement): void {
  root.innerHTML = `
    <section class="picker" aria-labelledby="page-title">
      <header>
        <p class="eyebrow">RANDOM PICK</p>
        <h1 id="page-title">랜덤 뽑기</h1>
        <p class="intro">알파벳 한 글자와 원하는 범위의 숫자를 함께 뽑아 보세요.</p>
      </header>
      <div class="results" aria-label="추첨 결과">
        <article class="result-card">
          <p class="result-label">알파벳</p>
          <span class="result-value" data-result="letter">?</span>
        </article>
        <article class="result-card">
          <p class="result-label">숫자</p>
          <span class="result-value" data-result="number">?</span>
        </article>
      </div>
      <form class="range-form" novalidate>
        <div class="field">
          <label for="min">최솟값</label>
          <input id="min" name="min" type="text" value="1" inputmode="decimal" aria-describedby="min-error" />
          <p class="field-error" id="min-error"></p>
        </div>
        <div class="field">
          <label for="max">최댓값</label>
          <input id="max" name="max" type="text" value="100" inputmode="decimal" aria-describedby="max-error" />
          <p class="field-error" id="max-error"></p>
        </div>
        <p class="field-error range-error" id="range-error"></p>
        <button type="submit">뽑기</button>
      </form>
      <p class="sr-only" aria-live="polite" aria-atomic="true" data-live-message></p>
    </section>
  `

  const form = root.querySelector<HTMLFormElement>('form')!
  const minInput = root.querySelector<HTMLInputElement>('#min')!
  const maxInput = root.querySelector<HTMLInputElement>('#max')!
  const button = root.querySelector<HTMLButtonElement>('button')!
  const letterSlot = root.querySelector<HTMLElement>('[data-result="letter"]')!
  const numberSlot = root.querySelector<HTMLElement>('[data-result="number"]')!
  const minError = root.querySelector<HTMLElement>('#min-error')!
  const maxError = root.querySelector<HTMLElement>('#max-error')!
  const rangeError = root.querySelector<HTMLElement>('#range-error')!
  const liveMessage = root.querySelector<HTMLElement>('[data-live-message]')!
  let spinning = false

  function setControlsDisabled(disabled: boolean) {
    minInput.disabled = disabled
    maxInput.disabled = disabled
    button.disabled = disabled
  }

  function clearErrors() {
    minError.textContent = ''
    maxError.textContent = ''
    rangeError.textContent = ''
  }

  function setResultValue(slot: HTMLElement, value: string | number) {
    const text = String(value)
    slot.textContent = text
    slot.classList.toggle('result-value--medium', text.length >= 5)
    slot.classList.toggle('result-value--long', text.length >= 10)
  }

  function showError(field: 'min' | 'max' | 'range', message: string) {
    clearErrors()
    const error = field === 'min' ? minError : field === 'max' ? maxError : rangeError
    error.textContent = message
    liveMessage.textContent = message
  }

  function finish(letter: string, number: number) {
    setResultValue(letterSlot, letter)
    setResultValue(numberSlot, number)
    spinning = false
    setControlsDisabled(false)
    liveMessage.textContent = `추첨 결과: 알파벳 ${letter}, 숫자 ${number}`
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    if (spinning) return

    const validation = validateRange(minInput.value, maxInput.value)
    if (!validation.ok) {
      showError(validation.field, validation.message)
      return
    }

    clearErrors()
    const finalLetter = pickLetter()
    const finalNumber = pickInteger(validation.range.min, validation.range.max)
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    if (reduceMotion) {
      finish(finalLetter, finalNumber)
      return
    }

    spinning = true
    setControlsDisabled(true)
    const spin = window.setInterval(() => {
      setResultValue(letterSlot, pickLetter())
      setResultValue(numberSlot, pickInteger(validation.range.min, validation.range.max))
    }, SPIN_INTERVAL_MS)

    window.setTimeout(() => {
      window.clearInterval(spin)
      finish(finalLetter, finalNumber)
    }, SPIN_DURATION_MS)
  })
}

import { createHistoryStore } from './history'
import { pickAvailablePair, pickInteger, remainingCombinationCount, validateLetterRange, validateRange } from './picker'

const SPIN_DURATION_MS = 1500
const SPIN_INTERVAL_MS = 75
const LETTERS = Array.from({ length: 26 }, (_, index) => String.fromCharCode('A'.charCodeAt(0) + index))

function letterOptions(selected: string): string {
  return LETTERS.map((letter) => `<option value="${letter}"${letter === selected ? ' selected' : ''}>${letter}</option>`).join('')
}

export function mountPickerApp(root: HTMLElement): void {
  root.innerHTML = `
    <section class="picker" aria-labelledby="page-title">
      <header>
        <p class="eyebrow">RANDOM PICK</p>
        <h1 id="page-title">랜덤 뽑기</h1>
        <p class="intro">알파벳 한 글자와 원하는 범위의 숫자를 함께 뽑아 보세요.</p>
      </header>
      <div class="results" aria-label="추첨 결과">
        <article class="result-card"><p class="result-label">알파벳</p><span class="result-value" data-result="letter">?</span></article>
        <article class="result-card"><p class="result-label">숫자</p><span class="result-value" data-result="number">?</span></article>
      </div>
      <form class="range-form" novalidate>
        <div class="field"><label for="letter-start">알파벳 시작</label><select id="letter-start" name="letter-start" aria-describedby="letter-range-error">${letterOptions('A')}</select></div>
        <div class="field"><label for="letter-end">알파벳 끝</label><select id="letter-end" name="letter-end" aria-describedby="letter-range-error">${letterOptions('Z')}</select></div>
        <p class="field-error range-error" id="letter-range-error"></p>
        <div class="field"><label for="min">최솟값</label><input id="min" name="min" type="text" value="1" inputmode="decimal" aria-describedby="min-error" /><p class="field-error" id="min-error"></p></div>
        <div class="field"><label for="max">최댓값</label><input id="max" name="max" type="text" value="100" inputmode="decimal" aria-describedby="max-error" /><p class="field-error" id="max-error"></p></div>
        <p class="field-error range-error" id="range-error"></p>
        <button type="submit">뽑기</button>
      </form>
      <p class="field-error" data-exhausted aria-live="polite"></p>
      <p class="storage-notice" data-storage-notice></p>
      <section class="history" aria-labelledby="history-heading">
        <div class="history-heading"><h2 id="history-heading">추첨 기록</h2><p data-history-count>0개</p></div>
        <p data-history-empty>아직 추첨 기록이 없습니다.</p>
        <ol data-history-list></ol>
      </section>
      <p class="sr-only" aria-live="polite" aria-atomic="true" data-live-message></p>
    </section>
  `

  const form = root.querySelector<HTMLFormElement>('form')!
  const letterStartInput = root.querySelector<HTMLSelectElement>('#letter-start')!
  const letterEndInput = root.querySelector<HTMLSelectElement>('#letter-end')!
  const minInput = root.querySelector<HTMLInputElement>('#min')!
  const maxInput = root.querySelector<HTMLInputElement>('#max')!
  const button = root.querySelector<HTMLButtonElement>('button')!
  const letterSlot = root.querySelector<HTMLElement>('[data-result="letter"]')!
  const numberSlot = root.querySelector<HTMLElement>('[data-result="number"]')!
  const letterRangeError = root.querySelector<HTMLElement>('#letter-range-error')!
  const minError = root.querySelector<HTMLElement>('#min-error')!
  const maxError = root.querySelector<HTMLElement>('#max-error')!
  const rangeError = root.querySelector<HTMLElement>('#range-error')!
  const exhausted = root.querySelector<HTMLElement>('[data-exhausted]')!
  const storageNotice = root.querySelector<HTMLElement>('[data-storage-notice]')!
  const historyList = root.querySelector<HTMLOListElement>('[data-history-list]')!
  const historyCount = root.querySelector<HTMLElement>('[data-history-count]')!
  const historyEmpty = root.querySelector<HTMLElement>('[data-history-empty]')!
  const liveMessage = root.querySelector<HTMLElement>('[data-live-message]')!
  const history = createHistoryStore()
  let spinning = false

  function setResultValue(slot: HTMLElement, value: string | number) {
    const text = String(value)
    slot.textContent = text
    slot.classList.toggle('result-value--medium', text.length >= 5)
    slot.classList.toggle('result-value--long', text.length >= 10)
  }

  function renderHistory() {
    const entries = history.entries
    historyCount.textContent = `${entries.length}개`
    historyEmpty.hidden = entries.length > 0
    const items = document.createDocumentFragment()
    for (const draw of entries.slice().reverse()) {
      const item = document.createElement('li')
      item.textContent = `${draw.letter} · ${draw.number}`
      items.append(item)
    }
    historyList.replaceChildren(items)
    storageNotice.textContent = history.persistent ? '' : '기록을 이 기기 세션에 저장할 수 없습니다. 새로고침하면 기록이 사라질 수 있습니다.'
  }

  function clearErrors() {
    letterRangeError.textContent = ''
    minError.textContent = ''
    maxError.textContent = ''
    rangeError.textContent = ''
  }

  function validation() {
    const letters = validateLetterRange(letterStartInput.value, letterEndInput.value)
    const numbers = validateRange(minInput.value, maxInput.value)
    return { letters, numbers }
  }

  function renderAvailability() {
    const { letters, numbers } = validation()
    if (!letters.ok || !numbers.ok) {
      exhausted.textContent = ''
      button.disabled = spinning
      return
    }
    const available = remainingCombinationCount(letters.range, numbers.range, history.entries) > 0n
    exhausted.textContent = available ? '' : '현재 범위의 조합이 모두 소진되었습니다. 범위를 변경하세요.'
    button.disabled = spinning || !available
  }

  function setControlsDisabled(disabled: boolean) {
    letterStartInput.disabled = disabled
    letterEndInput.disabled = disabled
    minInput.disabled = disabled
    maxInput.disabled = disabled
    button.disabled = disabled
  }

  function showValidationError() {
    clearErrors()
    const { letters, numbers } = validation()
    if (!letters.ok) {
      letterRangeError.textContent = letters.message
      liveMessage.textContent = letters.message
      return false
    }
    if (!numbers.ok) {
      const error = numbers.field === 'min' ? minError : numbers.field === 'max' ? maxError : rangeError
      error.textContent = numbers.message
      liveMessage.textContent = numbers.message
      return false
    }
    return { letters: letters.range, numbers: numbers.range }
  }

  function finish() {
    const latest = history.entries.at(-1)!
    setResultValue(letterSlot, latest.letter)
    setResultValue(numberSlot, latest.number)
    spinning = false
    setControlsDisabled(false)
    renderHistory()
    renderAvailability()
    liveMessage.textContent = `추첨 결과: 알파벳 ${latest.letter}, 숫자 ${latest.number}`
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault()
    if (spinning) return
    const valid = showValidationError()
    if (!valid) return
    const draw = pickAvailablePair(valid.letters, valid.numbers, history.entries)
    if (draw === null) {
      renderAvailability()
      liveMessage.textContent = exhausted.textContent
      return
    }

    clearErrors()
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduceMotion) {
      history.add(draw)
      finish()
      return
    }

    spinning = true
    setControlsDisabled(true)
    const spin = window.setInterval(() => {
      setResultValue(letterSlot, String.fromCharCode(pickInteger(
        valid.letters.start.charCodeAt(0),
        valid.letters.end.charCodeAt(0),
      )))
      setResultValue(numberSlot, pickInteger(valid.numbers.min, valid.numbers.max))
    }, SPIN_INTERVAL_MS)
    window.setTimeout(() => {
      window.clearInterval(spin)
      history.add(draw)
      finish()
    }, SPIN_DURATION_MS)
  })

  for (const control of [letterStartInput, letterEndInput, minInput, maxInput]) {
    control.addEventListener('change', renderAvailability)
    control.addEventListener('input', renderAvailability)
  }

  const latest = history.entries.at(-1)
  if (latest) {
    setResultValue(letterSlot, latest.letter)
    setResultValue(numberSlot, latest.number)
  }
  renderHistory()
  renderAvailability()
}

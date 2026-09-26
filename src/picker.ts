export type Range = { min: number; max: number }

export type RangeValidation =
  | { ok: true; range: Range }
  | { ok: false; field: 'min' | 'max' | 'range'; message: string }

const INTEGER_TEXT = /^[+-]?\d+$/
const MAX_SAMPLE = 2n ** 53n
const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER)

function parseSafeInteger(text: string): number | undefined {
  const trimmed = text.trim()
  if (!INTEGER_TEXT.test(trimmed)) return undefined

  const value = Number(trimmed)
  return Number.isSafeInteger(value) ? value : undefined
}

export function validateRange(minText: string, maxText: string): RangeValidation {
  const min = parseSafeInteger(minText)
  if (min === undefined) {
    return { ok: false, field: 'min', message: '최솟값에 안전한 정수를 입력하세요.' }
  }

  const max = parseSafeInteger(maxText)
  if (max === undefined) {
    return { ok: false, field: 'max', message: '최댓값에 안전한 정수를 입력하세요.' }
  }

  if (min > max) {
    return { ok: false, field: 'range', message: '최솟값은 최댓값보다 클 수 없습니다.' }
  }

  const width = BigInt(max) - BigInt(min) + 1n
  if (width > MAX_SAFE) {
    return { ok: false, field: 'range', message: '선택 가능한 숫자 범위가 너무 큽니다.' }
  }

  return { ok: true, range: { min, max } }
}

function cryptoSample53(): bigint {
  const values = new Uint32Array(2)
  crypto.getRandomValues(values)
  return (BigInt(values[0] & 0x1fffff) << 32n) | BigInt(values[1])
}

export function pickInteger(min: number, max: number, sample53 = cryptoSample53): number {
  const width = BigInt(max) - BigInt(min) + 1n
  const limit = (MAX_SAMPLE / width) * width
  let sample: bigint

  do {
    sample = sample53()
  } while (sample >= limit)

  return Number(BigInt(min) + sample % width)
}

export function pickLetter(sample53?: () => bigint): string {
  return String.fromCharCode('A'.charCodeAt(0) + pickInteger(0, 25, sample53))
}

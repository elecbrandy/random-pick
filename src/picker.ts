export type Range = { min: number; max: number }
export type Draw = { letter: string; number: number }
export type LetterRange = { start: string; end: string }
export type LetterRangeValidation =
  | { ok: true; range: LetterRange }
  | { ok: false; message: string }

export type RangeValidation =
  | { ok: true; range: Range }
  | { ok: false; field: 'min' | 'max' | 'range'; message: string }

const INTEGER_TEXT = /^[+-]?\d+$/
const MAX_SAMPLE = 2n ** 53n
const MAX_SAFE = BigInt(Number.MAX_SAFE_INTEGER)
const MAX_SAMPLE_64 = 2n ** 64n
const FIRST_LETTER_CODE = 'A'.charCodeAt(0)
const LAST_LETTER_CODE = 'Z'.charCodeAt(0)

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

export function validateLetterRange(start: string, end: string): LetterRangeValidation {
  if (!isUppercaseLetter(start) || !isUppercaseLetter(end)) {
    return { ok: false, message: '알파벳 범위는 A부터 Z 사이에서 선택하세요.' }
  }

  if (start > end) {
    return { ok: false, message: '알파벳 시작은 끝보다 뒤일 수 없습니다.' }
  }

  return { ok: true, range: { start, end } }
}

function isUppercaseLetter(value: string): boolean {
  return value.length === 1 && value.charCodeAt(0) >= FIRST_LETTER_CODE && value.charCodeAt(0) <= LAST_LETTER_CODE
}

function letterOffset(letter: string): number {
  return letter.charCodeAt(0) - FIRST_LETTER_CODE
}

function inRanges(draw: Draw, letters: LetterRange, numbers: Range): boolean {
  return isUppercaseLetter(draw.letter)
    && Number.isSafeInteger(draw.number)
    && draw.letter >= letters.start
    && draw.letter <= letters.end
    && draw.number >= numbers.min
    && draw.number <= numbers.max
}

function usedIndices(letters: LetterRange, numbers: Range, used: readonly Draw[]): bigint[] {
  const width = BigInt(numbers.max) - BigInt(numbers.min) + 1n
  const startOffset = letterOffset(letters.start)
  const indices = new Set<bigint>()

  for (const draw of used) {
    if (!inRanges(draw, letters, numbers)) continue
    indices.add(BigInt(letterOffset(draw.letter) - startOffset) * width + BigInt(draw.number - numbers.min))
  }

  return [...indices].sort((left, right) => (left < right ? -1 : left > right ? 1 : 0))
}

export function remainingCombinationCount(letters: LetterRange, numbers: Range, used: readonly Draw[]): bigint {
  const width = BigInt(numbers.max) - BigInt(numbers.min) + 1n
  const letterCount = BigInt(letterOffset(letters.end) - letterOffset(letters.start) + 1)
  return width * letterCount - BigInt(usedIndices(letters, numbers, used).length)
}

function cryptoSample64(): bigint {
  const values = new Uint32Array(2)
  crypto.getRandomValues(values)
  return (BigInt(values[0]) << 32n) | BigInt(values[1])
}

function pickRank(total: bigint, sample64: () => bigint): bigint {
  const limit = (MAX_SAMPLE_64 / total) * total
  let sample: bigint
  do {
    sample = sample64()
  } while (sample < 0n || sample >= limit)
  return sample % total
}

export function pickAvailablePair(
  letters: LetterRange,
  numbers: Range,
  used: readonly Draw[],
  sample64 = cryptoSample64,
): Draw | null {
  const indices = usedIndices(letters, numbers, used)
  const width = BigInt(numbers.max) - BigInt(numbers.min) + 1n
  const total = width * BigInt(letterOffset(letters.end) - letterOffset(letters.start) + 1)
  const remaining = total - BigInt(indices.length)
  if (remaining === 0n) return null

  const usedCounts = Array.from({ length: letterOffset(letters.end) - letterOffset(letters.start) + 1 }, () => 0)
  for (const usedIndex of indices) {
    usedCounts[Number(usedIndex / width)]++
  }

  const leastUsed = Math.min(...usedCounts.filter((count) => BigInt(count) < width))
  const eligibleOffsets = usedCounts.flatMap((count, offset) => count === leastUsed ? [offset] : [])
  const availablePerLetter = width - BigInt(leastUsed)
  const rank = pickRank(BigInt(eligibleOffsets.length) * availablePerLetter, sample64)
  const offset = eligibleOffsets[Number(rank / availablePerLetter)]
  const letterStartIndex = BigInt(offset) * width
  let numberIndex = rank % availablePerLetter

  for (const usedIndex of indices) {
    if (usedIndex < letterStartIndex) continue
    if (usedIndex >= letterStartIndex + width || usedIndex - letterStartIndex > numberIndex) break
    numberIndex += 1n
  }

  return {
    letter: String.fromCharCode(letters.start.charCodeAt(0) + offset),
    number: Number(BigInt(numbers.min) + numberIndex),
  }
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

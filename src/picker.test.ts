import { describe, expect, it } from 'vitest'
import {
  pickAvailablePair,
  pickInteger,
  pickLetter,
  remainingCombinationCount,
  validateLetterRange,
  validateRange,
} from './picker'

describe('validateRange', () => {
  it('accepts safe closed integer ranges', () => {
    expect(validateRange('1', '100')).toEqual({ ok: true, range: { min: 1, max: 100 } })
    expect(validateRange('-2', '2')).toEqual({ ok: true, range: { min: -2, max: 2 } })
    expect(validateRange('  +01  ', '0002')).toEqual({ ok: true, range: { min: 1, max: 2 } })
  })

  it('rejects missing, fractional, and exponential minimum values', () => {
    expect(validateRange('', '10')).toMatchObject({ ok: false, field: 'min' })
    expect(validateRange('   ', '10')).toMatchObject({ ok: false, field: 'min' })
    expect(validateRange('1.5', '10')).toMatchObject({ ok: false, field: 'min' })
    expect(validateRange('1e2', '10')).toMatchObject({ ok: false, field: 'min' })
  })

  it('rejects reversed, unsafe, and too-wide ranges', () => {
    expect(validateRange('10', '1')).toMatchObject({ ok: false, field: 'range' })
    expect(validateRange('9007199254740992', '9007199254740992')).toMatchObject({ ok: false })
    expect(validateRange('-9007199254740991', '9007199254740991')).toMatchObject({ ok: false, field: 'range' })
  })
})

describe('picks', () => {
  it('maps samples into inclusive integer ranges', () => {
    expect(pickInteger(1, 100, () => 0n)).toBe(1)
    expect(pickInteger(1, 100, () => 99n)).toBe(100)
    expect(pickInteger(-2, 2, () => 4n)).toBe(2)
    expect(pickInteger(7, 7, () => 0n)).toBe(7)
  })

  it('maps samples to alphabet endpoints', () => {
    expect(pickLetter(() => 0n)).toBe('A')
    expect(pickLetter(() => 25n)).toBe('Z')
  })

  it('rejects an out-of-limit sample before accepting the next one', () => {
    const samples = [2n ** 53n - 1n, 0n]
    let calls = 0
    const sampler = () => samples[calls++]

    expect(pickInteger(10, 19, sampler)).toBe(10)
    expect(calls).toBe(2)
  })
})

describe('letter ranges and available pairs', () => {
  it('accepts closed alphabet ranges and rejects invalid endpoints', () => {
    expect(validateLetterRange('A', 'Z')).toMatchObject({ ok: true })
    expect(validateLetterRange('A', 'A')).toMatchObject({ ok: true })
    expect(validateLetterRange('Z', 'A')).toMatchObject({ ok: false })
    expect(validateLetterRange('a', 'Z')).toMatchObject({ ok: false })
    expect(validateLetterRange('A', 'AA')).toMatchObject({ ok: false })
  })

  it('counts only unique used pairs that fall inside both ranges', () => {
    expect(remainingCombinationCount({ start: 'A', end: 'B' }, { min: 1, max: 2 }, [])).toBe(4n)
    expect(remainingCombinationCount({ start: 'A', end: 'B' }, { min: 1, max: 2 }, [{ letter: 'A', number: 1 }])).toBe(3n)
    expect(remainingCombinationCount({ start: 'A', end: 'A' }, { min: 1, max: 1 }, [{ letter: 'A', number: 1 }])).toBe(0n)
    expect(remainingCombinationCount(
      { start: 'A', end: 'A' },
      { min: 1, max: 1 },
      [{ letter: 'A', number: 1 }, { letter: 'A', number: 1 }, { letter: 'B', number: 1 }],
    )).toBe(0n)
    expect(remainingCombinationCount(
      { start: 'A', end: 'A' },
      { min: 1, max: 2 },
      [{ letter: 'B', number: 1 }],
    )).toBe(2n)
    expect(remainingCombinationCount(
      { start: 'A', end: 'B' },
      { min: 1, max: 2 },
      [{ letter: 'B', number: 1 }],
    )).toBe(3n)
  })

  it('supports totals larger than Number.MAX_SAFE_INTEGER without materializing pairs', () => {
    expect(remainingCombinationCount(
      { start: 'A', end: 'Z' },
      { min: 1, max: Number.MAX_SAFE_INTEGER },
      [],
    )).toBeGreaterThan(BigInt(Number.MAX_SAFE_INTEGER))
  })

  it('maps a rank to an unused pair and does not sample an exhausted range', () => {
    expect(pickAvailablePair(
      { start: 'A', end: 'A' },
      { min: 1, max: 2 },
      [{ letter: 'A', number: 1 }],
      () => 0n,
    )).toEqual({ letter: 'A', number: 2 })

    let calls = 0
    expect(pickAvailablePair(
      { start: 'A', end: 'A' },
      { min: 1, max: 1 },
      [{ letter: 'A', number: 1 }],
      () => { calls++; return 0n },
    )).toBeNull()
    expect(calls).toBe(0)
  })

  it('maps the highest available rank to the final unused grid position', () => {
    expect(pickAvailablePair(
      { start: 'A', end: 'B' },
      { min: 1, max: 2 },
      [{ letter: 'A', number: 1 }],
      () => 2n,
    )).toEqual({ letter: 'B', number: 2 })
  })

  it('rejects a 64-bit sample in the modulo bias tail before selecting a pair', () => {
    const samples = [2n ** 64n - 1n, 2n]
    let calls = 0

    expect(pickAvailablePair(
      { start: 'A', end: 'A' },
      { min: 1, max: 3 },
      [],
      () => samples[calls++],
    )).toEqual({ letter: 'A', number: 3 })
    expect(calls).toBe(2)
  })
})

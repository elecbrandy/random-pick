import { describe, expect, it } from 'vitest'
import { pickInteger, pickLetter, validateRange } from './picker'

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

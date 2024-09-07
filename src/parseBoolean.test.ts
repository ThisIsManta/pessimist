import { it, expect } from 'vitest'
import { parseBoolean } from './parseBoolean'

it('returns the default value, given undefined', () => {
	expect(parseBoolean(undefined)).toBe(false)
	expect(parseBoolean(undefined, false)).toBe(false)
	expect(parseBoolean(undefined, true)).toBe(true)
})

it('returns as-is, given a Boolean', () => {
	expect(parseBoolean(false)).toBe(false)
	expect(parseBoolean(true)).toBe(true)
})

it('returns false, given a false-like string', () => {
	expect(parseBoolean('false')).toBe(false)
	expect(parseBoolean('False')).toBe(false)
	expect(parseBoolean('FALSE')).toBe(false)
	expect(parseBoolean('0')).toBe(false)
	expect(parseBoolean('n')).toBe(false)
	expect(parseBoolean('no')).toBe(false)
	expect(parseBoolean('off')).toBe(false)
	expect(parseBoolean('')).toBe(false)
	expect(parseBoolean(NaN)).toBe(false)
})

it('returns true, otherwise', () => {
	expect(parseBoolean('true')).toBe(true)
	expect(parseBoolean('True')).toBe(true)
	expect(parseBoolean('TRUE')).toBe(true)
	expect(parseBoolean('1')).toBe(true)
	expect(parseBoolean('y')).toBe(true)
	expect(parseBoolean('yes')).toBe(true)
	expect(parseBoolean('on')).toBe(true)
	expect(parseBoolean('xxx')).toBe(true)
})

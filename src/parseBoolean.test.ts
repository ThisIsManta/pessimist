import { it, expect } from 'vitest'
import { parseBoolean } from './parseBoolean'

it('returns the fallback value, given undefined', () => {
	expect(parseBoolean(undefined)).toBe(false)
	expect(parseBoolean(undefined, false)).toBe(false)
	expect(parseBoolean(undefined, true)).toBe(true)
})

it('returns false, given Null or an empty string', () => {
	expect(parseBoolean(null)).toBe(false)
	expect(parseBoolean('')).toBe(false)
})

it('returns as-is, given a Boolean', () => {
	expect(parseBoolean(false)).toBe(false)
	expect(parseBoolean(true)).toBe(true)
})

it('returns the fallback value, given NaN', () => {
	expect(parseBoolean(NaN)).toBe(false)
	expect(parseBoolean(NaN, false)).toBe(false)
	expect(parseBoolean(NaN, true)).toBe(true)
})

it('returns true, given a non-zero number', () => {
	expect(parseBoolean(0)).toBe(false)
	expect(parseBoolean(-0)).toBe(false)
	expect(parseBoolean(1)).toBe(true)
	expect(parseBoolean(0.1)).toBe(true)
})

it.for([
	'false', 'False', 'FaLsE', 'FALSE', '0', 'n', 'no', 'off',
])('returns false, given %s', (value) => {
	expect(parseBoolean(value)).toBe(false)
})

it('returns true, otherwise', () => {
	expect(parseBoolean('true')).toBe(true)
	expect(parseBoolean('True')).toBe(true)
	expect(parseBoolean('TRUE')).toBe(true)
	expect(parseBoolean('1')).toBe(true)
	expect(parseBoolean(' ')).toBe(true)
	expect(parseBoolean('y')).toBe(true)
	expect(parseBoolean('yes')).toBe(true)
	expect(parseBoolean('on')).toBe(true)
	expect(parseBoolean('xxx')).toBe(true)
	expect(parseBoolean(Symbol())).toBe(true)
	expect(parseBoolean({})).toBe(true)
})

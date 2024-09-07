import { afterEach, describe, it, expect, vi } from 'vitest'
import { parseArguments } from './parseArguments'
import { parseBoolean } from './parseBoolean'

vi.mock('./parseBoolean', async (importOriginal) => {
	const { parseBoolean } = await importOriginal<any>()
	return { parseBoolean: vi.fn(parseBoolean) }
})

afterEach(() => {
	vi.clearAllMocks()
})

it('returns the defaults, given no inputs', () => {
	const defaults = { dryRun: Boolean(false) }

	expect(parseArguments([], defaults))
		.toEqual({
			...defaults,
			length: 0,
		})
})

it('returns the specified fields among the defaults and the argument list', () => {
	const defaults = { dryRun: Boolean(false), debug: Boolean(false) }

	expect(parseArguments(['data.yml', '--dry-run', 'data.json', '--debug'], defaults))
		.toEqual({
			dryRun: true,
			debug: true,
			'0': 'data.yml',
			'1': 'data.json',
			length: 2,
		})
})

it('does not return "--"', () => {
	expect(parseArguments(['-'], {})).toStrictEqual({
		length: 0,
	})
	expect(parseArguments(['--'], {})).toStrictEqual({
		length: 0,
	})
	expect(parseArguments(['---'], {})).toStrictEqual({
		length: 0,
	})
})

it('throws when the field does not exist in the defaults', () => {
	const defaults = {}

	expect(() => parseArguments(['--dry-run'], defaults)).toThrow('Unexpected "--dry-run" as it was not defined in the default hash.')
})

it('returns the specified field, given its alias name', () => {
	const defaults = { dryRun: false }

	expect(parseArguments(['-d'], defaults, { aliases: [['d', 'dryRun']] })).toMatchObject({
		dryRun: true,
	})
	expect(parseArguments(['-d', '--dryRun=false'], defaults, { aliases: [['d', 'dryRun']] })).toMatchObject({
		dryRun: false,
	})
	expect(parseArguments(['--dryRun=false', '-d'], defaults, { aliases: [['d', 'dryRun']] })).toMatchObject({
		dryRun: true,
	})
})

it('does not throw when only one exclusive field is provided', () => {
	const defaults = { dryRun: false, confirmed: true }

	expect(() => parseArguments(['--dryRun'], defaults, { exclusives: [['dryRun', 'confirmed']] })).not.toThrow()
})

it('throws when one or more exclusive fields co-exist', () => {
	const defaults = { dryRun: false, confirmed: true }

	expect(() => parseArguments(['--dryRun', '--confirmed'], defaults, { exclusives: [['dryRun', 'confirmed']] })).toThrow('Unexpected "--dryRun" and "--confirmed" to exist at the same time as they are mutually exclusive.')
})

describe('Boolean', () => {
	it('returns true, given no value', () => {
		const defaults = { dryRun: Boolean(false) }

		expect(parseArguments(['--dry-run'], defaults))
			.toMatchObject({ dryRun: true })
		expect(parseBoolean).not.toHaveBeenCalled()
	})

	it('returns false, given a false-like string', () => {
		const defaults = { dryRun: Boolean(true) }
		parseArguments(['--dry-run=false'], defaults)

		expect(parseBoolean).toHaveBeenCalled()
	})

	it('returns true, otherwise', () => {
		const defaults = { dryRun: Boolean(false) }
		parseArguments(['--dry-run=false'], defaults)

		expect(parseBoolean).toHaveBeenCalled()
	})

	it('returns the inverse, given a no-prefix value', () => {
		const defaults = { dryRun: Boolean(false) }

		expect(parseArguments(['--no-dry-run'], defaults))
			.toMatchObject({ dryRun: false })
		expect(parseArguments(['--no-dry-run=false'], defaults))
			.toMatchObject({ dryRun: true })
		expect(parseBoolean).toHaveBeenCalled()
	})

	it('returns the inverse, given a no-prefix default', () => {
		const defaults = { noDryRun: Boolean(false) }

		expect(parseArguments(['--dry-run'], defaults))
			.toMatchObject({ noDryRun: false })
		expect(parseArguments(['--dry-run=false'], defaults))
			.toMatchObject({ noDryRun: true })
		expect(parseArguments(['--no-dry-run'], defaults))
			.toMatchObject({ noDryRun: true })
		expect(parseArguments(['--no-dry-run=false'], defaults))
			.toMatchObject({ noDryRun: false })
		expect(parseBoolean).toHaveBeenCalled()
	})

	it('returns the latest value, given multiple values with the same name', () => {
		const defaults = { dryRun: Boolean(false) }

		expect(parseArguments(['--dry-run=true', '--dry-run=false'], defaults))
			.toMatchObject({ dryRun: false })
		expect(parseArguments(['--dry-run=true', '--dry-run=false', '--dry-run=true'], defaults))
			.toMatchObject({ dryRun: true })
	})
})

describe('Number', () => {
	it('returns the given number', () => {
		const defaults = { count: 0 }

		expect(parseArguments(['--count=1'], defaults))
			.toMatchObject({ count: 1 })
		expect(parseArguments(['--count=1.999'], defaults))
			.toMatchObject({ count: 1.999 })
	})

	it('returns not-a-number, given no value or a non-number value', () => {
		const defaults = { count: 0 }

		expect(parseArguments(['--count=a'], defaults))
			.toMatchObject({ count: NaN })
		expect(parseArguments(['--count'], defaults))
			.toMatchObject({ count: NaN })
	})

	it('returns the default value, given no-prefix value', () => {
		const defaults = { count: 0 }

		expect(parseArguments(['--count=1', '--no-count'], defaults))
			.toMatchObject({ count: 0 })
	})

	it('throws, given no-prefix value with a value', () => {
		const defaults = { count: 0 }

		expect(() => parseArguments(['--no-count=1'], defaults))
			.toThrow('Unexpected "--no-count=1" to have a value.')
	})
})

describe('String', () => {
	it('returns the given string', () => {
		const defaults = { input: 'n/a' }

		expect(parseArguments(['--input=dream comes true'], defaults))
			.toMatchObject({ input: 'dream comes true' })
		expect(parseArguments(['--input='], defaults))
			.toMatchObject({ input: '' })
	})

	it('returns an empty string, given no-prefix value with a matching value', () => {
		const defaults = { input: 'n/a' }

		expect(parseArguments(['--no-input'], defaults))
			.toMatchObject({ input: '' })
		expect(parseArguments(['--no-input=n/a'], defaults))
			.toMatchObject({ input: '' })
		expect(parseArguments(['--no-input=xxx'], defaults))
			.toMatchObject({ input: 'n/a' })
	})

	it('throws, given no value', () => {
		const defaults = { input: 'n/a' }

		expect(() => parseArguments(['--input'], defaults))
			.toThrow('Expected "--input" to have a value.')
	})
})

describe('Array<String>', () => {
	it('returns the given unique items cumulatively', () => {
		const defaults = { input: [] }

		expect(parseArguments(['--input=dream'], defaults))
			.toMatchObject({ input: ['dream'] })
		expect(parseArguments(['--input=dream', '--input=comes'], defaults))
			.toMatchObject({ input: ['dream', 'comes'] })
	})

	it('does not return duplicate items', () => {
		const defaults = { input: [] }

		expect(parseArguments(['--input=dream', '--input=comes', '--input=dream'], defaults))
			.toMatchObject({ input: ['comes', 'dream'] })
	})

	it('returns an empty list, given no-prefix value without a value', () => {
		const defaults = { input: ['dream'] }

		expect(parseArguments(['--no-input'], defaults))
			.toMatchObject({ input: [] })
	})

	it('does not return the matching items, given a no-prefix value', () => {
		const defaults = { input: ['dream'] }

		expect(parseArguments(['--no-input=dream'], defaults))
			.toMatchObject({ input: [] })
		expect(parseArguments(['--input=comes', '--no-input=comes'], defaults))
			.toMatchObject({ input: ['dream'] })
	})

	it('throws, given no value', () => {
		const defaults = { input: [] }

		expect(() => parseArguments(['--input'], defaults))
			.toThrow('Expected "--input" to have a value.')
	})
})

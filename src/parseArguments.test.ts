import { afterEach, describe, it, expect, vi } from 'vitest'
import { parseArguments } from './parseArguments'

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

it('returns the output containing the named arguments and the positional arguments', () => {
	const { dryRun, debug, ...positionalArguments } = parseArguments(
		['data.yml', '--dry-run', 'data.json'],
		{ dryRun: Boolean(false), debug: Boolean(false) }
	)

	expect(dryRun).toBe(true)
	expect(debug).toBe(false)
	expect(positionalArguments).toStrictEqual({
		'0': 'data.yml',
		'1': 'data.json',
		length: 2,
	})
	expect(Array.from(positionalArguments)).toEqual(['data.yml', 'data.json'])
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

	expect(() => parseArguments(['--dry-run'], defaults)).toThrow('Unexpected an unknown argument: --dry-run')
})

it('returns the rightmost respective value', () => {
	expect(parseArguments(
		['-d'],
		{ d: false },
	)).toMatchObject({ d: true })
	expect(parseArguments(
		['-d=true'],
		{ d: false },
	)).toMatchObject({ d: true })
	expect(parseArguments(
		['-d'],
		{ dryRun: false },
		{ aliases: { d: 'dryRun' } }
	)).toMatchObject({ dryRun: true })
	expect(parseArguments(
		['-d', '--dryRun=false'],
		{ dryRun: false },
		{ aliases: { d: 'dryRun' } }
	)).toMatchObject({ dryRun: false })
	expect(parseArguments(
		['--dryRun=false', '-d'],
		{ dryRun: false },
		{ aliases: { d: 'dryRun' } }
	)).toMatchObject({ dryRun: true })
	expect(parseArguments(
		['--commit'],
		{ dryRun: true },
		{ aliases: { commit: '!dryRun' } }
	)).toMatchObject({ dryRun: false })
	expect(parseArguments(
		['--no-commit'],
		{ dryRun: false },
		{ aliases: { commit: '!dryRun' } }
	)).toMatchObject({ dryRun: true })
	expect(parseArguments(
		['--commit=false'],
		{ dryRun: false },
		{ aliases: { commit: '!dryRun' } }
	)).toMatchObject({ dryRun: true })
	expect(parseArguments(
		['--commit'],
		{ run: false },
		{ aliases: { noCommit: '!run' } }
	)).toMatchObject({ run: true })
	expect(parseArguments(
		['--noCommit'],
		{ run: true },
		{ aliases: { noCommit: '!run' } }
	)).toMatchObject({ run: false })
	expect(parseArguments(
		['--no-commit'],
		{ run: true },
		{ aliases: { noCommit: '!run' } }
	)).toMatchObject({ run: false })
})

it('throws when an unknown argument is provided', () => {
	expect(() => parseArguments(
		['-u'],
		{ dryRun: false }
	)).toThrow('Unexpected an unknown argument: -u')
	expect(() => parseArguments(
		['-u=file'],
		{ dryRun: false }
	)).toThrow('Unexpected an unknown argument: -u=file')
	expect(() => parseArguments(
		['-un=file'],
		{ dryRun: false }
	)).toThrow('Unexpected an unknown argument: -un=file')
})

it('throws when non-boolean short-hand arguments are provided', () => {
	expect(() => parseArguments(
		['-o'],
		{ o: '' }
	)).toThrow('Unexpected the short-hand argument -o which is a non-Boolean')
})

it('does not throw when only one exclusive field is provided', () => {
	const defaults = { dryRun: false, confirmed: true }

	expect(() => parseArguments(
		['--dryRun'],
		defaults,
		{ exclusives: [['dryRun', 'confirmed']] }
	)).not.toThrow()
})

it('throws when one or more exclusive fields co-exist', () => {
	const defaults = { dryRun: false, confirmed: true }

	expect(() => parseArguments(
		['--dryRun', '--confirmed'],
		defaults,
		{ exclusives: [['dryRun', 'confirmed']] }
	)).toThrow('Unexpected mutual exclusive arguments: --dryRun --confirmed')
})

describe('Boolean', () => {
	it('returns true, given no value', () => {
		const defaults = { dryRun: false }

		expect(parseArguments(
			['--dry-run'],
			defaults
		)).toMatchObject({ dryRun: true })
	})

	it('returns false, given a false-like string', () => {
		const defaults = { dryRun: true }

		expect(parseArguments(
			['--dry-run=false'],
			defaults
		)).toMatchObject({ dryRun: false })
	})

	it('returns true, otherwise', () => {
		const defaults = { dryRun: false }

		expect(parseArguments(
			['--dry-run=1'],
			defaults
		)).toMatchObject({ dryRun: true })

	})

	it('returns the inverse, given a "no" name prefix', () => {
		const defaults = { dryRun: false }

		expect(parseArguments(
			['--no-dry-run'],
			defaults
		)).toMatchObject({ dryRun: false })
		expect(parseArguments(
			['--no-dry-run=false'],
			defaults
		)).toMatchObject({ dryRun: true })
	})

	it('returns the inverse, given a no-prefix default', () => {
		const defaults = { noDryRun: false }

		expect(parseArguments(
			['--dry-run'],
			defaults
		)).toMatchObject({ noDryRun: false })
		expect(parseArguments(
			['--dry-run=false'],
			defaults
		)).toMatchObject({ noDryRun: true })
		expect(parseArguments(
			['--no-dry-run'],
			defaults
		)).toMatchObject({ noDryRun: true })
		expect(parseArguments(
			['--no-dry-run=false'],
			defaults
		)).toMatchObject({ noDryRun: false })
	})

	it('returns the latest value, given multiple values with the same name', () => {
		const defaults = { dryRun: false }

		expect(parseArguments(
			['--dry-run=true', '--dry-run=false'],
			defaults
		)).toMatchObject({ dryRun: false })
		expect(parseArguments(
			['--dry-run=true', '--dry-run=false', '--dry-run=true'],
			defaults
		)).toMatchObject({ dryRun: true })
	})
})

describe('Number', () => {
	it('returns the given number', () => {
		const defaults = { count: 0 }

		expect(parseArguments(
			['--count=1'],
			defaults
		)).toMatchObject({ count: 1 })
		expect(parseArguments(
			['--count=1.999'],
			defaults
		)).toMatchObject({ count: 1.999 })
	})

	it('returns not-a-number, given no value or a non-number value', () => {
		const defaults = { count: 0 }

		expect(parseArguments(
			['--count=a'],
			defaults
		)).toMatchObject({ count: NaN })
		expect(parseArguments(
			['--count'],
			defaults
		)).toMatchObject({ count: NaN })
	})

	it('returns the default value, given no-prefix value', () => {
		const defaults = { count: 0 }

		expect(parseArguments(
			['--count=1', '--no-count'],
			defaults
		)).toMatchObject({ count: 0 })
	})

	it('throws, given no-prefix value with a value', () => {
		const defaults = { count: 0 }

		expect(() => parseArguments(
			['--no-count=1'],
			defaults
		)).toThrow('Expected --no-count=1 to supply a numeric value.')
	})
})

describe('String', () => {
	it('returns the given string', () => {
		const defaults = { input: 'n/a' }

		expect(parseArguments(
			['--input=dream comes true'],
			defaults
		)).toMatchObject({ input: 'dream comes true' })
		expect(parseArguments(
			['--input='],
			defaults
		)).toMatchObject({ input: '' })
	})

	it('returns an empty string, given no-prefix value with a matching value', () => {
		const defaults = { input: 'n/a' }

		expect(parseArguments(
			['--no-input'],
			defaults
		)).toMatchObject({ input: '' })
		expect(parseArguments(
			['--no-input=n/a'],
			defaults
		)).toMatchObject({ input: '' })
		expect(parseArguments(
			['--no-input=xxx'],
			defaults
		)).toMatchObject({ input: 'n/a' })
	})

	it('throws, given no value', () => {
		const defaults = { input: 'n/a' }

		expect(() => parseArguments(
			['--input'],
			defaults
		)).toThrow('Expected --input to supply a string value.')
	})
})

describe('Array<String>', () => {
	it('returns the given unique items cumulatively', () => {
		const defaults = { input: [] }

		expect(parseArguments(
			['--input=dream'],
			defaults
		)).toMatchObject({ input: ['dream'] })
		expect(parseArguments(
			['--input=dream', '--input=comes'],
			defaults
		)).toMatchObject({ input: ['dream', 'comes'] })
	})

	it('does not return duplicate items', () => {
		const defaults = { input: [] }

		expect(parseArguments(
			['--input=dream', '--input=comes', '--input=dream'],
			defaults
		)).toMatchObject({ input: ['comes', 'dream'] })
	})

	it('returns an empty list, given no-prefix value without a value', () => {
		const defaults = { input: ['dream'] }

		expect(parseArguments(
			['--no-input'],
			defaults
		)).toMatchObject({ input: [] })
	})

	it('does not return the matching items, given a no-prefix value', () => {
		const defaults = { input: ['dream'] }

		expect(parseArguments(
			['--no-input=dream'],
			defaults
		)).toMatchObject({ input: [] })
		expect(parseArguments(
			['--input=comes', '--no-input=comes'],
			defaults
		)).toMatchObject({ input: ['dream'] })
	})

	it('throws, given no value', () => {
		const defaults = { input: [] }

		expect(() => parseArguments(
			['--input'],
			defaults
		)).toThrow('Expected --input to supply a value.')
	})
})

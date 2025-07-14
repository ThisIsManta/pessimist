import { describe, it, expect } from 'vitest'
import { parseArguments } from './parseArguments'

it('returns the defaults, given no inputs', () => {
	const defaults = { dryRun: false }

	expect(parseArguments([], defaults))
		.toEqual({
			...defaults,
			length: 0,
		})
})

it('returns the named arguments and the positional arguments', () => {
	const { dryRun, debug, ...positionalArguments } = parseArguments(
		['data.yml', '--dry-run', 'data.json'],
		{ dryRun: false, debug: false }
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
	expect(parseArguments(
		['-'],
		{}
	)).toStrictEqual({ length: 0 })
	expect(parseArguments(
		['--'],
		{}
	)).toStrictEqual({ length: 0 })
	expect(parseArguments(
		['---'],
		{}
	)).toStrictEqual({ length: 0 })
})

it('throws when the field does not exist in the defaults', () => {
	expect(() => parseArguments(
		['--dry-run'],
		{}
	)).toThrow('Unexpected an unknown argument: --dry-run')
})

it('throws, given an unknown argument', () => {
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

it('does not throw, given only one exclusive argument', () => {
	expect(() => parseArguments(
		['--dryRun'],
		{ dryRun: false, confirmed: true },
		{ exclusives: [['dryRun', 'confirmed']] }
	)).not.toThrow()
})

it('throws, given more than one exclusive arguments', () => {
	expect(() => parseArguments(
		['--dryRun', '--confirmed'],
		{ dryRun: false, confirmed: true },
		{ exclusives: [['dryRun', 'confirmed']] }
	)).toThrow('Unexpected mutual exclusive arguments: --dryRun --confirmed')
})

describe('Boolean', () => {
	it('returns true, given no value', () => {
		expect(parseArguments(
			['--dry-run'],
			{ dryRun: false }
		)).toMatchObject({ dryRun: true })
	})

	it('returns false, given a false-like string', () => {
		expect(parseArguments(
			['--dry-run=false'],
			{ dryRun: true }
		)).toMatchObject({ dryRun: false })
	})

	it('returns true, otherwise', () => {
		expect(parseArguments(
			['--dry-run=1'],
			{ dryRun: false }
		)).toMatchObject({ dryRun: true })
	})

	it('returns the opposite, given "no" name prefix', () => {
		expect(parseArguments(
			['--no-dry-run'],
			{ dryRun: false }
		)).toMatchObject({ dryRun: false })
		expect(parseArguments(
			['--no-dry-run=false'],
			{ dryRun: false }
		)).toMatchObject({ dryRun: true })
		expect(parseArguments(
			['--dry-run'],
			{ noDryRun: true }
		)).toMatchObject({ noDryRun: false })
		expect(parseArguments(
			['--dry-run=false'],
			{ noDryRun: false }
		)).toMatchObject({ noDryRun: true })
		expect(parseArguments(
			['--no-dry-run'],
			{ noDryRun: false }
		)).toMatchObject({ noDryRun: true })
		expect(parseArguments(
			['--no-dry-run=false'],
			{ noDryRun: true }
		)).toMatchObject({ noDryRun: false })
	})

	it('returns the opposite, given "!" in the alias', () => {
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

	it('returns the rightmost value, given multiple arguments with the same name', () => {
		const defaults = { dryRun: false }

		expect(parseArguments(
			['--dry-run=true', '--dry-run=false'],
			defaults
		)).toMatchObject({ dryRun: false })
		expect(parseArguments(
			['--dry-run=true', '--dry-run=false', '--dry-run=true'],
			defaults
		)).toMatchObject({ dryRun: true })
		expect(parseArguments(
			['-d', '--dryRun=false'],
			defaults,
			{ aliases: { d: 'dryRun' } }
		)).toMatchObject({ dryRun: false })
		expect(parseArguments(
			['--dryRun=false', '-d'],
			defaults,
			{ aliases: { d: 'dryRun' } }
		)).toMatchObject({ dryRun: true })
	})

	it('returns the value, given a single-letter short-hand argument', () => {
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
	})

	it('returns multiple values, given a merged single-letter short-hand argument', () => {
		expect(parseArguments(
			['-vf'],
			{ v: false, f: false },
		)).toMatchObject({ v: true, f: true })
		expect(parseArguments(
			['-vf'],
			{ verbose: false, force: false },
			{ aliases: { v: 'verbose', f: 'force' } }
		)).toMatchObject({ verbose: true, force: true })
		expect(parseArguments(
			['-vf'],
			{ verbose: false, f: false },
			{ aliases: { v: 'verbose' } }
		)).toMatchObject({ verbose: true, f: true })
	})

	it('throws, given a non-Boolean short-hand argument', () => {
		expect(() => parseArguments(
			['-o'],
			{ o: '' }
		)).toThrow('Unexpected the short-hand argument -o which is a non-Boolean')
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

	it('returns the default value, given "no" name prefix', () => {
		expect(parseArguments(
			['--count=1', '--no-count'],
			{ count: 0 }
		)).toMatchObject({ count: 0 })
	})

	it('throws, given "no" name prefix with a value', () => {
		expect(() => parseArguments(
			['--no-count=1'],
			{ count: 0 }
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

	it('returns an empty string, given "no" name prefix with a matching value', () => {
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
		expect(parseArguments(
			['--input=dream', '--input=comes', '--input=dream'],
			{ input: [] }
		)).toMatchObject({ input: ['comes', 'dream'] })
	})

	it('returns an empty list, given "no" name prefix without a value', () => {
		expect(parseArguments(
			['--no-input'],
			{ input: ['dream'] }
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
		expect(() => parseArguments(
			['--input'],
			{ input: [] }
		)).toThrow('Expected --input to supply a value.')
	})
})

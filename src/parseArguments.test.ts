import parseArguments from './parseArguments'

it('returns the defaults, given no inputs', () => {
	const defaults = { dryRun: Boolean(false) }

	expect(parseArguments([], defaults))
		.toEqual({
			...defaults,
			length: 0,
		})
})

it('returns the specified flags among the defaults and the argument list', () => {
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

it('throws when the value name does not exist in the defaults', () => {
	const defaults = {}

	expect(() => parseArguments(['--dry-run'], defaults)).toThrow('Expected only known options but got "--dry-run"')
})

describe('Boolean', () => {
	it('returns true, given no value', () => {
		const defaults = { dryRun: Boolean(false) }

		expect(parseArguments(['--dry-run'], defaults))
			.toMatchObject({ dryRun: true })
	})

	it('returns false, given a false-like string', () => {
		const defaults = { dryRun: Boolean(true) }

		expect(parseArguments(['--dry-run=false'], defaults))
			.toMatchObject({ dryRun: false })
		expect(parseArguments(['--dry-run=False'], defaults))
			.toMatchObject({ dryRun: false })
		expect(parseArguments(['--dry-run=FALSE'], defaults))
			.toMatchObject({ dryRun: false })
		expect(parseArguments(['--dry-run=0'], defaults))
			.toMatchObject({ dryRun: false })
		expect(parseArguments(['--dry-run=n'], defaults))
			.toMatchObject({ dryRun: false })
		expect(parseArguments(['--dry-run=no'], defaults))
			.toMatchObject({ dryRun: false })
		expect(parseArguments(['--dry-run=off'], defaults))
			.toMatchObject({ dryRun: false })
	})

	it('returns true, otherwise', () => {
		const defaults = { dryRun: Boolean(false) }

		expect(parseArguments(['--dry-run=true'], defaults))
			.toMatchObject({ dryRun: true })
		expect(parseArguments(['--dry-run=True'], defaults))
			.toMatchObject({ dryRun: true })
		expect(parseArguments(['--dry-run=TRUE'], defaults))
			.toMatchObject({ dryRun: true })
		expect(parseArguments(['--dry-run=1'], defaults))
			.toMatchObject({ dryRun: true })
		expect(parseArguments(['--dry-run=y'], defaults))
			.toMatchObject({ dryRun: true })
		expect(parseArguments(['--dry-run=yes'], defaults))
			.toMatchObject({ dryRun: true })
		expect(parseArguments(['--dry-run=on'], defaults))
			.toMatchObject({ dryRun: true })
		expect(parseArguments(['--dry-run=xxx'], defaults))
			.toMatchObject({ dryRun: true })
	})

	it('returns the inverse, given a no-prefix value', () => {
		const defaults = { dryRun: Boolean(false) }

		expect(parseArguments(['--no-dry-run'], defaults))
			.toMatchObject({ dryRun: false })
		expect(parseArguments(['--no-dry-run=false'], defaults))
			.toMatchObject({ dryRun: true })
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
			.toThrow('Expected "--no-count=1" to have no values.')
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

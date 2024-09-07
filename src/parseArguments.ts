import camelCase from 'lodash/camelCase'
import words from 'lodash/words'
import { parseBoolean } from './parseBoolean'

export type Hash = { [field: string]: boolean | number | string | Array<string> }

type NamedInput = {
	field: string,
	negated: boolean,
	value: string | undefined,
	input: string
}

export function parseArguments<T extends Hash>(
	inputs: Array<string>,
	defaultHash: Readonly<T>,
	options?: Partial<{
		aliases: Array<[string, keyof T]>,
		exclusives: Array<Array<keyof T>>,
	}>
): T & ArrayLike<string> {
	const [positionalArguments, namedArguments] = inputs
		.filter(input => /^-+$/.test(input) === false)
		.reduce(([positionalArguments, namedArguments]: [Array<string>, Array<NamedInput>], input) => {
			if (/^--?\w/.test(input)) {
				const delimiterIndex = input.indexOf('=')

				const actualName = delimiterIndex === -1 ? input : input.substring(0, delimiterIndex)
				const { formalName, negated } = getFormalName(actualName, defaultHash)
				const alias = options?.aliases?.find(([aliasName]) => aliasName === formalName)?.[1]?.toString()

				const value = delimiterIndex === -1 ? undefined : input.substring(delimiterIndex + 1)

				namedArguments.push({
					field: alias || formalName,
					negated,
					value,
					input,
				})

			} else {
				positionalArguments.push(input)
			}

			return [positionalArguments, namedArguments]
		}, [[], []])

	const outputHash = Object.assign({}, defaultHash) as any
	for (const { field, negated, value, input } of namedArguments) {
		const defaultValue = defaultHash[field]

		if (defaultValue === undefined) {
			throw new Error(`Unexpected "${input}" as it was not defined in the default hash.`)
		}

		if (typeof defaultValue === 'boolean') {
			const derivedValue = value === undefined ? true : parseBoolean(value)

			outputHash[field] = negated ? !derivedValue : derivedValue

		} else if (typeof defaultValue === 'number') {
			if (negated) {
				if (value) {
					throw new Error(`Unexpected "${input}" to have a value.`)

				} else {
					outputHash[field] = defaultHash[field]
				}

			} else {
				outputHash[field] = value === undefined ? NaN : parseFloat(value)
			}

		} else if (typeof defaultValue === 'string') {
			if (negated) {
				if (value === undefined || outputHash[field] === value) {
					outputHash[field] = ''
				}

			} else if (value === undefined) {
				throw new Error(`Expected "${input}" to have a value.`)

			} else {
				outputHash[field] = value
			}

		} else if (Array.isArray(defaultValue)) {
			if (negated) {
				if (value === undefined) {
					outputHash[field] = []

				} else {
					outputHash[field] = difference(outputHash[field], [value])
				}

			} else {
				if (value === undefined) {
					throw new Error(`Expected "${input}" to have a value.`)
				}

				if ((outputHash[field] as Array<string>).includes(value)) {
					outputHash[field] = difference(outputHash[field], [value])
				}

				outputHash[field] = [...outputHash[field], value]
			}
		}
	}

	if (options?.exclusives) {
		const fields = Array.from(new Set(namedArguments.map(({ field }) => field)))
		const fieldInputMap = Object.fromEntries(namedArguments.map(({ field, input }) => [field, input]))

		for (const group of options.exclusives) {
			const intersections = intersect(group as Array<string>, fields)
			if (intersections.length > 1) {
				throw new Error('Unexpected ' + intersections.map(field => '"' + fieldInputMap[field] + '"').join(' and ') + ' to exist at the same time as they are mutually exclusive.')
			}
		}
	}

	return Object.assign(outputHash, positionalArguments, { length: positionalArguments.length })
}

function getFormalName(possiblyDirtyName: string, defaults: object): { formalName: string, negated: boolean } {
	const wordList = words(possiblyDirtyName)
	const formalName = camelCase(possiblyDirtyName)

	if (wordList[0] === 'no' && !(formalName in defaults)) {
		return {
			formalName: camelCase(wordList.slice(1).join('-')),
			negated: true
		}
	}

	if (wordList[0] !== 'no' && camelCase('no-' + possiblyDirtyName) in defaults) {
		return {
			formalName: camelCase('no-' + possiblyDirtyName),
			negated: true
		}
	}

	return {
		formalName,
		negated: false
	}
}

function difference<T>(sourceList: Array<T>, subtractorList: Array<T>) {
	return sourceList.filter(item => !subtractorList.includes(item))
}

function intersect<T>(sourceList: Array<T>, comparingList: Array<T>) {
	return sourceList.filter(item => comparingList.includes(item))
}

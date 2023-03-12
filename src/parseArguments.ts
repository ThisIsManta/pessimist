import camelCase from 'lodash/camelCase'
import words from 'lodash/words'

export type Hash = { [field: string]: boolean | number | string | Array<string> }

type ParsedInput = string | {
	field: string,
	negated: boolean,
	value: string | undefined,
	input: string
}

export default function parseArguments<T extends Hash>(
	inputs: Array<string>,
	defaultHash: Readonly<T>,
	options?: {
		aliases: Array<[string, keyof T]>,
	}
): T & ArrayLike<string> {
	const outputHash = Object.assign({}, defaultHash) as any
	const outputList: Array<string> = []

	const parsedInputs = inputs
		.filter(input => /^-+$/.test(input) === false)
		.map((input): ParsedInput => {
			if (/^--?\w/.test(input)) {
				const delimiterIndex = input.indexOf('=')

				const actualName = delimiterIndex === -1 ? input : input.substring(0, delimiterIndex)
				const { formalName, negated } = getFormalName(actualName, defaultHash)
				const alias = options?.aliases?.find(([aliasName]) => aliasName === formalName)?.[1]?.toString()

				const value = delimiterIndex === -1 ? undefined : input.substring(delimiterIndex + 1)

				return {
					field: alias || formalName,
					negated,
					value,
					input,
				}
			}

			return input
		})

	for (const input of parsedInputs) {
		if (typeof input === 'string') {
			outputList.push(input)
			continue
		}

		const { field, negated, value } = input
		const defaultValue = defaultHash[field]

		if (defaultValue === undefined) {
			throw new Error(`Expected only known hash but got "${input.input}"`)
		}

		if (typeof defaultValue === 'boolean') {
			const derivedValue = ((): boolean => {
				if (value === undefined) return true
				if (value === '') return false
				if (/^(false|0|n|no|off)$/i.test(value.trim())) return false
				return true
			})()

			outputHash[field] = negated ? !derivedValue : derivedValue

		} else if (typeof defaultValue === 'number') {
			if (negated) {
				if (value) {
					throw new Error(`Expected "${input.input}" to have no values.`)

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
				throw new Error(`Expected "${input.input}" to have a value.`)

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
					throw new Error(`Expected "${input.input}" to have a value.`)
				}

				if ((outputHash[field] as Array<string>).includes(value)) {
					outputHash[field] = difference(outputHash[field], [value])
				}

				outputHash[field] = [...outputHash[field], value]
			}
		}
	}

	return Object.assign(outputHash, outputList, { length: outputList.length })
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

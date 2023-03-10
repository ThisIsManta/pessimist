import camelCase from 'lodash/camelCase'
import words from 'lodash/words'

export default function parseArguments<T extends { [name: string]: boolean | number | string | Array<string> }>(
	inputs: Array<string>,
	defaults: T
): T & ArrayLike<string> {
	const outputFlags = Object.assign({}, defaults) as any
	const outputArguments: Array<string> = []

	for (const input of inputs) {
		if (input === '--') {
			continue
		}

		if (input.startsWith('-')) {
			const delimiterIndex = input.indexOf('=')
			const actualName = delimiterIndex === -1 ? input : input.substring(0, delimiterIndex)
			const actualValue = delimiterIndex === -1 ? undefined : input.substring(delimiterIndex + 1)

			const { formalName, negated } = getFormalName(actualName, defaults)

			const defaultValue = defaults[formalName]
			if (defaultValue === undefined) {
				throw new Error(`Expected only known options but got "${input}"`)

			} else if (typeof defaultValue === 'boolean') {
				const derivedValue = ((): boolean => {
					if (actualValue === undefined) return true
					if (actualValue === '') return false
					if (/^(false|0|n|no|off)$/i.test(actualValue.trim())) return false
					return true
				})()

				outputFlags[formalName] = negated ? !derivedValue : derivedValue

			} else if (typeof defaultValue === 'number') {
				if (negated) {
					if (actualValue) {
						throw new Error(`Expected "${input}" to have no values.`)

					} else {
						outputFlags[formalName] = defaults[formalName]
					}

				} else {
					outputFlags[formalName] = actualValue === undefined ? NaN : parseFloat(actualValue)
				}

			} else if (typeof defaultValue === 'string') {
				if (negated) {
					if (actualValue === undefined || outputFlags[formalName] === actualValue) {
						outputFlags[formalName] = ''
					}

				} else if (actualValue === undefined) {
					throw new Error(`Expected "${input}" to have a value.`)

				} else {
					outputFlags[formalName] = actualValue
				}

			} else if (Array.isArray(defaultValue)) {
				if (negated) {
					if (actualValue === undefined) {
						outputFlags[formalName] = []

					} else {
						outputFlags[formalName] = difference(outputFlags[formalName], [actualValue])
					}

				} else {
					if (actualValue === undefined) {
						throw new Error(`Expected "${input}" to have a value.`)
					}

					if ((outputFlags[formalName] as Array<string>).includes(actualValue)) {
						outputFlags[formalName] = difference(outputFlags[formalName], [actualValue])
					}

					outputFlags[formalName] = [...outputFlags[formalName], actualValue]
				}
			}

		} else {
			outputArguments.push(input)
		}
	}

	return Object.assign(outputFlags, outputArguments, { length: outputArguments.length })
}

function getFormalName(possiblyDirtyName: string, defaults: Record<string, any>): { formalName: string, negated: boolean } {
	const wordList = words(possiblyDirtyName)
	const formalName = camelCase(possiblyDirtyName)

	if (wordList[0] === 'no' && defaults[formalName] === undefined) {
		return {
			formalName: camelCase(wordList.slice(1).join('-')),
			negated: true
		}
	}

	if (wordList[0] !== 'no' && defaults[camelCase('no-' + possiblyDirtyName)] !== undefined) {
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

import camelCase from 'lodash/camelCase'
import words from 'lodash/words'
import difference from 'lodash/difference'

export function parseArguments<T extends { [name: string]: boolean | number | string | Array<string> }>(
	inputs: Array<string>,
	defaults: T
): T & ArrayLike<string> {
	const outputFlags = { ...defaults } as any
	const outputArguments: Array<string> = []

	for (const input of inputs) {
		if (input.startsWith('-')) {
			const delimiterIndex = input.indexOf('=')
			const { name, negated } = getFormalName(delimiterIndex === -1 ? input : input.substring(0, delimiterIndex), defaults)

			const text = delimiterIndex === -1 ? undefined : input.substring(delimiterIndex + 1)

			const defaultValue = defaults[name]
			if (defaultValue === undefined) {
				throw new Error(`Expected only known options but got "${input}"`)

			} else if (typeof defaultValue === 'boolean') {
				const value = ((): boolean => {
					if (text === undefined) return true
					if (text === '') return false
					if (/^(false|0|n|no|off)$/i.test(text.trim())) return false
					return true
				})()

				outputFlags[name] = negated ? !value : value

			} else if (typeof defaultValue === 'number') {
				if (negated) {
					if (text) {
						throw new Error(`Expected "${input}" to have no values.`)

					} else {
						outputFlags[name] = defaults[name]
					}

				} else {
					outputFlags[name] = text === undefined ? NaN : parseFloat(text)
				}

			} else if (typeof defaultValue === 'string') {
				if (negated) {
					if (text === undefined || outputFlags[name] === text) {
						outputFlags[name] = ''
					}

				} else if (text === undefined) {
					throw new Error(`Expected "${input}" to have a value.`)

				} else {
					outputFlags[name] = text
				}

			} else if (Array.isArray(defaultValue)) {
				if (negated) {
					if (text === undefined) {
						outputFlags[name] = []

					} else {
						outputFlags[name] = difference(outputFlags[name] as Array<string>, [text])
					}

				} else {
					if (text === undefined) {
						throw new Error(`Expected "${input}" to have a value.`)
					}

					if ((outputFlags[name] as Array<string>).includes(text)) {
						outputFlags[name] = difference(outputFlags[name] as Array<string>, [text])
					}

					outputFlags[name] = [...outputFlags[name], text]
				}
			}

		} else {
			outputArguments.push(input)
		}
	}

	return Object.freeze(Object.assign(outputFlags, outputArguments, { length: outputArguments.length }))
}

function getFormalName(possiblyDirtyName: string, defaults: Record<string, any>): { name: string, negated: boolean } {
	const name = camelCase(possiblyDirtyName)
	const firstWord = words(name)[0]

	if (firstWord === 'no' && defaults[name] === undefined) {
		return {
			name: camelCase(name.replace(/^no/, '')),
			negated: true
		}
	}

	if (firstWord !== 'no' && defaults[camelCase('no-' + possiblyDirtyName)] !== undefined) {
		return {
			name: camelCase('no-' + possiblyDirtyName),
			negated: true
		}
	}

	return {
		name,
		negated: false
	}
}

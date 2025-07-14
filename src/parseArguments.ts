import kebabCase from 'lodash/kebabCase'
import { parseBoolean } from './parseBoolean'

export type Hash = { [field: string]: boolean | number | string | Array<string> }

export function parseArguments<
	K extends string & keyof T,
	T = Record<string, boolean | number | string | Array<string>>,
>(
	inputs: Array<string>,
	defaultHash: Readonly<T>,
	options?: Partial<{
		aliases: Record<string, K | `!${K}`>,
		exclusives: Array<Array<K>>,
	}>
): T & ArrayLike<string> {
	const kebabNameToFormalName: Record<string, string> = {}
	for (const name in defaultHash) {
		if (name.length === 1) {
			kebabNameToFormalName['-' + name] = name

		} else {
			const kebabName = kebabCase(name)
			kebabNameToFormalName['--' + kebabName] = name
			if (kebabName.startsWith('no-')) {
				kebabNameToFormalName['--' + kebabName.substring(3)] = '!' + name

			} else {
				kebabNameToFormalName['--no-' + kebabName] = '!' + name
			}
		}
	}
	if (typeof options?.aliases === 'object' && options.aliases !== null) {
		for (const name in options.aliases) {
			if (name.length === 1) {
				kebabNameToFormalName['-' + name] ??= options.aliases[name]

			} else {
				const kebabName = kebabCase(name)
				kebabNameToFormalName['--' + kebabName] ??= options.aliases[name]
				if (kebabName.startsWith('no-')) {
					kebabNameToFormalName['--' + kebabName.substring(3)] ??= '!' + options.aliases[name]

				} else {
					kebabNameToFormalName['--no-' + kebabName] ??= '!' + options.aliases[name]
				}
			}
		}
	}

	type NamedInput = {
		raw: string
		formalName: K
		negated: boolean
		value: string | undefined
	}

	const [positionalArguments, namedArguments] = inputs
		.filter(input => /^-+$/.test(input) === false)
		.reduce(([positionalArguments, namedArguments]: [Array<string>, Array<NamedInput>], raw) => {
			if (raw.startsWith('--')) {
				const delimiterIndex = raw.indexOf('=')
				const actualName = delimiterIndex === -1 ? raw : raw.substring(0, delimiterIndex)
				const value = delimiterIndex === -1 ? undefined : raw.substring(delimiterIndex + 1)

				const kebabName = '--' + kebabCase(actualName)
				if (kebabName in kebabNameToFormalName === false) {
					throw new Error(`Unexpected an unknown argument: ${raw}`)
				}

				const formalName = kebabNameToFormalName[kebabName].replace(/^\!*/, '') as K
				const negated = normalizeNegation(kebabNameToFormalName[kebabName]).startsWith('!')

				namedArguments.push({
					raw,
					formalName,
					negated,
					value,
				})

			} else if (raw.startsWith('-')) {
				const delimiterIndex = raw.indexOf('=')
				if (delimiterIndex === -1) {
					for (const name of raw.substring(1).split('')) {
						const kebabName = '-' + name
						if (kebabName in kebabNameToFormalName === false) {
							throw new Error(`Unexpected an unknown argument: ${raw}`)
						}

						const formalName = kebabNameToFormalName[kebabName].replace(/^\!*/, '') as K
						if (typeof defaultHash[formalName] !== 'boolean') {
							throw new Error(`Unexpected the short-hand argument ${raw} which is a non-Boolean`)
						}

						const negated = normalizeNegation(kebabNameToFormalName[kebabName]).startsWith('!')

						namedArguments.push({
							raw,
							formalName,
							negated,
							value: undefined,
						})
					}

				} else if (delimiterIndex === 2) {
					const actualName = raw.substring(0, delimiterIndex)
					if (actualName in kebabNameToFormalName === false) {
						throw new Error(`Unexpected an unknown argument: ${raw}`)
					}

					const formalName = kebabNameToFormalName[actualName].replace(/^\!*/, '') as K
					const negated = normalizeNegation(kebabNameToFormalName[actualName]).startsWith('!')
					const value = raw.substring(delimiterIndex + 1)

					namedArguments.push({
						raw,
						formalName,
						negated,
						value,
					})

				} else {
					throw new Error(`Unexpected an unknown argument: ${raw}`)
				}

			} else {
				positionalArguments.push(raw)
			}

			return [positionalArguments, namedArguments]
		}, [[], []])

	const outputHash = Object.assign({}, defaultHash) as any
	for (const { raw, formalName, negated, value, } of namedArguments) {
		const defaultValue = defaultHash[formalName]
		if (typeof defaultValue === 'boolean') {
			const parsedValue = parseBoolean(value, true)
			outputHash[formalName] = negated ? !parsedValue : parsedValue

		} else if (typeof defaultValue === 'number') {
			if (negated) {
				if (value) {
					throw new Error(`Expected ${raw} to supply a numeric value.`)

				} else {
					outputHash[formalName] = defaultHash[formalName]
				}

			} else {
				outputHash[formalName] = value === undefined ? NaN : parseFloat(value)
			}

		} else if (typeof defaultValue === 'string') {
			if (negated) {
				if (value === undefined || outputHash[formalName] === value) {
					outputHash[formalName] = ''
				}

			} else if (value === undefined) {
				throw new Error(`Expected ${raw} to supply a string value.`)

			} else {
				outputHash[formalName] = value
			}

		} else if (Array.isArray(defaultValue)) {
			if (negated) {
				if (value === undefined) {
					outputHash[formalName] = []

				} else {
					outputHash[formalName] = difference(outputHash[formalName], [value])
				}

			} else {
				if (value === undefined) {
					throw new Error(`Expected ${raw} to supply a value.`)
				}

				if (outputHash[formalName].includes(value)) {
					outputHash[formalName] = difference(outputHash[formalName], [value])
				}

				outputHash[formalName] = [...outputHash[formalName], value]
			}
		}
	}

	if (options?.exclusives) {
		const inputFormalNames = Array.from(new Set(namedArguments.map(({ formalName }) => formalName)))
		const formalNameToRaw = Object.fromEntries(namedArguments.map(({ formalName, raw }) => [formalName, raw]))

		for (const group of options.exclusives) {
			const intersections = intersect(group, inputFormalNames)
			if (intersections.length > 1) {
				throw new Error('Unexpected mutual exclusive arguments: ' + intersections.map(field => formalNameToRaw[field]).join(' '))
			}
		}
	}

	return Object.assign(
		outputHash,
		positionalArguments,
		{ length: positionalArguments.length }
	)
}

function normalizeNegation(text: string) {
	const count = (text.match(/^\!+/)?.[0] ?? '').length
	if (count % 2 === 0) {
		return text.substring(count)
	} else {
		return text.substring(count - 1)
	}
}

function difference<T>(sourceList: Array<T>, subtractorList: Array<T>) {
	return sourceList.filter(item => !subtractorList.includes(item))
}

function intersect<T>(sourceList: Array<T>, comparingList: Array<T>) {
	return sourceList.filter(item => comparingList.includes(item))
}

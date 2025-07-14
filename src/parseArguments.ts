import kebabCase from 'lodash/kebabCase'
import { parseBoolean } from './parseBoolean'

export type Hash = { [field: string]: boolean | number | string | Array<string> }

export function parseArguments<
	K extends string & keyof T,
	T = { [key: string]: boolean | number | string | Array<string> },
>(
	inputs: Array<string>,
	defaultHash: Readonly<T>,
	options?: Partial<{
		aliases: Record<string, K | `!${K}`>,
		exclusives: Array<Array<K>>,
	}>
): T & ArrayLike<string> {
	const logicHash: Record<string, { formalName: K, negated: boolean }> = {}
	for (const name in defaultHash) {
		const formalName = name as string as K

		if (name.length === 1 && name !== '-') {
			logicHash['-' + name] = { formalName, negated: false }

		} else {
			const kebabName = kebabCase(name)

			logicHash['--' + kebabName] = { formalName, negated: false }

			if (kebabName.startsWith('no-')) {
				logicHash['--' + kebabName.substring(3)] = { formalName, negated: true }

			} else {
				logicHash['--no-' + kebabName] = { formalName, negated: true }
			}
		}
	}
	if (typeof options?.aliases === 'object' && options.aliases !== null) {
		for (const aliasName in options.aliases) {
			const targetName = options.aliases[aliasName]
			if (typeof targetName !== 'string') {
				throw new Error(`Expected the right-hand side of the alias to be a string: ${aliasName} → ${targetName}`)
			}

			const negationOperatorCount = targetName.match(/^\!+/)?.[0].length ?? 0
			const formalName = targetName.substring(negationOperatorCount)
			const negated = negationOperatorCount % 2 === 1

			if (!isKnownName(formalName)) {
				throw new Error(`Expected the right-hand side of the alias to be one of the known names: ${aliasName} → ${targetName}`)
			}

			if (aliasName.length === 1 && aliasName !== '-') {
				logicHash['-' + aliasName] ??= { formalName, negated }

			} else {
				const kebabName = kebabCase(aliasName)

				logicHash['--' + kebabName] ??= { formalName, negated }

				if (kebabName.startsWith('no-')) {
					logicHash['--' + kebabName.substring(3)] ??= { formalName, negated: !negated }

				} else {
					logicHash['--no-' + kebabName] ??= { formalName, negated: !negated }
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
				if (kebabName in logicHash === false) {
					throw new Error(`Unexpected an unknown argument: ${raw}`)
				}

				const { formalName, negated } = logicHash[kebabName]

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
						if (kebabName in logicHash === false) {
							throw new Error(`Unexpected an unknown argument: ${raw}`)
						}

						const { formalName, negated } = logicHash[kebabName]
						if (typeof defaultHash[formalName] !== 'boolean') {
							throw new Error(`Unexpected the short-hand argument ${raw} which is a non-Boolean`)
						}

						namedArguments.push({
							raw,
							formalName,
							negated,
							value: undefined,
						})
					}

				} else if (delimiterIndex === 2) {
					const actualName = raw.substring(0, delimiterIndex)
					if (actualName in logicHash === false) {
						throw new Error(`Unexpected an unknown argument: ${raw}`)
					}

					const { formalName, negated } = logicHash[actualName]
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
		const defaultValue: unknown = defaultHash[formalName]
		if (typeof defaultValue === 'boolean') {
			const parsedValue = parseBoolean(value, true)
			outputHash[formalName] = negated ? !parsedValue : parsedValue

		} else if (typeof defaultValue === 'number') {
			if (negated) {
				if (value) {
					throw new Error(`Unexpected a value when using "no" name prefix: ${raw}`)

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
				throw new Error(`Expected a value: ${raw}`)

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
					throw new Error(`Expected a value: ${raw}`)
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

	function isKnownName(name: string): name is K {
		return name in defaultHash
	}
}

function difference<T>(sourceList: Array<T>, subtractorList: Array<T>) {
	return sourceList.filter(item => !subtractorList.includes(item))
}

function intersect<T>(sourceList: Array<T>, comparingList: Array<T>) {
	return sourceList.filter(item => comparingList.includes(item))
}

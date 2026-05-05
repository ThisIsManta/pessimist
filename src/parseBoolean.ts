const known = Object.fromEntries('false|0|n|no|off'.split('|').map(item => [item, false] as const))

/**
 * Returns a Boolean derived from the given value.
 * @param fallbackValue The value to return if the input is undefined or NaN.
 * @example
 * parseBoolean(undefined) // false
 * parseBoolean(undefined, fallback) // fallback
 * parseBoolean(NaN, fallback) // fallback
 * parseBoolean(null) // false
 * parseBoolean('') // false
 * parseBoolean(0) // false
 * parseBoolean('0') // false
 * parseBoolean('') // false
 * parseBoolean('false') // false
 * parseBoolean('n') // false
 * parseBoolean('no') // false
 * parseBoolean('off') // false
 * parseBoolean('otherwise') // true
 */
export function parseBoolean(value: any, fallbackValue: boolean = false): boolean {
	if (value === undefined) {
		return fallbackValue
	}

	if (value === null || value === '') {
		return false
	}

	if (typeof value === 'boolean') {
		return value
	}

	if (typeof value === 'number') {
		if (isNaN(value)) {
			return fallbackValue
		}

		return value !== 0
	}

	if (typeof value === 'string') {
		return known[value.trim().toLowerCase()] ?? true
	}

	return true
}

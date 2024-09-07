const FalsyExpression = /^(false|0|n|no|off)$/i

export function parseBoolean(value: any, defaultValue: boolean = false): boolean {
	if (value === undefined) {
		return defaultValue
	}

	if (value === null || value === '') {
		return false
	}

	if (typeof value === 'boolean') {
		return value
	}

	if (typeof value === 'number' && isNaN(value)) {
		return false
	}

	if (FalsyExpression.test(String(value).trim())) {
		return false
	}

	return true
}

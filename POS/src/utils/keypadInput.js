/**
 * Append a keypad key to a decimal input buffer.
 *
 * Rules: one decimal point, at most two decimals, no leading zeros and an
 * integer part of at most `maxIntegerDigits`. Returns the new buffer, or
 * `null` when the key is rejected so callers can leave their state untouched.
 *
 * @param {string} current - Current buffer, e.g. "12.5"
 * @param {string} key - "0"-"9" or "."
 * @param {{ maxIntegerDigits?: number, max?: number }} [options]
 * @returns {string|null}
 */
export function appendDecimalKey(
	current,
	key,
	{ maxIntegerDigits = 6, max = Number.POSITIVE_INFINITY } = {},
) {
	const [integer, decimals] = current.split(".")

	if (key === ".") {
		return decimals === undefined ? `${current || "0"}.` : null
	}

	let next
	if (decimals !== undefined) {
		next = (current + key).replace(/(\.\d{2}).*$/, "$1")
	} else {
		next = (integer + key).replace(/^0+(?=\d)/, "")
		if (next.length > maxIntegerDigits) return null
	}

	if (Number.parseFloat(next) > max) return null
	return next
}

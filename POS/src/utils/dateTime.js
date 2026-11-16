const pad = (n) => String(n).padStart(2, "0")

/**
 * Format a Frappe posting date + time for compact lists.
 *
 * "14:30" for today, "09.11.2026 14:30" otherwise.
 *
 * @param {string} date - Frappe date, "YYYY-MM-DD"
 * @param {string} [time] - Frappe time; may lack a leading zero or carry
 *   microseconds, e.g. "9:05:00.123456"
 * @returns {string}
 */
export function formatPostingDateTime(date, time) {
	const [h = "0", m = "0"] = String(time || "").split(":")
	const hhmm = `${pad(h)}:${pad(m)}`

	const [year, month, day] = String(date || "").split("-")
	const now = new Date()
	const isToday =
		Number(year) === now.getFullYear() &&
		Number(month) === now.getMonth() + 1 &&
		Number(day) === now.getDate()

	if (isToday) return hhmm
	return `${day}.${month}.${year} ${hhmm}`
}

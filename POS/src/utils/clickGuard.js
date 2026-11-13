/**
 * Global click guard against hardware "bounce".
 *
 * Some POS touch screens report a single tap as two taps in quick succession.
 * The second phantom tap then hits whatever appeared under the finger
 */

const PRESS_START = ["pointerdown"]
const PRESS_FOLLOW = [
	"mousedown",
	"touchstart",
	"pointerup",
	"mouseup",
	"touchend",
]

// Those ghost taps are usually delayed by around 20-80ms. 100ms should be enough to prevent it
// without slowing down the rest of all itentional fast clicks.
export function installClickGuard({ delay = 100 } = {}) {
	if (typeof window === "undefined") return () => {}

	let lastAcceptedAt = Number.NEGATIVE_INFINITY
	let blockingPress = false

	const swallow = (event) => {
		event.stopImmediatePropagation()
		if (event.cancelable) event.preventDefault()
	}

	const onPressStart = (event) => {
		if (!event.isPrimary) return
		const now = event.timeStamp || performance.now()
		if (now - lastAcceptedAt < delay) {
			blockingPress = true
			swallow(event)
			return
		}
		blockingPress = false
		lastAcceptedAt = now
	}

	const onPressFollow = (event) => {
		if (blockingPress) swallow(event)
	}

	const onClick = (event) => {
		if (event.detail === 0) return
		if (blockingPress) {
			blockingPress = false
			swallow(event)
		}
	}

	const onDblClick = (event) => swallow(event)

	const opts = { capture: true, passive: false }
	PRESS_START.forEach((t) => window.addEventListener(t, onPressStart, opts))
	PRESS_FOLLOW.forEach((t) => window.addEventListener(t, onPressFollow, opts))
	window.addEventListener("click", onClick, opts)
	window.addEventListener("dblclick", onDblClick, opts)

	return () => {
		PRESS_START.forEach((t) =>
			window.removeEventListener(t, onPressStart, opts),
		)
		PRESS_FOLLOW.forEach((t) =>
			window.removeEventListener(t, onPressFollow, opts),
		)
		window.removeEventListener("click", onClick, opts)
		window.removeEventListener("dblclick", onDblClick, opts)
	}
}

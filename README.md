# POSNext for Blaues Kreuz Brockis

This app is a fork of [POSNext](https://github.com/BrainWise-DEV/POSNext).

It provides a simplified POS interface for all Blaues Kreuz Brockis.

## Branches

- `main` is the default branch. All customizations happen here, and pull requests target it.
- `develop` mirrors upstream POSNext and is never committed to directly.

The fork does not follow upstream `develop`. It is its own interface on top of the POSNext API, based on upstream release `v1.16.0`.

## Development Setup

Development runs against [erp-test.blaueskreuz.ch](https://erp-test.blaueskreuz.ch) instead of a local bench. Only the interface is customized, so the test server data is all that is needed. To use a different instance, change the proxy `target` under `server.proxy` in `POS/vite.config.js`.

```bash
git clone git@github.com:blaueskreuz-dev/POSNext.git
cd POSNext

# Install frontend dependencies and start the dev server
cd POS
yarn install
yarn dev
```

Open http://localhost:8080/pos and log in with your erp-test account.

## Customer Display

A second screen that shows customers the current cart. Open it from the account menu ("Customer Display") or directly at `/pos/customer-display`, then move the window to the second monitor.

The POS screen sends the cart to the CustomerDisplay over a [BroadcastChannel](https://developer.mozilla.org/docs/Web/API/BroadcastChannel) named `posnext-customer-display`. Messages stay inside the browser, so both windows must run in the same browser profile on the same machine. No server or network is involved, and it works offline. The CustomerDisplay route skips login and startup data loading, and makes no API calls.

Code: `POS/src/composables/useCustomerDisplay.js` (sending and receiving) and `POS/src/pages/CustomerDisplay.vue` (screen).

### States

| `phase` | Shown | `data` |
|---|---|---|
| `idle` | "Welcome" | `null` |
| `cart` | Item list and totals | See below |

The CustomerDisplay starts in `idle` and only changes when a message arrives. It never asks the POS screen for the current state, so a CustomerDisplay opened mid-sale stays on `idle` until the next cart change.

### Messages

Messages go one way, from the POS screen to the CustomerDisplay. Currently the customerDisplay never requests a state from the POS screen, this leads to some smaller
issues like when a cart session is open and the customer display gets opened then
it will show the idle state until the next event from the POS Screen is sent.

Each message is the full state, not a change, with all values already formatted as text:

```js
{
  phase: "cart",
  data: {
    items: [
      { id: "<row_id>", name: "Haushalt", qty: "1", rate: "CHF 5.00", discount: "", total: "CHF 5.00" },
    ],
    totalQuantity: "1",
    discount: "",
    grandTotal: "CHF 5.00",
  },
}
```

### When messages are sent

| Event | Message |
|---|---|
| Cart changes (item added or removed, quantity, discount, cleared after payment) | Current state, every 500 ms |
| POS screen closed, reloaded or logged out | `{ phase: "idle", data: null }` |

Totals use the same calculation as the POS screen's totals panel (`POS/src/utils/cartTotals.js`), so both screens always show the same numbers.

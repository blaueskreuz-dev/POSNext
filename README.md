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

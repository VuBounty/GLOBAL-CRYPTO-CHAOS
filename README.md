# ⌬ GLOBAL CRYPTO CHAOS

Live, installable PWA that turns multi-venue crypto market activity into a dynamic chaos field.

## Live data layers
- Binance Spot: all-market mini tickers
- Binance Futures: liquidation stream
- Coinbase Exchange: BTC / ETH / SOL live ticker
- Kraken: BTC / ETH / SOL ticker
- OKX: BTC / ETH / SOL ticker
- CoinGecko: global market cap, 24h volume, BTC/ETH dominance

No private wallet connection. No trading. No API key required for this build.

## Important accuracy note
This app visualizes a broad public sample of major global crypto venues. It does **not** literally capture every transaction on every centralized exchange, DEX, blockchain, OTC venue, or private venue worldwide. Nodes are normalized market events, not a claim of complete transaction-level global coverage.

The current `FLOW PRESSURE`, `MARKET PULSE`, `ANOMALY CLUSTERS`, and `SIGNAL` fields are heuristics for visualization, not validated trading signals.

## Local run
```bash
python3 -m http.server 8080
```
Open `http://localhost:8080`.

## GitHub Pages
1. Create a repo, e.g. `GLOBAL-CRYPTO-CHAOS`.
2. Push all files in this folder to branch `main`.
3. GitHub → Settings → Pages → Source → GitHub Actions.
4. The included `.github/workflows/pages.yml` deploys automatically.

## Install on phone
After GitHub Pages is live:
- iPhone: Safari → Share → Add to Home Screen
- Android/Chrome: Install App / Add to Home Screen

## Production roadmap
To move from "broad market telemetry" toward a true global market observatory:
- backend event normalizer
- more CEX venues
- derivatives funding / OI / basis
- DEX swaps and liquidity
- on-chain whale and stablecoin flows
- cross-venue latency and divergence
- persistent historical store
- replay/backtest mode
- validated anomaly scoring

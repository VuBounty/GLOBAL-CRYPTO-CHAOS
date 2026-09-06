# CHAOS AGENT v1.0

Autonomous multi-strategy **paper trading** layer built on GLOBAL CRYPTO CHAOS.

## Included
- Multi-venue public live telemetry: Binance Spot, Binance Futures liquidations, Coinbase, Kraken, OKX
- CoinGecko global aggregate
- Cross-venue BTC/ETH/SOL price normalization
- Market regime classification
- Strategy swarm: momentum, mean reversion, liquidation reversal, cross-venue divergence
- Meta-agent ensemble decision
- Cost gate: modeled fee + slippage must leave positive expected edge
- Deterministic risk governor
- Paper execution: position sizing, stop, take-profit, time exit, signal flip exit
- 0.25% equity risk per trade
- 2% daily paper kill switch
- Persistent local paper ledger
- Equity, P&L, max drawdown, win rate, profit factor
- GitHub Pages / PWA ready

## Important
This release deliberately DOES NOT place real orders. It is an evidence-generation build.
No claim of superior performance is made until forward paper/live-small results demonstrate it.
Browser-only public feeds are not a complete view of all global crypto transactions.

## Run
python3 -m http.server 8080
Open http://localhost:8080

## Publish
Commit all files to VuBounty/GLOBAL-CRYPTO-CHAOS and GitHub Pages will deploy via .github/workflows/pages.yml.

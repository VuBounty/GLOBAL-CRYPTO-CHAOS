# CHAOS AGENT v2 — Autonomous Trader UX

This version changes the product from a visual market map into a trader-first dashboard.

## Visible product surfaces
- Live Market
- Agent Brain with regime, confidence, flow and decision
- Portfolio with equity/P&L/drawdown/fees
- Strategy Swarm with independent scores and explanations
- Best Opportunity with raw edge, fee, slippage, net edge, confidence and risk
- Open Position with entry/mark/stop/take/unrealized/age
- Live Trade Journal
- Venue Health
- Forward Proof/Benchmark versus BTC buy-and-hold

## Trading mode
Paper only. No exchange key and no real orders.
A deterministic risk governor controls execution:
- 0.25% equity risk per trade
- 2% daily loss kill switch
- fee/slippage qualification gate
- stop/take/time/flip exits

## Run locally
python3 -m http.server 8080

## Publish
Run INSTALL_AND_UPDATE.command after downloading the ZIP.
It updates `~/Myproject/GLOBAL-CRYPTO-CHAOS` and pushes to `VuBounty/GLOBAL-CRYPTO-CHAOS`.

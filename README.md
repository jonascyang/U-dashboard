# Fluid Dashboard

Internal operations and risk dashboard for Fluid protocol.

## MVP Scope

- Ethereum Mainnet only
- Core lending markets
- 24h default window
- Hourly refresh
- On-site alerts only

## Scripts

- `npm run dev` - start dashboard UI
- `npm run test` - run unit/integration tests
- `npm run typecheck` - TypeScript type check
- `npm run hourly:cycle -- 2026-02-25T10:00:00.000Z` - run one hourly orchestrator cycle
- `npm run u-monitor:runtime` - start the U monitor websocket/RPC runtime and optional Worker persistence client
- `npx wrangler deploy --config apps/dashboard-worker/wrangler.toml` - deploy Cloudflare worker API

## Data Flow

1. Ingestion: chain logs -> `raw_events`
2. Aggregation: 24h KPIs -> hourly metric tables
3. Alerts: threshold + baseline evaluation
4. API/UI: overview, markets, alerts

## Required Env (for real ingestion)

- `ETH_RPC_URL`: Ethereum RPC endpoint
- `ETH_CHAIN_ID`: defaults to `1`
- `LENDING_MARKET_ADDRESSES`: optional fallback list (comma-separated) when D1 address table is empty
- `DATABASE_URL`: required if you want to persist `raw_events`

## U Monitor Env

- `U_MONITOR_WORKER_URL`: optional server-side API base URL. When set, the dashboard page and `/api/v1/u-monitor/*` routes prefer Worker/D1 data and fall back to local seed/runtime data on failure.
- `U_MONITOR_BSC_RPC_URL`: BSC RPC endpoint used for `totalSupply()` reads and Pancake V3 pool reads.
- `U_MONITOR_PERSIST_URL`: optional full Worker persist endpoint for the runtime process.
- `U_MONITOR_PERSIST_TOKEN`: optional auth token sent as `x-u-monitor-token` when persisting snapshots.

## U Monitor Data Flow

1. Runtime connectors subscribe to `Binance`, `LBank`, `HTX`, and `PancakeSwap V3`.
2. The runtime computes normalized venue snapshots and a weighted U/USDT price.
3. `npm run u-monitor:runtime` can POST those snapshots to Worker `/api/v1/u-monitor/persist`.
4. The Cloudflare Worker stores price source snapshots, weighted price snapshots, and supply snapshots in D1.
5. The dashboard server prefers `U_MONITOR_WORKER_URL` for overview/depeg/supply reads so the UI can render persisted D1 data by default.

## Hourly Cycle

In Cloudflare mode, hourly ingestion reads addresses from D1 table `monitored_markets` (`enabled = 1`). If that table is empty, it falls back to `LENDING_MARKET_ADDRESSES`.

## Cloudflare Deploy

1. Configure secrets:
   - GitHub: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`
   - Worker secrets: `ETH_RPC_URL`, `U_MONITOR_BSC_HTTP_URL`, `U_MONITOR_BSC_WS_URL`, `U_MONITOR_API_TOKEN`
2. Configure D1 binding in:
   - `apps/dashboard-worker/wrangler.toml`
3. Apply D1 migration:
   - `npx wrangler d1 migrations apply u-dashboard --remote --config apps/dashboard-worker/wrangler.toml`
4. Create realtime queues:
   - `npx wrangler queues create u-monitor-events`
   - `npx wrangler queues create u-monitor-events-dlq`
5. Seed monitored market addresses:
   - `npx wrangler d1 execute u-dashboard --remote --file /tmp/fluid_seed_monitored_markets.sql --config apps/dashboard-worker/wrangler.toml`
6. Deploy worker:
   - `npx wrangler deploy --config apps/dashboard-worker/wrangler.toml`
7. Set Pages env:
   - `NEXT_PUBLIC_API_BASE_URL=https://<worker>.workers.dev`
   - `U_MONITOR_WORKER_URL=https://<worker>.workers.dev`
8. Deploy Pages project `u-dashboard-web`

See:

- `docs/runbooks/cloudflare-ops.md`
- `docs/runbooks/cloudflare-secrets.md`

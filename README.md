# U-dashboard

Internal operations and risk dashboard project for Fluid-related monitoring and U-market tracking.

## Components

- `dashboard-web`: Next.js frontend
- `dashboard-worker`: Cloudflare Worker API for dashboard data and U-monitor runtime persistence

## Current Scope

- Dashboard overview, markets, alerts, and timeseries APIs
- U-monitor overview, depeg, and supply APIs
- Hourly dashboard pipeline
- Queue and Durable Object based U-monitor ingestion

## Scripts

- `npm run dev` - start the dashboard frontend locally
- `npm run test` - run frontend/server tests
- `npm run typecheck` - run TypeScript type checks
- `npm run hourly:cycle -- 2026-02-25T10:00:00.000Z` - run one hourly orchestrator cycle
- `npm run u-monitor:runtime` - start the U-monitor runtime process

## Worker

Worker config:
- [dashboard-worker/wrangler.toml](/Users/jonas/Desktop/Fluid_WorkFlow/projects/u-dashboard/dashboard-worker/wrangler.toml)

Worker name:
- `u-dashboard`

## Web

Web config:
- [dashboard-web/wrangler.toml](/Users/jonas/Desktop/Fluid_WorkFlow/projects/u-dashboard/dashboard-web/wrangler.toml)

Web project name:
- `u-dashboard-web`

## Deploy Notes

- Deploy the worker from `dashboard-worker`
- Deploy the frontend from the project root or `dashboard-web` flow, depending on your Cloudflare setup
- This project no longer contains the standalone `Fluid-Monitor` Telegram bot and multichain monitor

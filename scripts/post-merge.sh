#!/bin/bash
set -e
pnpm install --frozen-lockfile
pnpm --filter db push
pnpm --filter @workspace/scripts run seed:projects
pnpm --filter @workspace/scripts run seed:supplier-shop

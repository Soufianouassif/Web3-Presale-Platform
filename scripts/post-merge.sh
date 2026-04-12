#!/bin/bash
set -e
pnpm install --ignore-scripts
# Fix execute permissions on esbuild binaries (needed in Replit sandbox)
find node_modules/.pnpm -name "esbuild" -path "*/bin/esbuild" -exec chmod +x {} \; 2>/dev/null || true
# Push database schema changes
pnpm --filter @workspace/db run push

#!/bin/sh
set -e
pnpm --filter @workspace/api-server run build
cp artifacts/api-server/dist/app.mjs api/server.mjs
cp artifacts/api-server/dist/pino-worker.mjs api/
cp artifacts/api-server/dist/pino-file.mjs api/
cp artifacts/api-server/dist/pino-pretty.mjs api/
cp artifacts/api-server/dist/thread-stream-worker.mjs api/
pnpm --filter @workspace/pepewife run build
rm -rf dist
cp -r artifacts/pepewife/dist/public dist

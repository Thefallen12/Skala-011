#!/bin/sh
set -eu

mkdir -p /app/.private-data
find /app/.private-data -type d -exec chown node:node {} +

exec gosu node node server.js

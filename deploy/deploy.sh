#!/usr/bin/env bash
# Atomic release swap for blog.wldnanatayya.com.
# Usage: ./deploy/deploy.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
RELEASES="/var/www/blog-releases"
RELEASE="$RELEASES/$(date +%Y%m%d-%H%M%S)"

if [ ! -f "$ROOT/dist/index.html" ]; then
  echo "deploy: run 'npm run build' first" >&2
  exit 1
fi

sudo mkdir -p "$RELEASES"
sudo cp -a "$ROOT/dist/." "$RELEASE/"
sudo chmod -R a+rX "$RELEASE"
sudo ln -sfn "$RELEASE" "$RELEASES/.next"
sudo mv -T "$RELEASES/.next" "$RELEASES/current"
sudo nginx -t
sudo systemctl reload nginx

echo "deployed $RELEASE"
echo "rollback: $ROOT/deploy/rollback.sh $(basename "$RELEASE")"

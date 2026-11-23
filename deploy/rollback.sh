#!/usr/bin/env bash
# Point the live symlink at an older release.
# Usage: ./deploy/rollback.sh 20261124-0300
set -euo pipefail

RELEASES="/var/www/blog-releases"
RELEASE="${1:-}"

if [ -z "$RELEASE" ]; then
  echo "usage: $0 <release-directory-name>" >&2
  echo "available:" >&2
  ls -1 "$RELEASES" >&2
  exit 1
fi

if [ ! -d "$RELEASES/$RELEASE" ]; then
  echo "rollback: no such release: $RELEASE" >&2
  exit 1
fi

sudo ln -sfn "$RELEASES/$RELEASE" "$RELEASES/.next"
sudo mv -T "$RELEASES/.next" "$RELEASES/current"
sudo nginx -t
sudo systemctl reload nginx

echo "rolled back to $RELEASE"

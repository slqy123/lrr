#!/usr/bin/env bash
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
UNIT="lrr-queue.service"
UNIT_DIR="$HOME/.config/systemd/user"

PY="$DIR/.venv/bin/python"
[ -x "$PY" ] || PY="$(command -v python3)"

mkdir -p "$UNIT_DIR"
sed -e "s|@PYTHON@|$PY|g" -e "s|@DIR@|$DIR|g" \
    "$DIR/$UNIT.in" > "$UNIT_DIR/$UNIT"

systemctl --user daemon-reload
systemctl --user enable "$UNIT"
systemctl --user restart "$UNIT"
loginctl enable-linger "$USER" 2>/dev/null || true

systemctl --user --no-pager --lines=0 status "$UNIT" || true

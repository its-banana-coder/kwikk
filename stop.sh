#!/usr/bin/env bash
# Stop all kwikk dev services — kills by port AND pids file so stale processes are caught.

ROOT="$(cd "$(dirname "$0")" && pwd)"
PIDS_FILE="$ROOT/.logs/pids"

echo "Stopping kwikk services..."

# Kill by pids file (processes started by dev.sh)
if [ -f "$PIDS_FILE" ] && [ -s "$PIDS_FILE" ]; then
  while IFS= read -r pid; do
    [ -z "$pid" ] && continue
    PGID=$(ps -o pgid= -p "$pid" 2>/dev/null | tr -d ' ')
    if [ -n "$PGID" ]; then
      kill -- -"$PGID" 2>/dev/null || true
    else
      kill "$pid" 2>/dev/null || true
    fi
  done < "$PIDS_FILE"
  > "$PIDS_FILE"
fi

# Kill anything still holding the known ports (catches stale/manual runs)
for port in 8080 5173 5174 5175; do
  PIDS_ON_PORT=$(lsof -ti tcp:"$port" 2>/dev/null || true)
  if [ -n "$PIDS_ON_PORT" ]; then
    echo "  Killing stale process(es) on :$port"
    echo "$PIDS_ON_PORT" | xargs kill -9 2>/dev/null || true
  fi
done

sleep 0.5
echo "Done."

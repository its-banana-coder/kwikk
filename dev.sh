#!/usr/bin/env bash
# Start kwikk dev services (API + Editor).
# Kills any stale processes on the ports first — safe to re-run.
# Usage: ./dev.sh

ROOT="$(cd "$(dirname "$0")" && pwd)"

GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${CYAN}Starting kwikk dev services...${NC}"

# ── Kill any stale processes on our ports ─────────────────────────────────────
for port in 8080 5173 5174 5175; do
  PIDS_ON_PORT=$(lsof -ti tcp:"$port" 2>/dev/null || true)
  if [ -n "$PIDS_ON_PORT" ]; then
    echo -e "  ${YELLOW}Clearing port :$port${NC}"
    echo "$PIDS_ON_PORT" | xargs kill -9 2>/dev/null || true
  fi
done
sleep 0.5

# ── Setup ─────────────────────────────────────────────────────────────────────
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"

mkdir -p "$ROOT/.logs"
> "$ROOT/.logs/pids"

# ── Launch services ───────────────────────────────────────────────────────────
start_service() {
  local name="$1"
  local cmd="$2"
  local log="$ROOT/.logs/${name}.log"
  echo -e "  ${GREEN}▶ ${name}${NC}  →  ${log}"
  FORCE_COLOR=1 bash -c "cd '$ROOT' && $cmd" > "$log" 2>&1 &
  echo $! >> "$ROOT/.logs/pids"
}

start_service "api"      "pnpm --filter @kwikk/api dev"
start_service "editor"   "pnpm --filter @kwikk/editor dev"
start_service "renderer" "pnpm --filter @kwikk/renderer dev"
start_service "platform" "pnpm --filter @kwikk/ai-reel-platform dev"

# ── Wait for API to be ready ──────────────────────────────────────────────────
echo -ne "\n  Waiting for API..."
for i in $(seq 1 30); do
  if curl -sf http://localhost:8080/health >/dev/null 2>&1; then
    echo -e " ${GREEN}ready${NC}"
    break
  fi
  sleep 1
  echo -n "."
done

echo ""
echo -e "${CYAN}Services ready:${NC}"
echo -e "  API      http://localhost:8080"
echo -e "  Editor   http://localhost:5173"
echo -e "  Renderer http://localhost:5174"
echo -e "  Platform http://localhost:5175"
echo ""
echo -e "Generate a video:"
echo -e "  ${GREEN}pnpm --filter @kwikk/api generate \"Your topic here\"${NC}"
echo ""
echo -e "Stop all: ${CYAN}./stop.sh${NC}"
echo ""

# ── Tail logs ─────────────────────────────────────────────────────────────────
tail -f "$ROOT"/.logs/*.log &
TAIL_PID=$!

trap "bash '$ROOT/stop.sh'; kill $TAIL_PID 2>/dev/null; echo 'Stopped.'" INT TERM
wait $TAIL_PID

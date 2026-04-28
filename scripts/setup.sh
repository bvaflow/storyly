#!/usr/bin/env bash
# strory.fun — VPS bootstrap script
# Idempotent: safe to re-run. Honors PROJECT_DIR if you want a custom path.
set -euo pipefail

PROJECT_DIR="${PROJECT_DIR:-/root/storyly}"
REPO_URL="https://github.com/bvaflow/storyly.git"
DEFAULT_APP_URL="http://72.60.74.51:3000"

# Use sudo only if not already root.
SUDO=""
[ "$(id -u)" -ne 0 ] && SUDO="sudo"

# 1. Ensure git is present.
if ! command -v git &>/dev/null; then
  $SUDO apt-get update
  $SUDO apt-get install -y git
fi

# 2. Clone or pull.
if [ -d "$PROJECT_DIR/.git" ]; then
  echo "[setup] Existing repo at $PROJECT_DIR — pulling latest"
  cd "$PROJECT_DIR"
  git pull --ff-only
elif [ -d "$PROJECT_DIR" ]; then
  echo "[setup] ERROR: $PROJECT_DIR exists but is not a git repo. Move/rename it and re-run." >&2
  exit 1
else
  git clone "$REPO_URL" "$PROJECT_DIR"
  cd "$PROJECT_DIR"
fi

# 3. Ensure Node >= 20 (Next.js 16 requires it).
NODE_MAJOR=""
if command -v node &>/dev/null; then
  NODE_MAJOR="$(node -v | sed -E 's/^v([0-9]+).*/\1/')"
fi
if [ -z "$NODE_MAJOR" ] || [ "$NODE_MAJOR" -lt 20 ]; then
  echo "[setup] Installing Node 20 (current: ${NODE_MAJOR:-none})"
  curl -fsSL https://deb.nodesource.com/setup_20.x | $SUDO bash -
  $SUDO apt-get install -y nodejs
fi

# 4. Install deps reproducibly when a lockfile exists.
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

# 5. Create .env.local only when absent — never overwrite existing keys.
if [ -f .env.local ]; then
  echo "[setup] .env.local already present — leaving untouched."
else
  cat > .env.local << EOF
# Public URL the browser hits. OAuth/magic-link redirects must match exactly.
# Update this if the VPS IP or domain changes.
NEXT_PUBLIC_APP_URL=${DEFAULT_APP_URL}

# Supabase — https://supabase.com/dashboard/project/<id>/settings/api
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Fal.ai — https://fal.ai/dashboard/keys
FAL_KEY=
EOF
  echo "[setup] .env.local created at $PROJECT_DIR/.env.local — fill the 4 empty values."
fi

# 6. Optional Supabase health check — verifies connectivity + migrations applied.
#    Skipped silently if env is not yet filled.
check_supabase() {
  set +u
  source .env.local
  set -u
  [ -z "${NEXT_PUBLIC_SUPABASE_URL:-}" ] && return 0
  [ -z "${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}" ] && return 0

  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" \
    -H "apikey: ${NEXT_PUBLIC_SUPABASE_ANON_KEY}" \
    "${NEXT_PUBLIC_SUPABASE_URL}/rest/v1/profiles?select=id&limit=0" || echo "000")

  case "$code" in
    200) echo "[setup] Supabase reachable, 'profiles' table exists — migrations applied." ;;
    404) echo "[setup] Supabase reachable but 'profiles' missing — apply supabase/migrations/*.sql in the SQL Editor." ;;
    401|403) echo "[setup] Supabase rejected the anon key — check NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local." ;;
    000) echo "[setup] Could not reach NEXT_PUBLIC_SUPABASE_URL — check the value or network." ;;
    *)   echo "[setup] Supabase health check returned HTTP $code." ;;
  esac
}
check_supabase

cat <<EOF

=== Setup complete ===
Project: $PROJECT_DIR

Next steps (in order):
  1. Edit $PROJECT_DIR/.env.local and fill the 4 empty values.
  2. In Supabase SQL Editor, run these in order:
       supabase/migrations/0001_init.sql
       supabase/migrations/0002_storage.sql
       supabase/migrations/0003_finalize.sql
  3. Supabase → Authentication → URL Configuration:
       Site URL:      ${DEFAULT_APP_URL}
       Redirect URLs: ${DEFAULT_APP_URL}/auth/callback
  4. Re-run this script — the health check will confirm migrations.
  5. cd $PROJECT_DIR && npm run dev   (or 'npm run build && npm run start' for prod)
EOF

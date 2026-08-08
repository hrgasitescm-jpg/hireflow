#!/usr/bin/env bash
# =============================================================
# Menjalankan semua migrasi + test isolasi multi-tenant
# di PostgreSQL sementara (tidak menyentuh database Supabase-mu).
#
# Butuh: PostgreSQL 15/16 terpasang lokal (perintah initdb & pg_ctl).
# Jalankan dari root project:  bash supabase/tests/run.sh
# =============================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
PGBIN="${PGBIN:-$(dirname "$(command -v initdb || echo /usr/lib/postgresql/16/bin/initdb)")}"
DATADIR="${TMPDIR:-/tmp}/hireflow-pgtest"
PORT="${PGTEST_PORT:-5433}"
SOCK="${TMPDIR:-/tmp}"

cleanup() {
  "$PGBIN/pg_ctl" -D "$DATADIR" stop -m immediate >/dev/null 2>&1 || true
  rm -rf "$DATADIR"
}
trap cleanup EXIT

echo "▸ Menyiapkan PostgreSQL sementara di $DATADIR"
rm -rf "$DATADIR"
"$PGBIN/initdb" -D "$DATADIR" -U postgres >/dev/null
"$PGBIN/pg_ctl" -D "$DATADIR" -o "-k $SOCK -p $PORT" -l "$DATADIR/server.log" start >/dev/null
sleep 1

PSQL="psql -h $SOCK -p $PORT -U postgres -v ON_ERROR_STOP=1 -q"

echo "▸ Menjalankan shim + migrasi"
$PSQL -f "$ROOT/supabase/tests/00_shim.sql" 2>&1 | grep -v "^NOTICE" || true
for f in "$ROOT"/supabase/migrations/*.sql; do
  echo "  - $(basename "$f")"
  $PSQL -f "$f" 2>&1 | grep -v "^psql.*NOTICE" || true
done

$PSQL -f "$ROOT/supabase/tests/01_grants.sql" >/dev/null

echo "▸ Menjalankan test isolasi multi-tenant"
if $PSQL -f "$ROOT/supabase/tests/02_tenant_isolation.sql" 2>&1 \
     | sed -n -e 's/^psql[^ ]* NOTICE:  //p' -e 's/^psql[^ ]* \(ERROR:.*\)/  \1/p'; then
  echo ""
  echo "✅ SEMUA TEST LOLOS — data antar-organisasi terisolasi."
else
  echo ""
  echo "❌ ADA TEST YANG GAGAL. Perbaiki policy RLS sebelum lanjut."
  exit 1
fi

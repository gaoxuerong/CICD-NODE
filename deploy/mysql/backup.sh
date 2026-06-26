#!/usr/bin/env sh
set -eu

ROOT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env.production}"
BACKUP_DIR="${BACKUP_DIR:-$ROOT_DIR/backups/mysql}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT_DIR/docker-compose.yml}"

if [ ! -f "$ENV_FILE" ]; then
  echo "Missing env file: $ENV_FILE" >&2
  exit 1
fi

mkdir -p "$BACKUP_DIR"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUT_FILE="$BACKUP_DIR/cicd-mysql-$TIMESTAMP.sql.gz"

echo "Creating MySQL backup: $OUT_FILE"
docker compose --env-file "$ENV_FILE" -f "$COMPOSE_FILE" exec -T mysql sh -c \
  'exec mysqldump --single-transaction --quick --routines --triggers -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' \
  | gzip -9 > "$OUT_FILE"

find "$BACKUP_DIR" -type f -name 'cicd-mysql-*.sql.gz' -mtime +"$RETENTION_DAYS" -delete

echo "Backup complete: $OUT_FILE"

#!/bin/bash
# Wrapper for cron on the remote server — sources nvm and runs place-bids (single-run)
# Uses flock to prevent overlapping runs (bid API can be slow due to on-chain calls)
# Crontab: * * * * * /home/bawler/insider-streams/scripts/run-place-bids.sh

LOCKFILE="/tmp/place-bids.lock"
LOGFILE="/home/bawler/insider-streams/logs/place-bids.log"

exec 200>"$LOCKFILE"
flock -n 200 || { echo "[run-place-bids] $(date -Iseconds) already running, skipping" >> "$LOGFILE"; exit 0; }

export NVM_DIR="/home/bawler/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

cd /home/bawler/insider-streams/scripts
exec npx tsx --env-file=.env place-bids.ts >> "$LOGFILE" 2>&1

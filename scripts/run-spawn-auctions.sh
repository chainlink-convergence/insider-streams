#!/bin/bash
# Wrapper for cron on the remote server — sources nvm and runs spawn-auctions (single-run)
# Crontab: */10 * * * * /home/bawler/insider-streams/scripts/run-spawn-auctions.sh

export NVM_DIR="/home/bawler/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

cd /home/bawler/insider-streams/scripts
exec npx tsx --env-file=.env spawn-auctions.ts >> /home/bawler/insider-streams/logs/spawn-auctions.log 2>&1

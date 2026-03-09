#!/bin/bash
# Wrapper for cron on the remote server — sources nvm and runs request-settlements (single-run)
# Crontab: * * * * * /home/bawler/insider-streams/scripts/run-request-settlements.sh

export NVM_DIR="/home/bawler/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

cd /home/bawler/insider-streams/scripts
exec npx tsx --env-file=.env request-settlements.ts >> /home/bawler/insider-streams/logs/request-settlements.log 2>&1

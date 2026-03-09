#!/bin/bash
# Wrapper for cron on the remote server — sources nvm and runs create-events
# Crontab: */15 * * * * /home/bawler/insider-streams/scripts/run-create-events.sh

export NVM_DIR="/home/bawler/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh"

cd /home/bawler/insider-streams/scripts
exec npx tsx --env-file=.env create-events.ts >> /home/bawler/insider-streams/logs/create-events.log 2>&1

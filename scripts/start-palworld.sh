#!/bin/bash

# Palworld Server Startup Script
echo "Starting Palworld Server..."

# Set default values
SERVER_NAME="${SERVER_NAME:-Palworld Server}"
PORT="${PORT:-8211}"
MAX_PLAYERS="${MAX_PLAYERS:-32}"
DIFFICULTY="${DIFFICULTY:-Normal}"

echo "========================================"
echo "Server Name: $SERVER_NAME"
echo "Port: $PORT"
echo "Max Players: $MAX_PLAYERS"
echo "Difficulty: $DIFFICULTY"
echo "========================================"

# Create save directory
mkdir -p /palworld/Pal/Saved/Config/LinuxServer

# Write server config
cat > /palworld/Pal/Saved/Config/LinuxServer/PalWorldSettings.ini <<EOF
[/Script/Pal.PalGameWorldSettings]
OptionSettings=(Difficulty=$DIFFICULTY,MaxPlayers=$MAX_PLAYERS,ServerName="$SERVER_NAME",Password="")
EOF

# Mock server startup - in production, download and run actual Palworld server
# For now, simulate server running
echo "[$(date)] Palworld server initialized on port $PORT"
echo "[$(date)] Max players: $MAX_PLAYERS"
echo "[$(date)] Difficulty: $DIFFICULTY"

# Keep container running
tail -f /dev/null
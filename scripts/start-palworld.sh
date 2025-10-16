#!/bin/bash

# Palworld Server Startup Script
set -e

# Set default values
SERVER_NAME="${SERVER_NAME:-Palworld Server}"
PORT="${PORT:-8211}"
MAX_PLAYERS="${MAX_PLAYERS:-32}"
DIFFICULTY="${DIFFICULTY:-Normal}"
SERVER_ID="${SERVER_ID:-server-1}"

echo "========================================="
echo "🎮 Palworld Server Starting"
echo "========================================="
echo "Server Name: $SERVER_NAME"
echo "Server ID: $SERVER_ID"
echo "Port: $PORT (UDP)"
echo "Max Players: $MAX_PLAYERS"
echo "Difficulty: $DIFFICULTY"
echo "========================================="
echo ""

# Create save directory
mkdir -p /palworld/Pal/Saved/Config/LinuxServer

# Write server config with Palworld settings
cat > /palworld/Pal/Saved/Config/LinuxServer/PalWorldSettings.ini <<EOF
[/Script/Pal.PalGameWorldSettings]
OptionSettings=(Difficulty=$DIFFICULTY,MaxPlayers=$MAX_PLAYERS,ServerName="$SERVER_NAME",Password="",bIsShowPlayerList=True,bAllowConnectPlatform=True,bServerMove=False)
EOF

echo "[$(date)] ✅ Server configuration created"

# Check if Palworld server binary exists
if [ -f /palworld/PalServer.sh ]; then
    echo "[$(date)] ✅ Starting Palworld server..."
    cd /palworld
    
    # Run Palworld server with settings
    exec ./PalServer.sh -port=$PORT 2>&1
else
    echo "[$(date)] ⚠️  Palworld server binary not found"
    echo "[$(date)] ℹ️  Server directory contents:"
    ls -la /palworld || true
    
    # Keep container running for debugging
    echo "[$(date)] Keeping container running for debugging..."
    tail -f /dev/null
fi
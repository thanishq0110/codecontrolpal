#!/bin/bash
# ============================================================
# Palworld Server Management Panel - Deployment Script
# ============================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Palworld Panel - Deployment Script${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Check if running as sudo
if [[ $EUID -ne 0 ]]; then
   echo -e "${YELLOW}⚠️  WARNING: This script should be run with sudo${NC}"
   echo -e "${YELLOW}Please run: sudo ./deploy.sh${NC}"
   echo ""
   read -p "$(echo -e ${YELLOW}Continue anyway? [y/N]:${NC}) " -n 1 -r
   echo ""
   if [[ ! $REPLY =~ ^[Yy]$ ]]; then
       exit 1
   fi
fi

echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker is not installed${NC}"
    echo "Please install Docker from https://www.docker.com"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose is not installed${NC}"
    echo "Please install Docker Compose"
    exit 1
fi

echo -e "${GREEN}✅ Docker and Docker Compose are installed${NC}"
echo ""

# Check if .env exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}⚠️  No .env file found${NC}"
    echo "Creating .env from .env.example..."
    cp .env.example .env
    echo -e "${YELLOW}📝 Please edit .env with your configuration${NC}"
    echo -e "${YELLOW}   Important: Change ADMIN_PASSWORD and JWT_SECRET${NC}"
    exit 1
fi

echo -e "${GREEN}✅ .env file exists${NC}"
echo ""

# Ask for deployment confirmation
read -p "$(echo -e ${BLUE}Ready to deploy? [y/N]:${NC}) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Deployment cancelled${NC}"
    exit 0
fi

echo ""
echo -e "${BLUE}Starting deployment...${NC}"
echo ""

# Build images
echo -e "${BLUE}1/4 Building Docker images...${NC}"
docker-compose build --pull

echo -e "${GREEN}✅ Build complete${NC}"
echo ""

# Stop existing containers
echo -e "${BLUE}2/4 Stopping existing containers...${NC}"
docker-compose down || true

echo -e "${GREEN}✅ Stopped${NC}"
echo ""

# Start services
echo -e "${BLUE}3/4 Starting services...${NC}"
docker-compose up -d

echo -e "${GREEN}✅ Services started${NC}"
echo ""

# Wait for service to be ready
echo -e "${BLUE}4/4 Waiting for services to be ready...${NC}"
sleep 5

# Check health with retries
HEALTH_CHECK_RETRIES=5
HEALTH_CHECK_WAIT=2
for i in $(seq 1 $HEALTH_CHECK_RETRIES); do
    if curl -f http://localhost:8080/api/health &> /dev/null; then
        echo -e "${GREEN}✅ Health check passed${NC}"
        break
    fi
    if [ $i -lt $HEALTH_CHECK_RETRIES ]; then
        echo -e "${YELLOW}⏳ Health check attempt $i/$HEALTH_CHECK_RETRIES failed, retrying in ${HEALTH_CHECK_WAIT}s...${NC}"
        sleep $HEALTH_CHECK_WAIT
    else
        echo -e "${YELLOW}⚠️  Health check timeout (service may still be starting)${NC}"
        echo -e "${YELLOW}View logs with: sudo docker-compose logs -f palworld-panel${NC}"
    fi
done

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "📍 Local access: http://localhost:8080"
echo ""
echo "📝 Default credentials:"
echo "   Username: admin"
echo "   Password: (check your .env file)"
echo ""

# Ask about Cloudflare Tunnel setup
echo ""
read -p "$(echo -e ${BLUE}Setup Cloudflare Tunnel for public access? [y/N]:${NC}) " -n 1 -r
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo -e "${BLUE}Setting up Cloudflare Tunnel...${NC}"
    
    # Check if cloudflared is installed
    if ! command -v cloudflared &> /dev/null; then
        echo -e "${YELLOW}⚠️  cloudflared is not installed${NC}"
        echo "Install with: brew install cloudflare/cloudflare/cloudflared"
        echo "Or: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/tunnel-guide/"
    else
        echo -e "${BLUE}Starting Cloudflare Tunnel...${NC}"
        echo "This will display your public URL. Keep this terminal open to maintain the tunnel."
        echo ""
        cloudflared tunnel --url http://localhost:8080
    fi
else
    echo ""
    echo "📊 View logs (if needed):"
    echo "   sudo docker-compose logs -f palworld-panel"
    echo ""
    echo "🛑 Stop services:"
    echo "   sudo docker-compose down"
    echo ""
fi

echo "⚠️  Note: Use 'sudo' for docker-compose commands in the future"
echo ""
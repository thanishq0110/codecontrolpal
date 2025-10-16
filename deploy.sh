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

# Check health
if curl -f http://localhost:8080/api/health &> /dev/null; then
    echo -e "${GREEN}✅ Health check passed${NC}"
else
    echo -e "${YELLOW}⚠️  Health check timeout (service may still be starting)${NC}"
fi

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✅ Deployment Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "📍 Access the panel at: http://localhost:8080"
echo ""
echo "📝 Default credentials:"
echo "   Username: admin"
echo "   Password: (check your .env file)"
echo ""
echo "📊 View logs:"
echo "   docker-compose logs -f palworld-panel"
echo ""
echo "🛑 Stop services:"
echo "   docker-compose down"
echo ""
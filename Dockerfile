# Stage 1: Build frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /build/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ .
RUN npm run build

# Stage 2: Final image
FROM ubuntu:22.04

# Install Node.js and dependencies
RUN apt-get update && apt-get install -y \
    curl \
    nodejs \
    npm \
    wget \
    git \
    unzip \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy backend files
COPY backend/package*.json ./
RUN npm install

COPY backend/ .

# Copy built frontend
COPY --from=frontend-builder /build/frontend/dist ./public

# Create directories for Palworld server
RUN mkdir -p /palworld /app/data

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8080/api/health || exit 1

# Start application
CMD ["npm", "start"]
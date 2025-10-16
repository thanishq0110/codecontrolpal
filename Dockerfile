# ============================================================
# Stage 1: Build frontend
# ============================================================
FROM node:18-alpine AS frontend-builder

WORKDIR /build/frontend

# Copy package files
COPY frontend/package*.json ./

# Install all dependencies (including dev) to build the frontend
RUN npm install

# Copy frontend source
COPY frontend/ .

# Build frontend
RUN npm run build

# ============================================================
# Stage 2: Final image
# ============================================================
FROM ubuntu:22.04

# Set metadata
LABEL maintainer="Palworld Panel"
LABEL description="Palworld Server Management Panel"
LABEL version="1.0.0"

# Set environment variables
ENV NODE_ENV=production \
    NODE_PATH=/app/node_modules \
    PATH=/app/node_modules/.bin:$PATH

# Install dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    wget \
    ca-certificates \
    nodejs \
    npm \
    docker.io \
    && rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

# Create non-root user for running the application
RUN useradd -m -s /bin/bash node

# Create app directory
WORKDIR /app

# Copy package files
COPY backend/package*.json ./

# Install dependencies with npm install for production
RUN npm install --omit=dev

# Copy backend application
COPY backend/ .

# Copy built frontend from builder stage
COPY --from=frontend-builder /build/frontend/dist ./public

# Create required directories with proper permissions
RUN mkdir -p /palworld /app/data && \
    chown -R node:node /app /palworld

# Switch to non-root user
USER node

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:8080/api/health || exit 1

# Start application
CMD ["npm", "start"]
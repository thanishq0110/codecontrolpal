@echo off
REM ============================================================
REM Palworld Server Management Panel - Deployment Script (Windows)
REM ============================================================

setlocal enabledelayedexpansion

cls
echo ========================================
echo Palworld Panel - Deployment Script
echo ========================================
echo.

REM Check if Docker is installed
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker is not installed
    echo Please install Docker from https://www.docker.com
    pause
    exit /b 1
)

REM Check if Docker Compose is installed
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker Compose is not installed
    echo Please install Docker Compose
    pause
    exit /b 1
)

echo [OK] Docker and Docker Compose are installed
echo.

REM Check if .env exists
if not exist .env (
    echo [WARNING] No .env file found
    echo Creating .env from .env.example...
    copy .env.example .env >nul
    echo [IMPORTANT] Please edit .env with your configuration
    echo [IMPORTANT] Change ADMIN_PASSWORD and JWT_SECRET before deploying
    pause
    exit /b 1
)

echo [OK] .env file exists
echo.

REM Ask for deployment confirmation
set /p CONFIRM="Ready to deploy? [y/N]: "
if /i not "%CONFIRM%"=="y" (
    echo Deployment cancelled
    exit /b 0
)

echo.
echo Starting deployment...
echo.

REM Build images
echo [1/4] Building Docker images...
docker-compose build --pull
if errorlevel 1 (
    echo [ERROR] Build failed
    pause
    exit /b 1
)
echo [OK] Build complete
echo.

REM Stop existing containers
echo [2/4] Stopping existing containers...
docker-compose down
echo [OK] Stopped
echo.

REM Start services
echo [3/4] Starting services...
docker-compose up -d
if errorlevel 1 (
    echo [ERROR] Failed to start services
    pause
    exit /b 1
)
echo [OK] Services started
echo.

REM Wait for service to be ready
echo [4/4] Waiting for services to be ready...
timeout /t 5 /nobreak
echo.

REM Check health
echo Checking health...
curl -f http://localhost:8080/api/health >nul 2>&1
if errorlevel 1 (
    echo [WARNING] Health check timeout (service may still be starting)
) else (
    echo [OK] Health check passed
)

echo.
echo ========================================
echo [OK] Deployment Complete!
echo ========================================
echo.
echo Access the panel at: http://localhost:8080
echo.
echo Default credentials:
echo    Username: admin
echo    Password: (check your .env file)
echo.
echo View logs:
echo    docker-compose logs -f palworld-panel
echo.
echo Stop services:
echo    docker-compose down
echo.
pause
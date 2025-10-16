# Palworld Server Management Panel

Professional Docker-based management panel for Palworld servers. Create, manage, and monitor multiple isolated game server instances with real-time console access and resource monitoring.

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose installed
- 4GB+ RAM per server instance
- Linux/Mac with bash OR Windows with WSL2/Docker Desktop

### Installation (Automated)

**Option 1: Linux/Mac**
```bash
chmod +x deploy.sh
./deploy.sh
```

**Option 2: Windows**
```cmd
deploy.bat
```

### Installation (Manual)

**1. Clone or extract the project:**
```bash
cd palworld-panel
```

**2. Configure environment:**
```bash
cp .env.example .env
```
**IMPORTANT**: Edit `.env` and change:
- `ADMIN_PASSWORD` - Change from `changeme123` to a strong password
- `JWT_SECRET` - Generate a random secret (run: `openssl rand -base64 32`)

**3. Start the panel:**
```bash
docker-compose up -d
```

**4. Access the panel:**
```
http://localhost:8080
```

**Default Credentials:**
- Username: `admin`
- Password: `[your configured password]`

### Stop & Cleanup

```bash
# Stop all services (data preserved)
docker-compose down

# Remove everything including volumes (CAUTION: deletes all data)
docker-compose down -v
```

## 📋 Features

- ✅ **Multi-Server Management** - Create and manage isolated server instances
- ✅ **Docker Container Isolation** - Each server runs in its own container with resource limits
- ✅ **Real-Time Console** - Live server logs and command execution (<100ms latency)
- ✅ **Resource Monitoring** - Real-time CPU % and Memory % tracking
- ✅ **Player Management** - View players, kick, ban
- ✅ **Server Control** - Start, stop, restart operations
- ✅ **Authentication** - Secure JWT-based login system
- ✅ **Multi-User Support** - User isolation and server ownership
- ✅ **File Manager** - Browse and manage server files
- ✅ **Server Configuration** - Customize server parameters

## ⚙️ Configuration

### Environment Variables

Edit `docker-compose.yml` or create `.env` file:

```yaml
NODE_ENV=production                              # Set to production for deployment
PORT=8080                                        # Panel port
ADMIN_USERNAME=admin                             # Admin login username
ADMIN_PASSWORD=changeme123                       # CHANGE THIS IN PRODUCTION
JWT_SECRET=your-secret-key-here                 # CHANGE THIS (use: openssl rand -base64 32)
PALWORLD_INSTALL_DIR=/palworld                  # Server install directory
```

### Port Configuration

- **Panel UI**: `8080` (HTTP)
- **Game Servers**: `8211-8300/UDP` (90 servers max)

Adjust port ranges in `docker-compose.yml` if needed:
```yaml
ports:
  - "8080:8080"
  - "8211-8300:8211-8300/udp"  # Change range here
```

## 🔐 Security (Production)

**Before deploying to production:**

1. **Change admin password:**
   ```bash
   # Update in docker-compose.yml
   ADMIN_PASSWORD=your-strong-password-here
   ```

2. **Generate strong JWT secret:**
   ```bash
   # On Linux/Mac
   openssl rand -base64 32
   
   # On Windows
   # Use any online tool or install OpenSSL
   ```

3. **Update JWT_SECRET in docker-compose.yml:**
   ```yaml
   JWT_SECRET=your-generated-secret-here
   ```

4. **Enable HTTPS/SSL:**
   - Use Cloudflare Tunnel or nginx reverse proxy
   - Example: `https://palworld-panel.example.com`

5. **Firewall Rules:**
   ```bash
   # Allow only necessary ports
   ufw allow 8080/tcp      # Panel access
   ufw allow 8211:8300/udp # Game servers
   ```

## 📊 Architecture

```
Palworld Management Panel
├── Frontend: React + Tailwind CSS
├── Backend: Node.js + Express
├── Database: SQLite
├── Real-Time: Socket.IO (WebSockets)
└── Container Manager: Docker API
```

**Server Isolation:**
- Each Palworld server runs in isolated Docker container
- Resource limits: 4GB RAM, 1 CPU share per server
- Independent lifecycle management
- Real-time stats and log streaming

## 📝 System Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 2 cores | 4+ cores |
| RAM | 8GB | 16GB+ |
| Storage | 50GB | 100GB+ |
| Network | 10 Mbps | 100 Mbps+ |

Per server requires ~4GB RAM, so plan accordingly for multiple instances.

## 📂 Project Structure

```
palworld-panel/
├── backend/
│   ├── server.js              # Main application entry
│   ├── routes/
│   │   ├── auth.js            # Authentication endpoints
│   │   ├── server.js          # Server management API
│   │   ├── console.js         # Console/command API
│   │   ├── files.js           # File manager API
│   │   ├── players.js         # Player management API
│   │   └── stats.js           # Statistics API
│   ├── middleware/
│   │   └── auth.js            # JWT authentication
│   └── utils/
│       ├── database.js        # SQLite database
│       ├── docker-manager.js  # Docker container management
│       └── palworld-manager.js # Palworld specific logic
├── frontend/
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── pages/             # Page components
│   │   └── main.jsx           # Entry point
│   └── index.html
├── docker-compose.yml         # Docker Compose configuration
├── Dockerfile                 # Panel container image
└── Dockerfile.palworld        # Game server container image
```

## 🚀 Deployment

### Docker Hub
```bash
# Build custom image
docker build -t palworld-panel:latest .
docker tag palworld-panel:latest yourrepo/palworld-panel:latest
docker push yourrepo/palworld-panel:latest
```

### Cloud Deployment (AWS/GCP/Azure)
1. Push image to container registry
2. Use container orchestration (ECS, GKE, ACI)
3. Configure persistent volumes for data
4. Set up SSL/TLS certificates
5. Configure firewall rules

### Reverse Proxy (nginx)
```nginx
server {
    listen 443 ssl;
    server_name palworld.example.com;
    
    ssl_certificate /etc/ssl/certs/cert.pem;
    ssl_certificate_key /etc/ssl/private/key.pem;
    
    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 🔧 Troubleshooting

### Container fails to start
```bash
# Check logs
docker-compose logs palworld-panel

# Restart services
docker-compose restart

# Full rebuild
docker-compose down -v && docker-compose up -d
```

### Out of memory
- Reduce servers or increase host RAM
- Lower container memory limits in `backend/utils/docker-manager.js`
- Monitor with: `docker stats`

### Port conflicts
- Change port ranges in `docker-compose.yml`
- Check existing containers: `docker ps`

### WebSocket issues
- Ensure `Socket.IO` not blocked by firewall
- Check CORS configuration in `backend/server.js`
- Browser console for WebSocket errors

## 📊 API Reference

### Authentication
```bash
POST /api/auth/login
POST /api/auth/logout
GET /api/auth/profile
```

### Server Management
```bash
GET /api/server/list           # List all servers
POST /api/server/create        # Create new server
GET /api/server/:id            # Get server details
POST /api/server/:id/start     # Start server
POST /api/server/:id/stop      # Stop server
POST /api/server/:id/restart   # Restart server
DELETE /api/server/:id         # Delete server
```

### Real-Time Monitoring
```bash
WebSocket: /socket.io
Events: server:stats:update, server:logs:update
```

## 📞 Support & Contribution

For issues, features, or contributions:
- Create an issue in the repository
- Submit pull requests with improvements
- Document any major changes

## 📄 License

MIT License - See LICENSE file for details

## 🔄 Version History

**v1.0.0** - Initial release
- Multi-server Docker management
- Real-time console and stats
- Production-ready deployment

---

**Last Updated**: 2024
**Status**: Production Ready ✅
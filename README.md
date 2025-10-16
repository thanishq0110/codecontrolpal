# Palworld Server Management Panel

A comprehensive Docker-based management panel for Palworld servers, similar to Pterodactyl. Control your server, manage players, view console logs, and more.

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose installed

### Start the Panel

```bash
docker-compose up -d
```

The panel will be available at `http://localhost:8080`

**Default Credentials:**
- Username: `admin`
- Password: `changeme123`

### Stop & Remove

```bash
docker-compose down -v
```

This removes everything including all data (clean removal).

## 📋 Features

- ✅ **Server Management** - Start, stop, restart server
- ✅ **Player Management** - View players, kick, ban
- ✅ **Live Console** - Real-time server logs
- ✅ **File Manager** - Browse server files
- ✅ **Server Settings** - Configure server parameters
- ✅ **Resource Monitoring** - CPU, memory, uptime stats
- ✅ **Authentication** - Secure login system

## 🔧 Environment Variables

Edit `docker-compose.yml` to customize:

```yaml
environment:
  - ADMIN_USERNAME=admin
  - ADMIN_PASSWORD=changeme123
  - JWT_SECRET=your-secret-key-change-this
```

## 📦 With Cloudflare Tunnel

Create a tunnel to expose the panel publicly:

```bash
cloudflared tunnel run my-palworld-tunnel
```

Then configure it to route to `http://localhost:8080`

## 🏗️ Architecture

- **Backend**: Node.js + Express
- **Frontend**: React + Tailwind CSS
- **Database**: SQLite
- **Container**: Ubuntu with Node.js

## 📂 Project Structure

```
.
├── Dockerfile
├── docker-compose.yml
├── backend/
│   ├── server.js
│   ├── routes/
│   ├── middleware/
│   └── utils/
└── frontend/
    └── src/
```

## 🧹 Clean Removal

Everything is managed inside Docker. No files left behind:

```bash
docker-compose down -v
```

## 📝 Notes

- All data is stored in Docker volumes (`/palworld`, `/app/data`)
- No local configuration files needed
- Environment variables control all settings
- Fully containerized - no external dependencies

## 🔐 Security

- Change default admin password immediately
- Update JWT_SECRET with a strong key
- Use Cloudflare tunnel for secure remote access
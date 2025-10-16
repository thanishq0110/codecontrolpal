# 🚀 Palworld Panel - Startup Guide

## Step 1: Build & Start

```bash
cd c:\Users\thanishq\Documents\codecontrol
docker-compose up --build
```

Wait for the output:
```
✅ Palworld Panel running on port 8080
📍 Access at http://localhost:8080
```

## Step 2: Access the Panel

**Local Access:**
- Open browser: `http://localhost:8080`

**Remote Access (Cloudflare Tunnel):**
```bash
cloudflared tunnel run --url http://localhost:8080
```

Copy the provided tunnel URL (e.g., `https://tunnel-xyz.trycloudflare.com`)

## Step 3: Login

**Default Credentials:**
- Username: `admin`
- Password: `changeme123`

⚠️ **Change these immediately in production!**

## Step 4: Configure (Optional)

Edit `docker-compose.yml` to change:
```yaml
environment:
  - ADMIN_USERNAME=your_username
  - ADMIN_PASSWORD=your_password
  - JWT_SECRET=your-random-secret-key
```

Then restart:
```bash
docker-compose down
docker-compose up --build
```

## 🛑 Stop & Clean Up

```bash
# Stop container (keep data)
docker-compose stop

# Stop and remove (clean removal)
docker-compose down -v
```

## 📋 File Structure

```
palworld-panel/
├── Dockerfile                    # Docker image definition
├── docker-compose.yml           # Container orchestration
├── README.md                     # Documentation
├── STARTUP.md                    # This file
├── backend/
│   ├── server.js               # Main backend server
│   ├── package.json            # Node dependencies
│   ├── data/                   # Database storage (volume)
│   ├── routes/                 # API endpoints
│   ├── middleware/             # Auth middleware
│   └── utils/                  # Utilities (DB, Palworld manager)
└── frontend/
    ├── package.json            # React dependencies
    ├── vite.config.js         # Build config
    ├── index.html             # Entry HTML
    └── src/
        ├── main.jsx           # React entry
        ├── App.jsx            # Main component
        ├── pages/             # Page components
        └── components/        # UI components
```

## ✅ Verification Checklist

- [ ] Docker running
- [ ] Port 8080 available
- [ ] Container started successfully
- [ ] Panel loads at http://localhost:8080
- [ ] Login works with default credentials
- [ ] Cloudflare tunnel configured (if needed)

## 🔧 Troubleshooting

**Port 8080 already in use:**
```bash
# Change port in docker-compose.yml
ports:
  - "8081:8080"  # Use 8081 instead
```

**Cannot connect to localhost:8080:**
```bash
# Check container is running
docker ps

# View logs
docker logs palworld-panel
```

**Database errors:**
```bash
# Clean database
docker-compose down -v
docker-compose up --build
```

## 📞 Support

For issues, check:
1. Docker logs: `docker logs palworld-panel`
2. README.md for more info
3. Verify environment variables in docker-compose.yml
# Docker Setup for MedicalRag-Evra-POC

This project uses Docker to containerize the FastAPI backend and React Native (Expo) frontend for easy deployment.

## Prerequisites

- Docker and Docker Compose installed on your system
- Git

## Project Structure

```
MedicalRag-Evra-POC/
├── api/                 # FastAPI backend
│   ├── Dockerfile
│   ├── .dockerignore
│   └── ...
├── app/                 # React Native (Expo) frontend
│   ├── Dockerfile
│   ├── .dockerignore
│   └── ...
├── docker-compose.yaml  # Docker Compose configuration
├── deploy-docker.sh     # Deployment script
└── DOCKER_README.md     # This file
```

## Services

### 1. API Service (FastAPI Backend)

- **Port**: 8000
- **Context**: `./api`
- **Framework**: FastAPI with Python 3.12
- **Package Manager**: uv

### 2. Web Service (React Native Frontend)

- **Port**: 3000
- **Context**: `./app`
- **Framework**: React Native with Expo
- **Package Manager**: npm/npx

## Quick Start

1. **Clone the repository** (if not already done):

   ```bash
   git clone <your-repo-url>
   cd MedicalRag-Evra-POC
   ```

2. **Create environment files**:

   ```bash
   # Create API environment file
   cp api/.env.example api/.env
   # Edit api/.env with your configuration

   # Create app environment file
   cp app/.env.example app/.env
   # Edit app/.env with your configuration
   ```

3. **Deploy using the script**:

   ```bash
   chmod +x deploy-docker.sh
   ./deploy-docker.sh
   ```

   Or manually:

   ```bash
   docker compose up -d --build
   ```

## Manual Commands

### Build and Start Services

```bash
# Build and start all services
docker compose up -d --build

# Start services without rebuilding
docker compose up -d

# View logs
docker compose logs -f
```

### Individual Service Management

```bash
# Start only the API
docker compose up -d api

# Start only the web frontend
docker compose up -d web

# Rebuild a specific service
docker compose build api
docker compose build web
```

### Stop and Cleanup

```bash
# Stop all services
docker compose down

# Stop and remove volumes
docker compose down -v

# Remove all containers and images
docker compose down --rmi all
```

## Environment Variables

### API Service (.env file in api/ directory)

```env
# Database
MONGODB_URI=your_mongodb_connection_string
NEO4J_URI=your_neo4j_connection_string
NEO4J_USER=your_neo4j_username
NEO4J_PASSWORD=your_neo4j_password

# AI/ML Services
GOOGLE_API_KEY=your_google_api_key
OPENAI_API_KEY=your_openai_api_key

# Email
SMTP_HOST=your_smtp_host
SMTP_PORT=587
SMTP_USER=your_smtp_username
SMTP_PASSWORD=your_smtp_password

# App Configuration
ENVIRONMENT=production
PORT=8000
```

### Web Service (.env file in app/ directory)

```env
# API Configuration
EXPO_PUBLIC_API_URL=http://localhost:8000

# App Configuration
NODE_ENV=production
PORT=3000
```

## Accessing the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## Troubleshooting

### Common Issues

1. **Port already in use**:

   ```bash
   # Check what's using the port
   lsof -i :3000
   lsof -i :8000

   # Kill the process or change ports in docker-compose.yaml
   ```

2. **Build failures**:

   ```bash
   # Check build logs
   docker compose logs api
   docker compose logs web

   # Rebuild with no cache
   docker compose build --no-cache
   ```

3. **Environment variables not loading**:
   - Ensure `.env` files exist in both `api/` and `app/` directories
   - Check file permissions
   - Restart containers after changing environment variables

### Logs and Debugging

```bash
# View all logs
docker compose logs

# View specific service logs
docker compose logs api
docker compose logs web

# Follow logs in real-time
docker compose logs -f

# Access container shell
docker compose exec api bash
docker compose exec web sh
```

## Production Deployment

For production deployment, consider:

1. **Using a reverse proxy** (nginx) in front of the services
2. **Setting up SSL/TLS certificates**
3. **Configuring proper environment variables**
4. **Setting up monitoring and logging**
5. **Using Docker volumes for persistent data**

Example production docker-compose override:

```yaml
# docker-compose.prod.yaml
version: "3.8"
services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - web
      - api
```

## Development

For development, you can run services individually:

```bash
# Run API in development mode
cd api
uv sync
uv run uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Run frontend in development mode
cd app
npm install
npx expo start --web
```

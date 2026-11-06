# ExamDuty AI — Docker & Render Deployment Guide

This guide covers how to deploy **ExamDuty AI** using **Docker**, **Docker Compose**, and **Render** (https://render.com).

---

## 📋 Overview of Deployment Options

| Option | Ideal For | Services | Configuration File |
|---|---|---|---|
| **Option 1: Render Blueprint (Recommended)** | Cloud production with microservices architecture | 2 Web Services (`backend` + `frontend`) | `render.yaml` |
| **Option 2: Render Single Web Service** | Render Free Tier (1 service max) | 1 Unified Web Service | `Dockerfile` |
| **Option 3: Docker Compose** | Local testing & single VPS server | 2 containers networked together | `docker-compose.yml` |

---

## 🚀 Option 1: Render Blueprint Deployment (1-Click)

Render Blueprints automatically parse `render.yaml` to configure and launch both the FastAPI backend and Next.js frontend with inter-service networking.

### Step-by-Step Instructions:
1. Push your repository to GitHub:
   ```bash
   git push origin main
   ```
2. Log in to your [Render Dashboard](https://dashboard.render.com/).
3. Click **New +** at the top right and select **Blueprint**.
4. Connect your GitHub repository (`examDuty-Ai`).
5. Render will automatically detect `render.yaml` and display the blueprint plan:
   - **`examduty-backend`** (Web Service, Docker runtime)
   - **`examduty-frontend`** (Web Service, Docker runtime)
6. **(Optional)** Add your `GEMINI_API_KEY` under the backend environment variables if you wish to use live Google Gemini function calling (otherwise, the offline deterministic rule-based agent will automatically activate).
7. Click **Apply**.
8. Render will build both Docker images, run the initial seed script, and provide you with public URLs:
   - Backend: `https://examduty-backend.onrender.com`
   - Frontend: `https://examduty-frontend.onrender.com`

---

## ⚡ Option 2: Render Single Web Service (Free Tier Friendly)

If you are on the Render Free Tier and want to run both backend and frontend inside a **single web service** to stay within the free instance quota:

### Step-by-Step Instructions:
1. Log in to [Render Dashboard](https://dashboard.render.com/).
2. Click **New +** $\rightarrow$ **Web Service**.
3. Connect your repository (`examDuty-Ai`).
4. Select **Docker** as the Runtime.
5. In **Dockerfile Path**, keep the default: `./Dockerfile` (root directory).
6. Set the Environment Variables:
   - `PORT`: `3000` (Render will automatically route incoming traffic to this port)
   - `SECRET_KEY`: Any secure random string (e.g. `examduty-super-secret-key-vfstr-2026`)
   - `GEMINI_API_KEY`: *(Optional)* Your Gemini API key
7. Choose the **Free** instance type and click **Create Web Service**.
8. The single container will build and start:
   - FastAPI launches on internal port `8000`
   - Next.js launches on public port `3000` and automatically proxies `/api/*` requests to FastAPI internally!

---

## 🐳 Option 3: Local Docker Compose

To test the containerized stack locally before deploying to the cloud:

### 1. Build and Run:
```bash
# Clone and enter the repository
git clone https://github.com/priyanshugupta-26/examDuty-Ai.git
cd examDuty-Ai

# Build and start all services in detached mode
docker compose up --build -d
```

### 2. Verify Services:
```bash
# Check running containers
docker compose ps

# View live backend and frontend logs
docker compose logs -f
```

### 3. Access URLs:
- **Frontend Web App:** `http://localhost:3000`
- **FastAPI Backend:** `http://localhost:8000`
- **Interactive API Swagger Docs:** `http://localhost:8000/api/docs`
- **Health Check:** `http://localhost:8000/api/health`

### 4. Stop Services:
```bash
docker compose down
```

---

## 📦 Option 4: Building Individual Docker Images

If you prefer building and running containers independently:

### Backend:
```bash
cd backend
docker build -t examduty-backend:latest .
docker run -d -p 8000:8000 --name examduty-backend examduty-backend:latest
```

### Frontend:
```bash
cd frontend
docker build --build-arg NEXT_PUBLIC_API_URL=http://localhost:8000/api -t examduty-frontend:latest .
docker run -d -p 3000:3000 --name examduty-frontend examduty-frontend:latest
```

---

## 🔑 Environment Variables Reference

| Variable | Scope | Default | Description |
|---|---|---|---|
| `PORT` | Backend / Frontend | `8000` (BE) / `3000` (FE) | Port assigned by Render or container host |
| `DATABASE_URL` | Backend | `sqlite:///./examduty.db` | SQLite or PostgreSQL connection string (`postgresql://...`) |
| `SECRET_KEY` | Backend | *(pre-configured)* | JWT session signing secret |
| `CORS_ORIGINS` | Backend | `*` (or comma-separated URLs) | Allowed origins for cross-origin requests |
| `GEMINI_API_KEY` | Backend | `""` (empty) | Google Gemini API key. Falls back to deterministic rule engine if blank |
| `NEXT_PUBLIC_API_URL` | Frontend | `http://localhost:8000/api` | Public URL where browser sends API calls |
| `INTERNAL_BACKEND_URL` | Frontend | `http://127.0.0.1:8000` | Internal network URL used by Next.js for server-side proxying |

---

## 🔄 Automatic Database Seeding

When deployed fresh to Render or Docker, the backend's `lifespan` handler checks whether the database has existing records. If the database is empty:
- It automatically seeds **40 faculty members**, **12 examination halls**, and **25 scheduled exams**.
- It runs the CP-SAT solver and generates initial **unpublished draft allocations**.
- You can immediately log in with the demo accounts:
  - **Admin:** `admin@vfstr.ac.in` / `admin123`
  - **Faculty:** `k.rao@vfstr.ac.in` / `faculty123`

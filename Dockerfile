# ========================================================
# ExamDuty AI — Unified Full-Stack Dockerfile
# Single container hosting both FastAPI Backend & Next.js Frontend
# Ideal for Render Free Tier single web service or single VPS deployment
# ========================================================

# Stage 1: Build Next.js frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
RUN apk add --no-cache libc6-compat
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ .
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build

# Stage 2: Final runtime container with Python and Node.js
FROM python:3.11-slim AS runner

# Install Node.js 20 and curl in Debian slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gnupg \
    && mkdir -p /etc/apt/keyrings \
    && curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor -o /etc/apt/keyrings/nodesource.gpg \
    && echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_20.x nodistro main" | tee /etc/apt/sources.list.d/nodesource.list \
    && apt-get update && apt-get install -y --no-install-recommends \
    nodejs \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Backend setup
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r ./backend/requirements.txt
COPY backend/ ./backend/

# Frontend setup
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --omit=dev
COPY --from=frontend-builder /app/frontend/public ./public
COPY --from=frontend-builder /app/frontend/.next ./.next
COPY frontend/next.config.ts ./

WORKDIR /app

# Copy unified startup script
COPY scripts/start-unified.sh /app/start-unified.sh
RUN chmod +x /app/start-unified.sh

# Environment defaults
ENV PORT=3000 \
    BACKEND_PORT=8000 \
    INTERNAL_BACKEND_URL=http://127.0.0.1:8000 \
    DATABASE_URL=sqlite:///./examduty.db \
    NODE_ENV=production

EXPOSE 3000 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -f http://localhost:8000/api/health && curl -f http://localhost:${PORT:-3000}/ || exit 1

CMD ["/app/start-unified.sh"]

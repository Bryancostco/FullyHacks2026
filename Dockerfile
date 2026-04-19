# ── Stage 1: Build the frontend ──────────────────
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ── Stage 2: Run everything ─────────────────────
FROM python:3.12-slim
WORKDIR /app

# Install Python dependencies
COPY prep_pilot/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY prep_pilot/ ./prep_pilot/

# Copy built frontend into a static folder
COPY --from=frontend-build /app/frontend/dist ./frontend/dist

# Install a lightweight static file server for the frontend
RUN pip install --no-cache-dir aiofiles

# Expose ports: 8000 for backend, 3000 for frontend
EXPOSE 8000 3000

# Start both backend and frontend
COPY start.sh ./
RUN chmod +x start.sh
CMD ["./start.sh"]

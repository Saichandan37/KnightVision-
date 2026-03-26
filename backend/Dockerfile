FROM python:3.12-slim

# Install system deps: stockfish + curl (for healthcheck in compose)
RUN apt-get update && apt-get install -y --no-install-recommends \
    stockfish \
    curl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python deps first (layer-cached unless requirements.txt changes)
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy application code and project config
COPY backend/ ./backend/
COPY config.yaml ./config.yaml

# Patch ollama base_url for Docker networking when OLLAMA_HOST is set
COPY backend/docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

EXPOSE 8000

ENTRYPOINT ["/docker-entrypoint.sh"]
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]

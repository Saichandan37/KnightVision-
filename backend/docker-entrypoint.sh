#!/bin/sh
# Patch config.yaml ollama base_url for Docker networking.
# OLLAMA_HOST defaults to "ollama" (the compose service name).
OLLAMA_HOST="${OLLAMA_HOST:-ollama}"
sed -i "s|base_url: \"http://localhost:11434\"|base_url: \"http://${OLLAMA_HOST}:11434\"|g" /app/config.yaml
exec "$@"

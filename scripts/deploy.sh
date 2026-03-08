#!/bin/bash
set -e

IMAGE="ghcr.io/vinicius-negocios-modernos/mentes-sinteticas"
VPS_HOST="root@76.13.82.80"
STACK_NAME="mentes-sinteticas"
DEPLOY_DIR="/opt/mentes-sinteticas"

echo "=== Mentes Sinteticas Deploy ==="

# Step 1: Build and push image to GHCR
echo "[1/3] Building image..."
docker build -t "${IMAGE}:latest" .

echo "[2/3] Pushing to GHCR..."
docker push "${IMAGE}:latest"

# Step 2: Deploy to VPS via SSH
echo "[3/3] Deploying to VPS..."
ssh "${VPS_HOST}" "
  docker pull ${IMAGE}:latest
  cd ${DEPLOY_DIR}
  docker stack deploy -c docker-compose.prod.yml ${STACK_NAME}
"

echo ""
echo "Deploy complete!"
echo "Check: https://mentes.negociosmodernos.cloud"
echo "Logs:  ssh ${VPS_HOST} 'docker service logs ${STACK_NAME}_app --tail 50'"

#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

# Usage: ./build.sh [tag]        (default tag: latest)
# Requires: docker login (already authenticated to Docker Hub)
TAG="${1:-latest}"

echo -e "======== Build backend (likeca/django:${TAG}) ========"
docker build -t "likeca/django:${TAG}" backend
echo -e "======== End of backend build ========\n"

echo -e "======== Build frontend (likeca/nextjs:${TAG}) ========"
docker build -t "likeca/nextjs:${TAG}" frontend
echo -e "======== End of frontend build ========\n"

echo -e "======== Push to Docker Hub ========"
docker push "likeca/django:${TAG}"
docker push "likeca/nextjs:${TAG}"
echo -e "======== End of push ========\n"

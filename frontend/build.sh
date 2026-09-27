echo -e "======== Docker build ========"
docker build -t likeca/nextjs . -f Dockerfile
docker push likeca/nextjs:latest
echo -e "======== End of docker build ========\n"

echo -e "======== Docker compose up ========"
# docker start nextjs
# docker compose up -d
echo -e "======== End of docker compose up ========\n"


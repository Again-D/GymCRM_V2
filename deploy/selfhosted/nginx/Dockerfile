FROM node:20-slim AS frontend-build
WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

FROM nginx:1.27-alpine
COPY deploy/selfhosted/nginx/nginx.conf /etc/nginx/templates/https.conf.template
COPY deploy/selfhosted/nginx/nginx.bootstrap.conf /etc/nginx/templates/bootstrap.conf.template
COPY deploy/selfhosted/nginx/docker-entrypoint.sh /usr/local/bin/gymcrm-nginx-entrypoint
COPY --from=frontend-build /app/dist /usr/share/nginx/html
RUN sed -i 's/\r$//' /usr/local/bin/gymcrm-nginx-entrypoint \
  && chmod +x /usr/local/bin/gymcrm-nginx-entrypoint
CMD ["/usr/local/bin/gymcrm-nginx-entrypoint"]

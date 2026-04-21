FROM node:20-slim AS frontend-build
WORKDIR /app

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

FROM nginx:1.27-alpine
COPY deploy/selfhosted/nginx/nginx.conf /etc/nginx/conf.d/default.conf.template
COPY --from=frontend-build /app/dist /usr/share/nginx/html
CMD ["/bin/sh", "-c", "envsubst '${NGINX_HOSTNAME}' < /etc/nginx/conf.d/default.conf.template > /etc/nginx/conf.d/default.conf && nginx -g 'daemon off;'"]

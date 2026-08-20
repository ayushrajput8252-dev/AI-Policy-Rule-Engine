FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# VITE_* vars are inlined into the client bundle at build time, so this must
# be the browser-reachable backend URL (e.g. http://<host>:8001), not a
# Docker-internal service name.
ARG VITE_API_BASE=http://localhost:8001
ENV VITE_API_BASE=${VITE_API_BASE}

RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

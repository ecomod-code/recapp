# Build stage
FROM node:20-alpine as builder

WORKDIR /app

COPY package*.json ./
COPY lerna.json ./
RUN mkdir -p packages/frontend packages/models
COPY packages/frontend/package*.json ./packages/frontend/
COPY packages/models/package*.json ./packages/models/
COPY packages/frontend/.eslintrc.json packages/frontend/tsconfig*.json ./packages/frontend/
COPY packages/models/tsconfig*.json ./packages/models/

RUN npm ci

COPY packages/frontend ./packages/frontend
COPY packages/models ./packages/models

ENV VITE_API_URL=${FRONTEND_URI}
ENV VITE_APP_URL=${BACKEND_URI}

RUN cd packages/frontend && npm run build

# Production stage
FROM nginx:alpine

# COPY packages/frontend/nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/packages/frontend/dist /usr/share/nginx/html
COPY packages/frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
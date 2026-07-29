FROM node:20-slim

# Install wkhtmltopdf + minimal deps, then clean up apt caches
RUN apt-get update \
 && apt-get install -y --no-install-recommends \
      wkhtmltopdf         \
      fontconfig          \
      fonts-dejavu-core   \
      ca-certificates     \
      libx11-6            \
      libxrender1         \
      libxext6            \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app


COPY ../../package*.json ./
COPY ../../lerna.json ./
RUN mkdir -p packages/backend packages/models
COPY ../../packages/backend/package*.json packages/backend/
COPY ../../packages/models/package*.json packages/models/
COPY packages/backend/tsconfig*.json ./packages/backend/
COPY packages/models/tsconfig*.json ./packages/models/


RUN npm ci

COPY packages/backend packages/backend
COPY packages/models packages/models

ENV NODE_ENV=production
ARG SERVER_PORT=3123
ENV SERVER_PORT=$SERVER_PORT

EXPOSE $SERVER_PORT

HEALTHCHECK --interval=10s --timeout=3s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:'+(process.env.SERVER_PORT||3123)+'/ping', r => process.exit(r.statusCode===200?0:1)).on('error', () => process.exit(1))"

CMD ["npm", "run", "--prefix", "packages/backend", "start"]
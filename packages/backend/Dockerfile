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
COPY ../../.env.production ./
RUN mkdir -p packages/backend packages/models
COPY ../../packages/backend/package*.json packages/backend/
COPY ../../packages/models/package*.json packages/models/
COPY packages/backend/tsconfig*.json ./packages/backend/
COPY packages/models/tsconfig*.json ./packages/models/


RUN npm ci

COPY packages/backend packages/backend
COPY packages/models packages/models

ENV NODE_ENV=production
ENV SERVER_PORT=${SERVER_PORT}

EXPOSE ${SERVER_PORT}

CMD ["npm", "run", "--prefix", "packages/backend", "start"]
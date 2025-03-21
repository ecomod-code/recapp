FROM node:20-alpine

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
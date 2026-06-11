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

# DIAGNOSTIC: surface actor-crash stacks. ts-actors swallows the underlying
# Error in its supervisor warning; this rewrites the catch block to include
# the full stack and a separate console.error. Revert after the
# getuserrun-counter-regression investigation concludes.
RUN node -e " \
  const fs = require('fs'); \
  const p = '/app/node_modules/ts-actors/lib/src/ActorSystem.js'; \
  const s = fs.readFileSync(p, 'utf8'); \
  const oldLine = 'this.logger.warn(\`Unhandled exception in \${target.name}, applying strategy \${target.strategy}\`);'; \
  const newLines = 'this.logger.warn(\`Unhandled exception in \${target.name}, applying strategy \${target.strategy}: \${(e && e.stack) ? e.stack : String(e)}\`);\n                console.error(\"[ts-actors crash]\", target.name, e);'; \
  if (!s.includes(oldLine)) { console.error('PATCH FAILED: target line not found in', p); process.exit(1); } \
  fs.writeFileSync(p, s.replace(oldLine, newLines)); \
  console.log('Patched ts-actors ActorSystem.js to surface error stacks'); \
"

COPY packages/frontend ./packages/frontend
COPY packages/models ./packages/models

ARG VITE_BACKEND_URI
ENV VITE_BACKEND_URI=$VITE_BACKEND_URI
ARG VITE_FRONTEND_URI
ENV VITE_FRONTEND_URI=$VITE_FRONTEND_URI
ARG VITE_DEBUG_RECAPP=0
ENV VITE_DEBUG_RECAPP=$VITE_DEBUG_RECAPP

RUN cd packages/frontend && npm run build

# Production stage
FROM nginx:alpine

# COPY packages/frontend/nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/packages/frontend/dist /usr/share/nginx/html
COPY packages/frontend/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
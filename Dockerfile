# Stage 1: Build TypeScript
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm ci
COPY src/ ./src/
RUN npm run build

# Stage 2: Production image
FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=builder /app/dist ./dist/

# Institution config is mounted from the host at runtime:
#   -v ~/.canvas-design-mcp:/root/.canvas-design-mcp
# Run the setup wizard on your host first: npx canvas-design-mcp

ENTRYPOINT ["node", "dist/index.js"]

# ------------------------------------------------------------------------------
# Build Stage
# ------------------------------------------------------------------------------
FROM node:20-slim AS builder

WORKDIR /app

# Install dependencies first (layer caching)
COPY package*.json ./
RUN npm ci || npm install

# Copy source files
COPY . .

# Build Vite frontend bundle and bundle Express backend into dist/server.cjs
RUN npm run build

# ------------------------------------------------------------------------------
# Production Runtime Stage
# ------------------------------------------------------------------------------
FROM node:20-slim AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy package descriptors and install only production dependencies
COPY package*.json ./
RUN npm ci --only=production || npm install --production

# Copy built application output from builder stage
COPY --from=builder /app/dist ./dist

# Expose container listening port
EXPOSE 3000

# Start production Express server
CMD ["node", "dist/server.cjs"]

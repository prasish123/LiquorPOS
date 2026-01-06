# =============================================================================
# Liquor POS Backend - Production Dockerfile
# =============================================================================
# Multi-stage build for optimized production image
# Node.js 22 Alpine for minimal size and security

# -----------------------------------------------------------------------------
# Stage 1: Builder - Install dependencies and build application
# -----------------------------------------------------------------------------
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Install build dependencies (for native modules)
RUN apk add --no-cache python3 make g++

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install ALL dependencies (including devDependencies for build)
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build TypeScript application
RUN npm run build

# Remove devDependencies to reduce size
RUN npm prune --production

# -----------------------------------------------------------------------------
# Stage 2: Production - Minimal runtime image
# -----------------------------------------------------------------------------
FROM node:22-alpine AS production

# Set working directory
WORKDIR /app

# Install runtime dependencies only
RUN apk add --no-cache \
    dumb-init \
    curl

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install production dependencies only
RUN npm install --only=production --legacy-peer-deps && \
    npx prisma generate && \
    npm cache clean --force

# Copy built application from builder stage
COPY --from=builder /app/dist ./dist

# Note: node_modules already installed via npm ci --only=production above
# No need to copy from builder

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nestjs -u 1001 && \
    chown -R nestjs:nodejs /app

# Switch to non-root user
USER nestjs

# Expose application port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

# Use dumb-init to handle signals properly
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "dist/main.js"]


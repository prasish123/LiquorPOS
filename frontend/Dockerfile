# =============================================================================
# Liquor POS Frontend - Production Dockerfile
# =============================================================================
# Multi-stage build: Vite build + nginx serving
# Optimized for production with caching and security

# -----------------------------------------------------------------------------
# Stage 1: Builder - Build React application with Vite
# -----------------------------------------------------------------------------
FROM node:22-alpine AS builder

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy source code
COPY . .

# Build application for production
# Vite will output to /app/dist
RUN npm run build:docker

# -----------------------------------------------------------------------------
# Stage 2: Production - Serve with nginx
# -----------------------------------------------------------------------------
FROM nginx:alpine AS production

# Install curl for health checks
RUN apk add --no-cache curl

# Remove default nginx configuration
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built assets from builder stage
COPY --from=builder /app/dist /usr/share/nginx/html

# Create health check file
RUN echo "healthy" > /usr/share/nginx/html/health.txt

# Expose port 80
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD curl -f http://localhost/health || exit 1

# Start nginx in foreground
CMD ["nginx", "-g", "daemon off;"]


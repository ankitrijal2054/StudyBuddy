# Multi-stage build for Cloud Run
# Stage 1: Build
FROM node:18-slim AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Runtime
FROM node:18-slim
WORKDIR /app

# Install dumb-init to handle signals properly
RUN apt-get update && apt-get install -y dumb-init && rm -rf /var/lib/apt/lists/*

# Copy from builder
COPY --from=builder /app/node_modules ./node_modules
COPY . .

# Create non-root user for security
RUN useradd -m -u 1000 nodeuser && chown -R nodeuser:nodeuser /app
USER nodeuser

# Expose port
EXPOSE 8080

# Use dumb-init to handle signals
ENTRYPOINT ["dumb-init", "--"]

# Start application
CMD ["node", "src/index.js"]


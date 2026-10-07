# Use Node.js LTS Alpine for smaller image
FROM node:20-alpine

# Create app directory
WORKDIR /app

# Copy package files from backend-node
COPY backend-node/package*.json ./

# Install production dependencies only
RUN npm ci --only=production

# Copy backend application code
COPY backend-node/*.js ./

# Copy frontend for serving static files
COPY frontend ./frontend

# Cloud Run uses PORT environment variable (default 8080)
ENV PORT=8080
ENV NODE_ENV=production

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# Start the application
CMD ["node", "server.js"]

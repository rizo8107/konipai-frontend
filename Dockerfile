# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies with clean npm install
RUN npm ci

# Copy rest of the application
COPY . .

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --production

# Copy server.js file
COPY server.js ./

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 80

# Set NODE_ENV to production
ENV NODE_ENV=production

# Start express server
CMD ["node", "--experimental-json-modules", "server.js"] 
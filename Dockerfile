# Build stage with checks first
FROM node:20-alpine AS checker

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code and tsconfig files
COPY tsconfig*.json ./
COPY src ./src
COPY public ./public
COPY index.html ./
COPY vite.config.ts ./
COPY frontend.config.ts ./
COPY server.js ./

# Display TypeScript config files for debugging
RUN ls -la *.json

# Check TypeScript compile errors in more detail
RUN echo "Checking TypeScript errors..." && \
    npx tsc --noEmit --pretty || exit 1

# Full build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy from the check stage
COPY --from=checker /app ./

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy server.js file
COPY server.js ./
COPY frontend.config.ts ./

# Copy built files from builder stage
COPY --from=builder /app/dist ./dist

# Expose port
EXPOSE 80

# Set NODE_ENV to production
ENV NODE_ENV=production

# Start express server
CMD ["node", "--experimental-json-modules", "server.js"] 
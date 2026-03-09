# Stage 1: Build
FROM node:iron-alpine AS builder

WORKDIR /usr/src/app

# Copy dependency definitions
COPY package*.json ./

# Install ONLY production dependencies in the builder stage to reduce final size & cache
RUN npm ci --omit=dev

# Stage 2: Production
FROM node:iron-alpine

# Install dumb-init to correctly handle kernel signals and prevent zombie processes
RUN apk add --no-cache dumb-init

ENV NODE_ENV=production

WORKDIR /usr/src/app

# Copy node_modules from builder (avoids keeping npm cache in the final image)
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY package*.json ./
COPY server.js ./

# Switch to the non-root 'node' user provided by the official Node image
USER node

EXPOSE 3000

# Use dumb-init as PID 1 to proxy signals to our node application
CMD ["dumb-init", "node", "server.js"]

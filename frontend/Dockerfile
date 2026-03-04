# Use precise node version
FROM node:20-slim AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

# Build SvelteKit app
RUN npm run build

# Production stage
FROM node:20-slim

WORKDIR /app

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy build output and static files
COPY --from=builder /app/build ./build
COPY --from=builder /app/package.json ./package.json

# Expose SvelteKit port
EXPOSE 3000

# Run the app
CMD ["node", "build"]

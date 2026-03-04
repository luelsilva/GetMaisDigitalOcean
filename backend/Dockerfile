FROM node:20-slim

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies
RUN npm install --omit=dev && npm install -g nodemon

# Copy source
COPY . .

# Expose API port
EXPOSE 3000

# Run API
CMD ["node", "src/server.js"]

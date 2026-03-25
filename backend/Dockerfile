FROM node:20-slim

# Instala o LibreOffice necessário para a conversão de DOCX para PDF
RUN apt-get update && apt-get install -y --no-install-recommends \
    libreoffice \
    && rm -rf /var/lib/apt/lists/*

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

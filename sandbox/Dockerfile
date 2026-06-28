FROM mcr.microsoft.com/playwright:v1.52.0-noble

WORKDIR /app

# Install Node dependencies
COPY package.json package-lock.json* ./
RUN npm install --production

# Copy server code
COPY . .

EXPOSE 4000

CMD ["node", "server.js"]

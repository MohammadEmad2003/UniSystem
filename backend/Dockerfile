FROM node:20-bookworm-slim

# better-sqlite3 / sqlcipher need build tools
RUN apt-get update && apt-get install -y --no-install-recommends \
      python3 make g++ libsqlite3-dev \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev

COPY . .

ENV PORT=3000
EXPOSE 3000

CMD ["node", "index.js"]

FROM node:22-slim

RUN apt-get update -y && apt-get install -y openssl libssl3 ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

RUN mkdir -p public/uploads
RUN chmod +x docker-entrypoint.sh

ENV NODE_ENV=production

CMD ["./docker-entrypoint.sh"]

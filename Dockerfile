FROM node:22-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY prisma ./prisma
RUN npx prisma generate

COPY . .

RUN mkdir -p public/uploads

ENV NODE_ENV=production

CMD ["sh", "-c", "npx prisma migrate deploy && npm start"]

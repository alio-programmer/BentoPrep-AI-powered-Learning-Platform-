FROM node:22-alpine

WORKDIR /app

COPY server/package*.json ./
RUN npm ci --omit=dev

COPY server/src ./src

ENV NODE_ENV=production

EXPOSE 4000

CMD ["node", "src/index.js"]

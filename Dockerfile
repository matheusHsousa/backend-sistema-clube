FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
COPY tsconfig*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
ENV NODE_ENV=production
EXPOSE 8080
ENTRYPOINT ["/bin/sh", "-c"]
CMD ["if [ -n \"$FIREBASE_SERVICE_ACCOUNT\" ]; then printf '%s' \"$FIREBASE_SERVICE_ACCOUNT\" > /app/serviceAccountKey.json; fi; node dist/main.js"]

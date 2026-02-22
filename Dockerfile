FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
COPY prisma ./prisma
COPY tsconfig*.json ./
RUN npm ci
COPY . .
RUN npm run build && \
		if [ ! -f dist/main.js ]; then \
			echo "ERROR: /app/dist/main.js missing after build"; \
			ls -la dist || true; \
			exit 1; \
		fi

FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
ENV NODE_ENV=production
EXPOSE 8080
ENTRYPOINT ["/bin/sh", "-c"]
CMD ["if [ ! -f /app/dist/main.js ]; then echo \"ERROR: /app/dist/main.js missing at runtime\"; ls -la /app || true; ls -la /app/dist || true; exit 1; fi; if [ -n \"$FIREBASE_SERVICE_ACCOUNT\" ]; then printf '%s' \"$FIREBASE_SERVICE_ACCOUNT\" > /app/serviceAccountKey.json; fi; node dist/main.js"]

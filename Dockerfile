FROM node:18-bullseye-slim AS builder
WORKDIR /app
COPY package*.json ./
COPY tsconfig*.json ./
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates libssl1.1 \
    && rm -rf /var/lib/apt/lists/* \
    && npm ci
COPY . .
RUN npm run build && \
		if [ ! -f dist/main.js ]; then \
			echo "ERROR: /app/dist/main.js missing after build"; \
			ls -la dist || true; \
			exit 1; \
		fi

FROM node:18-bullseye-slim
WORKDIR /app
COPY package*.json ./
RUN apt-get update \
	&& apt-get install -y --no-install-recommends ca-certificates libssl1.1 \
	&& rm -rf /var/lib/apt/lists/* \
	&& npm ci --production
COPY --from=builder /app/dist ./dist
# (Prisma removed) no longer copying prisma artifacts
ENV NODE_ENV=production
EXPOSE 8080
ENTRYPOINT ["/bin/sh", "-c"]
CMD ["if [ ! -f /app/dist/main.js ]; then echo \"ERROR: /app/dist/main.js missing at runtime\"; ls -la /app || true; ls -la /app/dist || true; exit 1; fi; if [ -n \"$FIREBASE_SERVICE_ACCOUNT\" ]; then printf '%s' \"$FIREBASE_SERVICE_ACCOUNT\" > /app/serviceAccountKey.json; fi; node dist/main.js"]

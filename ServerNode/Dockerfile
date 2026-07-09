FROM node:20-alpine

WORKDIR /app

# Install build deps for better-sqlite3 native module
RUN apk add --no-cache python3 make g++

COPY ServerNode/package*.json ./ServerNode/
RUN cd ServerNode && npm ci --omit=dev

COPY Client/ ./Client/
COPY ServerNode/src/ ./ServerNode/src/

WORKDIR /app/ServerNode

ENV NODE_ENV=production
ENV MOTORSHARKS_DATA_DIR=/app/data

EXPOSE 8080

CMD ["node", "src/server.js"]

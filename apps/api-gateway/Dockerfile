FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY libs ./libs
COPY proto ./proto
COPY apps/api-gateway ./apps/api-gateway

# Install dependencies
RUN npm install --workspace=apps/api-gateway

# Build the application
WORKDIR /app/apps/api-gateway
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy necessary files
COPY --from=builder /app/apps/api-gateway/dist ./dist
COPY --from=builder /app/apps/api-gateway/node_modules ./node_modules
COPY --from=builder /app/proto ./proto

EXPOSE 3000

CMD ["node", "dist/main.js"]

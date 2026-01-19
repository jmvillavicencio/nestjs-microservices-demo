FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY libs ./libs
COPY proto ./proto
COPY apps/payment-service ./apps/payment-service

# Install dependencies
RUN npm install --workspace=apps/payment-service

# Build the application
WORKDIR /app/apps/payment-service
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy necessary files
COPY --from=builder /app/apps/payment-service/dist ./dist
COPY --from=builder /app/apps/payment-service/node_modules ./node_modules
COPY --from=builder /app/proto ./proto

EXPOSE 50052

CMD ["node", "dist/main.js"]

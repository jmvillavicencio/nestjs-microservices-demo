FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY libs ./libs
COPY apps/notification-service ./apps/notification-service

# Install dependencies
RUN npm install --workspace=apps/notification-service

# Build the application
WORKDIR /app/apps/notification-service
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy necessary files
COPY --from=builder /app/apps/notification-service/dist ./dist
COPY --from=builder /app/apps/notification-service/node_modules ./node_modules

CMD ["node", "dist/main.js"]

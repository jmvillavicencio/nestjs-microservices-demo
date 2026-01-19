FROM node:20-alpine AS builder

WORKDIR /app

# Copy root package files
COPY package*.json ./
COPY libs ./libs
COPY proto ./proto
COPY apps/user-service ./apps/user-service

# Install dependencies
RUN npm install --workspace=apps/user-service

# Build the application
WORKDIR /app/apps/user-service
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy necessary files
COPY --from=builder /app/apps/user-service/dist ./dist
COPY --from=builder /app/apps/user-service/node_modules ./node_modules
COPY --from=builder /app/proto ./proto

EXPOSE 50051

CMD ["node", "dist/main.js"]

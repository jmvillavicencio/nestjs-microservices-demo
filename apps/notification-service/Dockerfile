FROM node:20-alpine AS builder

WORKDIR /app

# Copy libs first (needed for build)
COPY libs ./libs

# Copy app package.json and install
WORKDIR /app/apps/notification-service
COPY apps/notification-service/package*.json ./
COPY apps/notification-service/tsconfig.json ./
COPY apps/notification-service/nest-cli.json ./
RUN npm install

# Copy source code
COPY apps/notification-service/src ./src

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy necessary files
COPY --from=builder /app/apps/notification-service/dist ./dist
COPY --from=builder /app/apps/notification-service/node_modules ./node_modules

CMD ["node", "dist/apps/notification-service/src/main.js"]

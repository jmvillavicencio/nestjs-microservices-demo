FROM node:20-alpine AS builder

WORKDIR /app

# Copy libs first (needed for build)
COPY libs ./libs
COPY proto ./proto

# Copy app package.json and install
WORKDIR /app/apps/payment-service
COPY apps/payment-service/package*.json ./
COPY apps/payment-service/tsconfig.json ./
COPY apps/payment-service/nest-cli.json ./
RUN npm install

# Copy source code
COPY apps/payment-service/src ./src

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy necessary files
COPY --from=builder /app/apps/payment-service/dist ./dist
COPY --from=builder /app/apps/payment-service/node_modules ./node_modules
COPY proto ./proto

EXPOSE 50052

CMD ["node", "dist/apps/payment-service/src/main.js"]

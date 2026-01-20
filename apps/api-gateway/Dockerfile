FROM node:20-alpine AS builder

WORKDIR /app

# Copy libs first (needed for build)
COPY libs ./libs
COPY proto ./proto

# Copy app package.json and install
WORKDIR /app/apps/api-gateway
COPY apps/api-gateway/package*.json ./
COPY apps/api-gateway/tsconfig.json ./
COPY apps/api-gateway/nest-cli.json ./
RUN npm install

# Copy source code
COPY apps/api-gateway/src ./src

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy necessary files
COPY --from=builder /app/apps/api-gateway/dist ./dist
COPY --from=builder /app/apps/api-gateway/node_modules ./node_modules
COPY proto ./proto

EXPOSE 3000

CMD ["node", "dist/apps/api-gateway/src/main.js"]

FROM node:20-alpine AS builder

WORKDIR /app

# Copy libs first (needed for build)
COPY libs ./libs
COPY proto ./proto

# Copy app package.json and install
WORKDIR /app/apps/auth-service
COPY apps/auth-service/package*.json ./
COPY apps/auth-service/tsconfig.json ./
COPY apps/auth-service/nest-cli.json ./
RUN npm install

# Copy source code
COPY apps/auth-service/src ./src

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy necessary files
COPY --from=builder /app/apps/auth-service/dist ./dist
COPY --from=builder /app/apps/auth-service/node_modules ./node_modules
COPY proto ./proto

EXPOSE 50053

CMD ["node", "dist/apps/auth-service/src/main.js"]

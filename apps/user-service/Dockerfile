FROM node:20-alpine AS builder

WORKDIR /app

# Copy libs first (needed for build)
COPY libs ./libs
COPY proto ./proto

# Copy app package.json and install
WORKDIR /app/apps/user-service
COPY apps/user-service/package*.json ./
COPY apps/user-service/tsconfig.json ./
COPY apps/user-service/nest-cli.json ./
RUN npm install

# Copy source code
COPY apps/user-service/src ./src

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

WORKDIR /app

# Copy necessary files
COPY --from=builder /app/apps/user-service/dist ./dist
COPY --from=builder /app/apps/user-service/node_modules ./node_modules
COPY proto ./proto

EXPOSE 50051

CMD ["node", "dist/apps/user-service/src/main.js"]

FROM node:20-alpine AS builder

WORKDIR /app

# Copy all source files first
COPY libs ./libs
COPY proto ./proto
COPY apps/api-gateway ./apps/api-gateway

# Install dependencies for libs
WORKDIR /app/libs/common
RUN npm install --ignore-scripts

WORKDIR /app/libs/proto
RUN npm install --ignore-scripts

# Install app dependencies
WORKDIR /app/apps/api-gateway
RUN npm install

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

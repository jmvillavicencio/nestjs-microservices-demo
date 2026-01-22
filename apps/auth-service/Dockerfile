FROM node:20-alpine AS builder

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Copy all source files first
COPY libs ./libs
COPY proto ./proto
COPY apps/auth-service ./apps/auth-service

# Install dependencies for libs
WORKDIR /app/libs/common
RUN npm install --ignore-scripts

WORKDIR /app/libs/prisma
RUN npm install

WORKDIR /app/libs/proto
RUN npm install --ignore-scripts

# Install app dependencies
WORKDIR /app/apps/auth-service
RUN npm install

# Generate prisma client and copy to app node_modules
RUN cd /app/libs/prisma && ./node_modules/.bin/prisma generate && \
    echo "=== Contents of libs/prisma/node_modules ===" && \
    ls -la /app/libs/prisma/node_modules/ | head -20 && \
    echo "=== Contents of libs/prisma/node_modules/.prisma ===" && \
    ls -la /app/libs/prisma/node_modules/.prisma/ 2>/dev/null || echo "No .prisma dir"

# Copy the generated client (including .prisma directory)
RUN rm -rf /app/apps/auth-service/node_modules/@prisma/client /app/apps/auth-service/node_modules/.prisma && \
    cp -rL /app/libs/prisma/node_modules/@prisma/client /app/apps/auth-service/node_modules/@prisma/ && \
    if [ -d /app/libs/prisma/node_modules/.prisma ]; then \
      cp -rL /app/libs/prisma/node_modules/.prisma /app/apps/auth-service/node_modules/; \
    fi

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install OpenSSL for Prisma runtime
RUN apk add --no-cache openssl

WORKDIR /app

# Copy necessary files
COPY --from=builder /app/apps/auth-service/dist ./dist
COPY --from=builder /app/apps/auth-service/node_modules ./node_modules
COPY proto ./proto

EXPOSE 50053

CMD ["node", "dist/apps/auth-service/src/main.js"]

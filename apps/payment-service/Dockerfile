FROM node:20-alpine AS builder

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl

WORKDIR /app

# Copy all source files first
COPY libs ./libs
COPY proto ./proto
COPY apps/payment-service ./apps/payment-service

# Install dependencies for libs
WORKDIR /app/libs/common
RUN npm install --ignore-scripts

WORKDIR /app/libs/prisma
RUN npm install

WORKDIR /app/libs/proto
RUN npm install --ignore-scripts

# Install app dependencies
WORKDIR /app/apps/payment-service
RUN npm install

# Generate prisma client and copy to app node_modules
RUN cd /app/libs/prisma && ./node_modules/.bin/prisma generate

# Copy the generated client (including .prisma directory)
RUN rm -rf /app/apps/payment-service/node_modules/@prisma/client /app/apps/payment-service/node_modules/.prisma && \
    cp -rL /app/libs/prisma/node_modules/@prisma/client /app/apps/payment-service/node_modules/@prisma/ && \
    if [ -d /app/libs/prisma/node_modules/.prisma ]; then \
      cp -rL /app/libs/prisma/node_modules/.prisma /app/apps/payment-service/node_modules/; \
    fi

# Build the application
RUN npm run build

# Production stage
FROM node:20-alpine AS production

# Install OpenSSL for Prisma runtime
RUN apk add --no-cache openssl

WORKDIR /app

# Copy necessary files
COPY --from=builder /app/apps/payment-service/dist ./dist
COPY --from=builder /app/apps/payment-service/node_modules ./node_modules
COPY proto ./proto

EXPOSE 50052

CMD ["node", "dist/apps/payment-service/src/main.js"]

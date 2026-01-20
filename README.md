# NestJS Microservices Demo

A production-ready microservices architecture demo built with NestJS, featuring gRPC for synchronous communication, RabbitMQ for asynchronous event-driven messaging, PostgreSQL for data persistence, and comprehensive authentication support.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                           Client Applications                        │
└─────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         API Gateway (REST)                           │
│                         Port: 3000                                   │
│                    Swagger: /api/docs                                │
└─────────────────────────────────────────────────────────────────────┘
              │                    │                    │
        gRPC  │              gRPC  │              gRPC  │
              ▼                    ▼                    ▼
┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
│   User Service   │  │  Payment Service │  │   Auth Service   │
│   Port: 50051    │  │   Port: 50052    │  │   Port: 50053    │
└──────────────────┘  └──────────────────┘  └──────────────────┘
              │                    │                    │
              └────────────────────┼────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         PostgreSQL Database                          │
│                           Port: 5432                                 │
└─────────────────────────────────────────────────────────────────────┘

              │                    │                    │
              │    RabbitMQ Events │                    │
              ▼                    ▼                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          RabbitMQ Broker                             │
│                    Port: 5672 (AMQP)                                │
│                    Port: 15672 (Management)                         │
└─────────────────────────────────────────────────────────────────────┘
                                   │
                                   ▼
┌─────────────────────────────────────────────────────────────────────┐
│                       Notification Service                           │
│                    (Event Consumer - Email Sender)                  │
│                    SendGrid / Handlebars Templates                  │
└─────────────────────────────────────────────────────────────────────┘
```

## Services

### API Gateway
- **Technology**: NestJS with Express
- **Protocol**: HTTP REST
- **Port**: 3000
- **Features**:
  - Swagger documentation at `/api/docs`
  - Request validation with class-validator
  - gRPC clients for User, Payment, and Auth services

### User Service
- **Technology**: NestJS Microservice
- **Protocol**: gRPC
- **Port**: 50051
- **Database**: PostgreSQL via Prisma
- **Features**:
  - User CRUD operations
  - Emits events: `user.created`, `user.updated`, `user.deleted`

### Payment Service
- **Technology**: NestJS Microservice
- **Protocol**: gRPC
- **Port**: 50052
- **Database**: PostgreSQL via Prisma
- **Features**:
  - Payment processing with simulated success/failure (90% success rate)
  - Refund processing
  - Emits events: `payment.created`, `payment.completed`, `payment.failed`, `payment.refunded`

### Auth Service
- **Technology**: NestJS Microservice
- **Protocol**: gRPC
- **Port**: 50053
- **Database**: PostgreSQL via Prisma
- **Features**:
  - Email/password authentication
  - Google OAuth integration
  - Apple Sign In integration
  - JWT access and refresh tokens
  - Password reset functionality
  - Emits events: `auth.user.registered`, `auth.user.logged_in`, `auth.password.*`

### Notification Service
- **Technology**: NestJS Microservice
- **Protocol**: RabbitMQ (AMQP)
- **Features**:
  - Subscribes to user, payment, and auth events
  - SendGrid integration for email delivery (production)
  - Handlebars email templates
  - Demo mode: logs emails instead of sending (development)

## Tech Stack

- **Framework**: NestJS 10.x
- **Language**: TypeScript 5.x
- **Database**: PostgreSQL 16 with Prisma ORM
- **Synchronous Communication**: gRPC with Protocol Buffers
- **Asynchronous Communication**: RabbitMQ
- **Email**: SendGrid with Handlebars templates
- **Authentication**: JWT, Google OAuth, Apple Sign In
- **API Documentation**: Swagger/OpenAPI
- **Testing**: Jest with 70%+ coverage
- **Logging**: Winston structured logging
- **Containerization**: Docker & Docker Compose

## Getting Started

### Prerequisites

- Node.js 18+
- Docker and Docker Compose
- npm 9+

### Running with Docker (Recommended)

1. Clone the repository:
```bash
git clone <repository-url>
cd nestjs-microservices-demo
```

2. Start all services:
```bash
docker-compose up -d
```

3. Run database migrations:
```bash
npm run prisma:push
```

4. Access the services:
- API Gateway: http://localhost:3000
- Swagger Docs: http://localhost:3000/api/docs
- RabbitMQ Management: http://localhost:15672 (admin/admin)

### Running Locally (Development)

1. Start infrastructure services:
```bash
docker-compose up postgres rabbitmq -d
```

2. Install dependencies:
```bash
npm install
```

3. Set up the database:
```bash
npm run prisma:generate
npm run prisma:push
```

4. Start services in separate terminals:
```bash
# Terminal 1 - User Service
npm run start:dev:user-service

# Terminal 2 - Payment Service
npm run start:dev:payment-service

# Terminal 3 - Auth Service
npm run start:dev:auth-service

# Terminal 4 - Notification Service
npm run start:dev:notification-service

# Terminal 5 - API Gateway
npm run start:dev:api-gateway
```

## API Endpoints

### Users

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/users` | Create a new user |
| GET | `/api/users` | Get all users (paginated) |
| GET | `/api/users/:id` | Get user by ID |
| PUT | `/api/users/:id` | Update user |
| DELETE | `/api/users/:id` | Delete user |

### Payments

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/payments` | Create a new payment |
| GET | `/api/payments/:id` | Get payment by ID |
| GET | `/api/payments/user/:userId` | Get payments by user ID |
| POST | `/api/payments/:id/refund` | Process a refund |

### Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register with email/password |
| POST | `/api/auth/login` | Login with email/password |
| POST | `/api/auth/google` | Authenticate with Google |
| POST | `/api/auth/apple` | Authenticate with Apple |
| POST | `/api/auth/refresh` | Refresh access token |
| POST | `/api/auth/logout` | Logout (revoke token) |
| POST | `/api/auth/forgot-password` | Request password reset |
| POST | `/api/auth/reset-password` | Reset password with token |
| POST | `/api/auth/change-password` | Change password |
| GET | `/api/auth/validate` | Validate access token |

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |

## Testing

Run the test suite:
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:cov

# Run tests in watch mode
npm run test:watch
```

The project maintains 70%+ code coverage across all services.

## Project Structure

```
nestjs-microservices-demo/
├── apps/
│   ├── api-gateway/              # REST API Gateway
│   ├── user-service/             # User gRPC microservice
│   ├── payment-service/          # Payment gRPC microservice
│   ├── auth-service/             # Auth gRPC microservice
│   └── notification-service/     # RabbitMQ consumer service
│       └── src/templates/        # Handlebars email templates
├── libs/
│   ├── common/                   # Shared constants and event types
│   ├── proto/                    # gRPC type definitions
│   ├── prisma/                   # Prisma schema and service
│   └── logging/                  # Winston logging service
├── proto/                        # Protocol Buffer definitions
├── docker-compose.yml            # Docker orchestration
├── jest.config.js               # Jest testing configuration
└── package.json                 # Root package file
```

## Database Schema

```prisma
// User Service
model User {
  id        String   @id @default(uuid())
  email     String   @unique
  name      String
  password  String
  payments  Payment[]
}

// Payment Service
model Payment {
  id            String        @id @default(uuid())
  userId        String
  amount        Float
  currency      String
  status        PaymentStatus
  description   String
  paymentMethod String
}

// Auth Service
model AuthUser {
  id                   String       @id @default(uuid())
  email                String       @unique
  name                 String
  password             String?
  provider             AuthProvider
  providerId           String?
  passwordResetToken   String?
  passwordResetExpires DateTime?
  refreshTokens        RefreshToken[]
}

model RefreshToken {
  id        String   @id @default(uuid())
  token     String   @unique
  userId    String
  expiresAt DateTime
  revoked   Boolean
}
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | API Gateway port |
| `DATABASE_URL` | - | PostgreSQL connection URL |
| `USER_SERVICE_URL` | localhost:50051 | User service gRPC URL |
| `PAYMENT_SERVICE_URL` | localhost:50052 | Payment service gRPC URL |
| `AUTH_SERVICE_URL` | localhost:50053 | Auth service gRPC URL |
| `RABBITMQ_URL` | amqp://localhost:5672 | RabbitMQ connection URL |
| `JWT_SECRET` | - | JWT signing secret |
| `GOOGLE_CLIENT_ID` | - | Google OAuth client ID |
| `APPLE_CLIENT_ID` | - | Apple Sign In client ID |
| `SENDGRID_API_KEY` | - | SendGrid API key (production) |
| `EMAIL_FROM` | noreply@demo.com | From address for emails |
| `FRONTEND_URL` | http://localhost:3000 | Frontend URL for email links |
| `COMPANY_NAME` | Microservices Demo | Company name in emails |

## Email Templates

The notification service uses Handlebars templates for email content:

- `welcome.hbs` - Welcome email for new users
- `auth-welcome.hbs` - Welcome email for OAuth users
- `payment-confirmation.hbs` - Payment success notification
- `payment-failed.hbs` - Payment failure notification
- `refund-notification.hbs` - Refund processed notification
- `account-updated.hbs` - Account update notification
- `account-deleted.hbs` - Account deletion notification
- `password-reset.hbs` - Password reset link
- `password-reset-confirmation.hbs` - Password reset success
- `password-changed.hbs` - Password changed notification

## Event Flow

1. **User Registration**:
   - Auth Service creates user in database
   - Emits `auth.user.registered` event
   - Notification Service sends welcome email

2. **Payment Processing**:
   - Payment Service creates payment (pending)
   - Emits `payment.created` event
   - Simulates payment processing (90% success)
   - Emits `payment.completed` or `payment.failed`
   - Notification Service sends appropriate email

3. **Password Reset**:
   - Auth Service generates reset token
   - Emits `auth.password.reset_requested`
   - Notification Service sends reset email
   - User resets password
   - Emits `auth.password.reset_completed`

## License

MIT

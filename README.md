# NestJS Microservices Demo

A production-ready microservices architecture demo built with NestJS, featuring gRPC for synchronous communication and RabbitMQ for asynchronous event-driven messaging.

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
                          │                    │
                    gRPC  │                    │  gRPC
                          ▼                    ▼
         ┌────────────────────┐    ┌────────────────────┐
         │   User Service     │    │  Payment Service   │
         │   Port: 50051      │    │   Port: 50052      │
         └────────────────────┘    └────────────────────┘
                          │                    │
                          │    RabbitMQ        │
                          │    Events          │
                          ▼                    ▼
         ┌─────────────────────────────────────────────┐
         │              RabbitMQ Broker                 │
         │         Port: 5672 (AMQP)                   │
         │         Port: 15672 (Management)            │
         └─────────────────────────────────────────────┘
                                    │
                                    ▼
         ┌─────────────────────────────────────────────┐
         │          Notification Service               │
         │         (Event Consumer)                    │
         └─────────────────────────────────────────────┘
```

## Services

### API Gateway
- **Technology**: NestJS with Express
- **Protocol**: HTTP REST
- **Port**: 3000
- **Features**:
  - Swagger documentation at `/api/docs`
  - Request validation with class-validator
  - gRPC clients for User and Payment services

### User Service
- **Technology**: NestJS Microservice
- **Protocol**: gRPC
- **Port**: 50051
- **Features**:
  - User CRUD operations
  - Emits events: `user.created`, `user.updated`, `user.deleted`

### Payment Service
- **Technology**: NestJS Microservice
- **Protocol**: gRPC
- **Port**: 50052
- **Features**:
  - Payment processing with simulated success/failure
  - Refund processing
  - Emits events: `payment.created`, `payment.completed`, `payment.failed`, `payment.refunded`

### Notification Service
- **Technology**: NestJS Microservice
- **Protocol**: RabbitMQ (AMQP)
- **Features**:
  - Subscribes to user and payment events
  - Sends email notifications (demo mode logs instead of sending)

## Tech Stack

- **Framework**: NestJS 10.x
- **Language**: TypeScript 5.x
- **Synchronous Communication**: gRPC
- **Asynchronous Communication**: RabbitMQ
- **API Documentation**: Swagger/OpenAPI
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

3. Access the services:
- API Gateway: http://localhost:3000
- Swagger Docs: http://localhost:3000/api/docs
- RabbitMQ Management: http://localhost:15672 (admin/admin)

### Running Locally (Development)

1. Start RabbitMQ:
```bash
docker-compose up rabbitmq -d
```

2. Install dependencies:
```bash
npm install
```

3. Start services in separate terminals:
```bash
# Terminal 1 - User Service
npm run start:dev:user-service

# Terminal 2 - Payment Service
npm run start:dev:payment-service

# Terminal 3 - Notification Service
npm run start:dev:notification-service

# Terminal 4 - API Gateway
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

### Health

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Health check |

## Example API Calls

### Create User
```bash
curl -X POST http://localhost:3000/api/users \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "name": "Test User", "password": "password123"}'
```

### Create Payment
```bash
curl -X POST http://localhost:3000/api/payments \
  -H "Content-Type: application/json" \
  -d '{"userId": "<user-id>", "amount": 99.99, "description": "Test payment", "paymentMethod": "credit_card"}'
```

### Process Refund
```bash
curl -X POST http://localhost:3000/api/payments/<payment-id>/refund \
  -H "Content-Type: application/json" \
  -d '{"amount": 99.99, "reason": "Customer request"}'
```

## Project Structure

```
nestjs-microservices-demo/
├── apps/
│   ├── api-gateway/          # REST API Gateway
│   ├── user-service/         # User gRPC microservice
│   ├── payment-service/      # Payment gRPC microservice
│   └── notification-service/ # RabbitMQ consumer service
├── libs/
│   ├── common/              # Shared constants and event types
│   └── proto/               # gRPC type definitions
├── proto/                   # Protocol Buffer definitions
├── docker-compose.yml       # Docker orchestration
└── package.json            # Root package file
```

## Event Flow

1. **User Created**:
   - User Service creates user
   - Emits `user.created` event to RabbitMQ
   - Notification Service receives event
   - Sends welcome email

2. **Payment Completed**:
   - Payment Service processes payment
   - Emits `payment.completed` event to RabbitMQ
   - Notification Service receives event
   - Sends payment confirmation email

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | API Gateway port |
| `USER_SERVICE_URL` | localhost:50051 | User service gRPC URL |
| `PAYMENT_SERVICE_URL` | localhost:50052 | Payment service gRPC URL |
| `RABBITMQ_URL` | amqp://localhost:5672 | RabbitMQ connection URL |
| `SMTP_HOST` | smtp.ethereal.email | SMTP host for emails |
| `SMTP_PORT` | 587 | SMTP port |
| `SMTP_USER` | - | SMTP username |
| `SMTP_PASS` | - | SMTP password |

## License

MIT

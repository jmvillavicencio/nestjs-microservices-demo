import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Inject,
  OnModuleInit,
} from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { firstValueFrom } from 'rxjs';
import { SERVICES } from '@app/common';
import { PaymentServiceClient, PAYMENT_SERVICE_NAME } from '@app/proto';
import {
  CreatePaymentDto,
  ProcessRefundDto,
  PaymentResponseDto,
  PaymentsListResponseDto,
} from '../dto/payment.dto';

@ApiTags('payments')
@Controller('api/payments')
export class PaymentController implements OnModuleInit {
  private paymentService: PaymentServiceClient;

  constructor(
    @Inject(SERVICES.PAYMENT_SERVICE) private readonly client: ClientGrpc,
  ) {}

  onModuleInit() {
    this.paymentService = this.client.getService<PaymentServiceClient>(PAYMENT_SERVICE_NAME);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new payment' })
  @ApiResponse({ status: 201, description: 'Payment created successfully', type: PaymentResponseDto })
  @ApiResponse({ status: 400, description: 'Bad request - validation error' })
  async createPayment(@Body() createPaymentDto: CreatePaymentDto): Promise<PaymentResponseDto> {
    return await firstValueFrom(
      this.paymentService.createPayment({
        ...createPaymentDto,
        currency: createPaymentDto.currency || 'USD',
      }),
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get payment by ID' })
  @ApiResponse({ status: 200, description: 'Payment retrieved successfully', type: PaymentResponseDto })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async getPayment(@Param('id') id: string): Promise<PaymentResponseDto> {
    return await firstValueFrom(this.paymentService.getPayment({ id }));
  }

  @Get('user/:userId')
  @ApiOperation({ summary: 'Get payments by user ID' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default: 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Items per page (default: 10)' })
  @ApiResponse({ status: 200, description: 'Payments retrieved successfully', type: PaymentsListResponseDto })
  async getPaymentsByUser(
    @Param('userId') userId: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<PaymentsListResponseDto> {
    return await firstValueFrom(
      this.paymentService.getPaymentsByUser({
        userId,
        page: Number(page),
        limit: Number(limit),
      }),
    );
  }

  @Post(':id/refund')
  @ApiOperation({ summary: 'Process a refund for a payment' })
  @ApiResponse({ status: 200, description: 'Refund processed successfully', type: PaymentResponseDto })
  @ApiResponse({ status: 400, description: 'Invalid refund request' })
  @ApiResponse({ status: 404, description: 'Payment not found' })
  async processRefund(
    @Param('id') id: string,
    @Body() refundDto: ProcessRefundDto,
  ): Promise<PaymentResponseDto> {
    return await firstValueFrom(
      this.paymentService.processRefund({
        paymentId: id,
        amount: refundDto.amount,
        reason: refundDto.reason,
      }),
    );
  }
}
